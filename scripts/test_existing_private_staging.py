"""Read-only contract tests for reusing the existing Cloudflare staging Workers."""
import json
import pathlib
import re
import unittest

R = pathlib.Path(__file__).resolve().parents[1]
WEB = 'https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev'
MOBILE = 'https://cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev'
DBID = '9a2cdbee-e030-4b10-908b-b10b8142d2aa'

class ExistingPrivateStagingContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg = json.loads((R/'web/wrangler.jsonc').read_text())
        cls.android = (R/'app/build.gradle.kts').read_text()
        cls.worker = (R/'web/deploy/chatgpt-sites/worker.ts').read_text()
        cls.workflow = (R/'.github/workflows/verify-existing-private-staging.yml').read_text()

    def test_existing_worker_not_fresh_empty_staging(self):
        self.assertEqual(self.cfg['name'], 'cashncarry-d1-staging-worker')
        self.assertNotIn('cashncarry-void-fresh-staging',json.dumps(self.cfg))

    def test_mapped_database_id_shared(self):
        self.assertEqual({x['database_id'] for x in self.cfg['d1_databases']}, {DBID})
        self.assertEqual({x['binding'] for x in self.cfg['d1_databases']}, {'DB','AUTH_DB'})

    def test_no_domain_change_or_auto_deploy(self):
        for k in ('route','routes','env','zone_id','account_id'):
            self.assertNotIn(k,self.cfg)
        self.assertNotIn('wrangler deploy',self.workflow)
        self.assertNotIn('d1 migrations apply',self.workflow)
        self.assertNotIn('cloudflare/wrangler-action',self.workflow)

    def test_private_site_has_asset_binding(self):
        self.assertEqual(self.cfg['assets']['binding'],'ASSETS')
        self.assertEqual(self.cfg['assets']['directory'],'./dist')
        self.assertTrue(self.cfg['workers_dev'])
        self.assertEqual(self.cfg['vars']['AUTH_ORIGIN'], WEB)

    def test_disabled_payment_and_kyc(self):
        for key in ('PAYMENTS_ENABLED','COINS_PURCHASES_ENABLED','KYC_UPLOADS_ENABLED'):
            self.assertEqual(self.cfg['vars'][key], 'false')
        self.assertEqual(self.cfg['vars']['FLW_MODE'],'disabled')
        self.assertEqual(self.cfg['vars']['ORDER_RESERVATIONS'],'enabled')

    def test_email_secret_not_checked_in(self):
        self.assertNotIn('AUTH_RESEND_API_KEY', json.dumps(self.cfg))
        self.assertEqual(self.cfg['vars']['AUTH_EMAIL_FROM'], 'Cash N Carry <no-reply@cashncarryng.com>')
        self.assertIn('AUTH_RESEND_API_KEY',(R/'EXISTING_STAGING_DEPLOYMENT.md').read_text())

    def test_android_debug_uses_separate_mobile_api(self):
        self.assertIn(MOBILE,self.android)
        self.assertNotIn(WEB,self.android)
        self.assertIn('applicationIdSuffix = ".staging"', self.android)

    def test_android_release_uses_domain(self):
        self.assertIn('CNC_RELEASE_API_BASE_URL',self.android)
        self.assertIn('https://www.cashncarryng.com',self.android)

    def test_orders_badge_is_orders_not_cart(self):
        self.assertRegex((R/'app/src/main/java/com/example/MainActivity.kt').read_text(),r'badgeCount\s*=\s*orders\.size,\s*tag\s*=\s*"nav_orders"')

    def test_no_false_camera_stream_claim(self):
        s=(R/'web/src/components/ui/CreateModal.tsx').read_text()
        self.assertIn('camera shown here is a local preview only',s)
        self.assertIn('does not transmit video to viewers',s)

    def test_health_id_matches_existing_staging(self):
        self.assertIn("service: 'cashncarry-d1-staging-worker'",self.worker)
        self.assertNotIn("service: 'cashncarry-void-fresh-staging'",self.worker)

    def test_staging_seo_outputs_are_not_indexed(self):
        self.assertEqual((R/'web/public/robots.txt').read_text(),'User-agent: *\nDisallow: /\n')
        self.assertNotIn('<url>',(R/'web/public/sitemap.xml').read_text())
        self.assertNotIn('<item>',(R/'web/public/feed/google-shopping.xml').read_text())
        self.assertIn("process.env.CNC_PRIVATE_STAGING === 'true'",(R/'web/scripts/generate-sitemap.ts').read_text())
        self.assertIn("process.env.CNC_PRIVATE_STAGING === 'true'",(R/'web/scripts/generate-google-shopping-feed.ts').read_text())

    def test_ci_runs_manual_web_and_android_build(self):
        self.assertIn('workflow_dispatch',self.workflow)
        self.assertIn('npm run build',self.workflow)
        self.assertIn('npm run bundle:worker',self.workflow)
        self.assertIn('app:assembleDebug',self.workflow)
        self.assertIn(MOBILE,self.workflow)

    def test_no_demonstration_products_or_stores_seeded(self):
        migration = (R/'web/deploy/chatgpt-sites/migrations/0010_catalog_schema_and_seed.sql').read_text()
        self.assertNotIn('INSERT OR IGNORE INTO stores', migration)
        self.assertNotIn('INSERT OR IGNORE INTO products', migration)
        self.assertIn('CREATE TABLE IF NOT EXISTS stores', migration)
        self.assertIn('CREATE TABLE IF NOT EXISTS products', migration)

    def test_private_staging_does_not_carry_new_db_migration(self):
        self.assertFalse((R/'web/deploy/fresh-cloudflare/migrations').exists())
        self.assertFalse((R/'CLOUDFLARE_FRESH_SETUP.md').exists())

if __name__=='__main__': unittest.main()
