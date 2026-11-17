"""Offline predeploy safety checks for the Cash N Carry customer website.

Does not simulate clicks or prove Cloudflare deployment. Browser checks run separately in CI.
"""
import importlib.util
import json
from pathlib import Path
import re
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'

class CustomerSurfaceAndWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = WEB / 'scripts/audit_customer_ui.py'
        spec = importlib.util.spec_from_file_location('cnc_customer_ui_static_audit', path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        cls.audit = mod

    def test_01_all_26_tabs_have_matching_navigation(self):
        errors, warnings, counts = self.audit.scan()
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(counts['routes'], 26)
        self.assertEqual(counts['navigation_targets'], 26)

    def test_02_jsx_buttons_have_actions_or_guard_states(self):
        _, warnings, counts = self.audit.scan()
        # Counts may change when obsolete UI controls are removed. Test safety, not an old snapshot.
        self.assertGreaterEqual(counts['buttons'], 250)
        self.assertEqual(counts['inert_buttons'], 0, warnings)
        self.assertGreaterEqual(counts['forms'], 20)

    def test_03_qa_export_and_fake_profile_absent_from_customer_code(self):
        files = list((WEB/'src').rglob('*.tsx'))
        ui = '\n'.join(f.read_text() for f in files)
        for label in ('QA Suite', 'Export ZIP', 'V17 Staging ZIP', 'Chidi Okafor',
                      'Run Automated Staging Diagnostic'):
            self.assertNotIn(label, ui)
        self.assertIn('Sign In / Create Account', (WEB/'src/components/ui/Navbar.tsx').read_text())

    def test_04_no_public_build_packaging_or_source_zip(self):
        config = json.loads((WEB/'package.json').read_text())
        self.assertNotIn('package:zip', config['scripts'])
        self.assertNotIn('bundle:worker', config['scripts']['build:sites-candidate'])
        self.assertFalse((WEB/'scripts/package-zip.py').exists())
        self.assertEqual(list((WEB/'public').rglob('*.zip')), [])

    def test_05_bootstrap_creates_no_fake_stores_or_products(self):
        db = sqlite3.connect(':memory:')
        try:
            db.executescript((WEB/'deploy/chatgpt-sites/staging-init-complete.sql').read_text())
            self.assertEqual(db.execute('SELECT COUNT(*) FROM stores').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM products').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM categories').fetchone()[0], 8)
        finally:
            db.close()

    def test_05b_other_catalog_initializer_has_no_fake_records(self):
        db = sqlite3.connect(':memory:')
        try:
            db.executescript((WEB/'deploy/chatgpt-sites/catalog-init.sql').read_text())
            self.assertEqual(db.execute('SELECT COUNT(*) FROM stores').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM products').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM categories').fetchone()[0], 8)
        finally:
            db.close()

    def test_06_checkout_payment_and_uploads_fail_closed(self):
        cfg = json.loads('\n'.join(l for l in (WEB/'wrangler.jsonc').read_text().splitlines()
                                   if not l.lstrip().startswith('//')))
        for name in ('PAYMENTS_ENABLED','COINS_PURCHASES_ENABLED','KYC_UPLOADS_ENABLED'):
            self.assertEqual(cfg['vars'][name], 'false')
        self.assertEqual(cfg['vars']['FLW_MODE'], 'disabled')

    def test_07_browser_smoke_covers_every_tab(self):
        source = (WEB/'src/App.tsx').read_text()
        app_routes = set(re.findall(r"case '([a-z0-9-]+)'", source))
        script = (WEB/'scripts/verify-staging-browser.mjs').read_text()
        groups = re.search(r'const allCustomerTabs\s*=\s*\[([^\]]+)\]', script, re.S)
        self.assertIsNotNone(groups)
        browser_routes = set(re.findall(r"'([a-z0-9-]+)'", groups.group(1)))
        self.assertEqual(browser_routes, app_routes)
        self.assertIn('FORBIDDEN_CUSTOMER_UI',script)

    def test_08_auth_flow_requires_email_verification(self):
        source = (WEB/'src/components/ui/AuthModal.tsx').read_text()
        self.assertIn('verifyWithApi(token, password)', source)
        self.assertIn('New accounts must verify their email before signing in.', source)
        email = (WEB/'deploy/chatgpt-sites/auth-email.ts').read_text()
        self.assertIn('AUTH_RESEND_API_KEY', email)
        self.assertIn('AUTH_EMAIL_FROM', email)

    def test_09_newsletter_preview_not_claimed_as_subscribed(self):
        source = (WEB/'src/context/StoreContext.tsx').read_text()
        self.assertIn('newsletter', source.lower())
        self.assertIn('preview', source.lower())
        footer = (WEB/'src/components/ui/Footer.tsx').read_text()
        self.assertNotIn('Subscribe', footer)  # No fake newsletter-save form
        self.assertNotIn('Accessibility Compliant', footer)
        self.assertNotIn('Sitemap', footer)

if __name__=='__main__':unittest.main()
