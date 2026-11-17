"""Offline regression checks for a clean private staging candidate.

These are source-level checks, NOT proof of live API or Android success.
"""
from pathlib import Path
import re
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT/'web'
SRC = WEB/'src'

class WorkflowReleaseRegressionTests(unittest.TestCase):
    def test_staging_isolation_and_payment_guards(self):
        cfg = (WEB/'wrangler.jsonc').read_text()
        self.assertIn('cashncarry-d1-staging-worker', cfg)
        for flag in ('PAYMENTS_ENABLED', 'COINS_PURCHASES_ENABLED', 'KYC_UPLOADS_ENABLED'):
            self.assertRegex(cfg, rf'"{flag}"\s*:\s*"false"')
        self.assertIn('9a2cdbee-e030-4b10-908b-b10b8142d2aa', cfg)

    def test_mobile_desktop_breakpoint_is_consistent(self):
        navbar = (SRC/'components/ui/Navbar.tsx').read_text()
        mobile = (SRC/'components/ui/MobileNav.tsx').read_text()
        footer = (SRC/'components/ui/Footer.tsx').read_text()
        self.assertIn('lg:hidden', mobile)
        self.assertNotIn('md:hidden', mobile)
        self.assertIn('lg:flex', navbar)
        self.assertIn('lg:hidden', navbar)
        self.assertIn('cnc-footer-desktop mt-8 hidden lg:grid', footer)
        self.assertIn('cnc-footer-mobile mt-6 space-y-4 lg:hidden', footer)
        self.assertNotIn('Sitemap', footer)
        self.assertNotIn('Accessibility', footer)

    def test_policy_links_open_matching_sections_not_default(self):
        footer = (SRC/'components/ui/Footer.tsx').read_text()
        app = (SRC/'App.tsx').read_text()
        self.assertIn("onSelectPolicy(section || 'terms')",footer)
        self.assertIn("const [policySection, setPolicySection]", app)
        self.assertIn('initialSection={policySection}', app)
        self.assertIn("key={policySection}", app)
        self.assertNotIn('__cncPolicySection',footer)

    def test_shipping_price_not_presented_as_free_without_quote(self):
        checkout = (SRC/'components/pages/CheckoutPage.tsx').read_text()
        self.assertNotIn('const shipping = 0;',checkout)
        self.assertIn('Shipping cost and final payable total are pending', checkout)
        self.assertIn('shipping not included', checkout)
        self.assertNotIn('Free shipping', checkout)

    def test_no_demo_accounts_fake_bootstrap_data(self):
        for sql in ['staging-init-complete.sql','catalog-init.sql']:
            db=sqlite3.connect(':memory:')
            try:
                db.executescript((WEB/'deploy/chatgpt-sites'/sql).read_text())
                self.assertEqual(db.execute('select count(*) from stores').fetchone()[0],0)
                self.assertEqual(db.execute('select count(*) from products').fetchone()[0],0)
            finally: db.close()
        ui='\n'.join(x.read_text() for x in SRC.rglob('*.tsx'))
        for token in ('Chidi Okafor','QA Suite','V17 Staging ZIP','Export ZIP'):
            self.assertNotIn(token,ui)

    def test_admin_enforced_server_side_and_mfa(self):
        auth=(WEB/'deploy/chatgpt-sites/new-auth.ts').read_text()
        self.assertIn('u.role=\'admin\' AND s.mfa=1',auth)
        self.assertIn('ADMIN_ACCOUNT_ID',auth)
        self.assertIn('ADMIN_TOTP_SECRET_HEX',auth)
        self.assertIn('if (admin && (request.headers.get(\'authorization\')',auth)

    def test_android_staging_debug_does_not_target_production(self):
        gradle=(ROOT/'app/build.gradle.kts').read_text()
        self.assertIn('cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev',gradle)
        self.assertIn('applicationIdSuffix = ".staging"',gradle)

    def test_supplier_api_is_not_falsely_claimed_connected(self):
        content='\n'.join(x.read_text() for x in (WEB/'deploy/chatgpt-sites').glob('*.ts'))
        self.assertNotIn('api.banggood.com',content)
        self.assertNotIn('supplierOrderPaid:true',content)

if __name__=='__main__':unittest.main()
