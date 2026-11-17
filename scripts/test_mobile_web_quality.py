"""Regression contracts for Cash N Carry private staging web/mobile quality fixes."""
import unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]

class QualityContracts(unittest.TestCase):
  def read(self,part): return (BASE/part).read_text()
  def test_private_staging_is_not_indexable(self):
    html=self.read('web/index.html')
    self.assertIn('noindex, nofollow, noarchive',html)
    self.assertNotIn('google-site-verification-token-cashncarryng',html)
    self.assertEqual(self.read('web/public/robots.txt').strip(),'User-agent: *\nDisallow: /')
    self.assertIn("headers.set('x-robots-tag'",self.read('web/deploy/chatgpt-sites/worker.ts'))
    self.assertIn("/staging/i.test(window.location.hostname)",self.read('web/src/components/seo/SEOHead.tsx'))
  def test_mobile_nav_and_search(self):
    main=self.read('web/src/App.tsx')
    nav=self.read('web/src/components/ui/Navbar.tsx')
    shop=self.read('web/src/components/pages/ShopPage.tsx')
    self.assertIn('pb-24',main)
    self.assertIn('onSearch={(query)',main)
    self.assertIn('onSearch(searchQuery.trim())',nav)
    self.assertIn('searchTerm={shopSearchQuery}',main)
    self.assertIn('priceCeiling',shop)
  def test_no_fake_live_session(self):
    create=self.read('web/src/components/ui/CreateModal.tsx')
    self.assertNotIn('You are now LIVE!',create)
    self.assertNotIn('Simulate real live engagement',create)
    self.assertIn('camera preview does not transmit video to viewers',create)
  def test_staging_build_generators_keep_privacy(self):
    pkg=self.read('web/package.json')
    self.assertIn('CNC_PRIVATE_STAGING=true tsx scripts/generate-sitemap.ts',pkg)
    self.assertIn("privateStaging = process.env.CNC_PRIVATE_STAGING === 'true'",self.read('web/scripts/generate-sitemap.ts'))
    self.assertIn("process.env.CNC_PRIVATE_STAGING === 'true'",self.read('web/scripts/generate-google-shopping-feed.ts'))
  def test_deep_link_tab_reference_is_defined(self):
    self.assertNotIn('if (!tabParam)',self.read('web/src/App.tsx'))
  def test_android_cart_count_not_shown_as_orders(self):
    activity=self.read('app/src/main/java/com/example/MainActivity.kt')
    self.assertIn('badgeCount = orders.size,',activity)

if __name__ == '__main__': unittest.main()
