"""Offline structural / SQLite checks for the integrated Cash N Carry staging source.

These checks are not a substitute for Worker Miniflare, Android Gradle, or remote D1 tests.
Run from the integrated project root: python3 -m unittest discover -s scripts -p 'test_*.py' -v
"""
import json
from pathlib import Path
import re
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / 'web'
ANDROID = ROOT / 'app'
MIGRATIONS = WEB / 'deploy/chatgpt-sites/migrations'


class StagingSourceContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = (WEB / 'wrangler.jsonc').read_text()
        cls.wrangler = json.loads('\n'.join(line for line in source.splitlines()
                                             if not line.lstrip().startswith('//')))

    def test_target_worker_and_database(self):
        cfg = self.wrangler
        self.assertEqual(cfg['name'], 'cashncarry-d1-staging-worker')
        for binding in cfg['d1_databases']:
            self.assertEqual(binding['database_name'], 'cashncarry-d1-staging')
            self.assertEqual(binding['database_id'], '9a2cdbee-e030-4b10-908b-b10b8142d2aa')
        self.assertEqual(cfg['vars']['AUTH_ORIGIN'],
                         'https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev')

    def test_fail_closed_staging_flags(self):
        cfg = self.wrangler['vars']
        self.assertEqual(cfg['PAYMENTS_ENABLED'], 'false')
        self.assertEqual(cfg['COINS_PURCHASES_ENABLED'], 'false')
        self.assertEqual(cfg['KYC_UPLOADS_ENABLED'], 'false')
        self.assertEqual(cfg['FLW_MODE'], 'disabled')

    def test_no_firebase_in_android_code_or_build(self):
        check = list((ANDROID / 'src').rglob('*.kt'))
        check.extend(ROOT.glob('*.gradle.kts'))
        check.extend(ANDROID.glob('*.gradle.kts'))
        check.extend((ROOT / 'gradle').rglob('*.toml'))
        check.extend((ANDROID / 'src/main').rglob('*.xml'))
        self.assertGreaterEqual(len(check), 35)
        bad = [str(p.relative_to(ROOT)) for p in check if re.search(r'firebase|credentialmanager|googleid', p.read_text(errors='ignore'), re.I)]
        self.assertEqual(bad, [], 'Firebase/Google-ID references remain')

    def test_preserved_android_identity_and_signing(self):
        build = (ANDROID / 'build.gradle.kts').read_text()
        self.assertIn('applicationId = "com.aistudio.cashncarry.vqmzkw"', build)
        self.assertIn('create("debugConfig")', build)
        self.assertIn('create("release")', build)
        self.assertIn('signingConfig = signingConfigs.getByName("debugConfig")', build)

    def test_migration_number_is_unique_0017(self):
        files = sorted(p.name for p in MIGRATIONS.glob('*.sql'))
        self.assertIn('0017_unified_mobile_sync.sql', files)
        self.assertNotIn('0011_unified_mobile_sync.sql', files)
        self.assertEqual(len(files), len({n.split('_', 1)[0] for n in files}))

    def test_migrations_compile_in_sqlite_and_repeat_0017(self):
        connection = sqlite3.connect(':memory:')
        connection.execute('PRAGMA foreign_keys=ON')
        try:
            for p in sorted(MIGRATIONS.glob('*.sql')):
                connection.executescript(p.read_text())
            connection.executescript((MIGRATIONS / '0017_unified_mobile_sync.sql').read_text())
            tables = {row[0] for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'")}
            for t in ['cnc_auth_users', 'cnc_user_profiles', 'cnc_wishlist',
                      'cnc_live_room_state', 'cnc_notifications', 'cnc_orders']:
                self.assertIn(t, tables)
        finally:
            connection.close()

    def test_worker_auth_me_contract_and_mobile_admin_denial(self):
        s = (WEB / 'deploy/chatgpt-sites/new-auth.ts').read_text()
        self.assertIn('authenticated: true, user', s)
        self.assertIn('if (isMobileHeader) return json(', s)
        self.assertIn("admin && (request.headers.get('authorization')", s)

    def test_android_main_activity_requires_live_session_validation(self):
        main = (ANDROID / 'src/main/java/com/example/MainActivity.kt').read_text()
        self.assertIn('CloudflareSyncRepo.restoreSession', main.replace('cloudflareSyncRepo.restoreSession', 'CloudflareSyncRepo.restoreSession'))
        self.assertNotIn('AuthGateState.Authenticated(remaining)', main)

    def test_android_restore_and_html_fail_closed(self):
        s = (ANDROID / 'src/main/java/com/example/data/remote/CloudflareSyncRepository.kt').read_text()
        self.assertIn('val authenticated = obj.optBoolean("authenticated", liveUser != null)', s)
        self.assertIn('role !in setOf("buyer", "seller")', s)
        self.assertIn('code = "INVALID_RESPONSE"', s)
        self.assertIn('code = "PAYMENTS_DISABLED"', s)
        storage = (ANDROID / 'src/main/java/com/example/data/remote/CloudflareSessionStore.kt').read_text()
        self.assertNotIn('raw_v1:', storage)
        self.assertIn('Android Keystore unavailable: refusing to store session credentials', storage)


if __name__ == '__main__':
    unittest.main()
