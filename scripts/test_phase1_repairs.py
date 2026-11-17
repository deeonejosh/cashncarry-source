"""Conservative source-level checks; real Gradle/Worker suites run in GitHub CI."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def source(path): return (ROOT/path).read_text(encoding='utf-8')

class PhaseOneContracts(unittest.TestCase):
    def test_no_demo_catalog_bootstrap(self):
        s=source('app/src/main/java/com/example/ui/viewmodel/MarketplaceViewModel.kt')
        self.assertNotIn('.bootstrapInitialMarketplaceCatalog(',s)
    def test_no_fake_initial_lives(self):
        s=source('app/src/main/java/com/example/data/repository/LiveCommerceRepository.kt')
        self.assertIn('MutableStateFlow<List<Livestream>>(emptyList())',s)
        self.assertIn('_livestreams.value = streams.data',s)
        self.assertIn('remote.fetchLivestreams()',s)
        self.assertIn('remote.likeLivestream(streamId)',s)
        self.assertIn('is CloudflareResult.Failure -> throw IllegalStateException(res.message)',s)
        self.assertIn('Live video broadcasting is not configured on this server yet.',s)
    def test_correct_live_product_fields(self):
        s=source('app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt')
        self.assertIn('obj.optString("name", obj.optString("title", ""))',s)
        self.assertIn('obj.optLong("price", -1L)',s)
        self.assertNotIn('coerceAtLeast(100L)',s)
        self.assertIn('priceNaira = priceNaira',s)
        self.assertIn('imageKey = resolveMediaUrl(obj.optString("image",',s)
    def test_cart_roundtrip_is_server_first(self):
        s=source('app/src/main/java/com/example/data/repository/CatalogRepository.kt')
        c=s.index('when (val cartRes = remote.fetchCart())')
        w=s.index('when (val wishRes = remote.fetchWishlist())')
        self.assertLess(c,w)
        self.assertIn('remote.updateCart(product.id, savedQty, source = "mobile")',s)
        self.assertIn('is CloudflareResult.Failure -> throw IllegalStateException(result.message)',s)
        api=source('app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt')
        self.assertIn('suspend fun fetchCart()',api)
        self.assertIn('res.data.optJSONArray("items")',api)
        self.assertIn('CART_ITEM_UNAVAILABLE', api)
    def test_no_duplicate_writes_or_local_only_success(self):
        s=source('app/src/main/java/com/example/data/repository/CatalogRepository.kt')
        self.assertEqual(s.count('remote.toggleFollowSeller(rawOwnerId)'),1)
        self.assertEqual(s.count('remote.submitReview(productId, rating, comment)'),1)
        self.assertNotIn('syncRepo?.toggleFollowSeller(rawOwnerId)',s)
        self.assertNotIn('syncRepo?.submitReview(productId, rating, comment)',s)
        self.assertIn('remote.saveAddress(',s)
        self.assertIn('is CloudflareResult.Failure -> throw IllegalStateException(res.message)',s)
        live=source('app/src/main/java/com/example/data/repository/LiveCommerceRepository.kt')
        self.assertEqual(live.count('remote.sendLiveComment(streamId, text)'),1)
        self.assertNotIn('syncRepo?.sendLiveComment(streamId, text)',live)
    def test_email_template_and_compact_login(self):
        s=source('web/deploy/chatgpt-sites/auth-email.ts')
        self.assertIn('renderAuthEmail',s)
        self.assertIn('htmlEscape(token)',s)
        self.assertIn('15 minutes',s)
        self.assertIn('word-break:break-all', s)
        self.assertIn('text: rendered.text',s)
        a=source('app/src/main/java/com/example/ui/auth/AuthComponents.kt')
        self.assertIn('.imePadding()',a)
        self.assertIn('Connecting securely to Cash N Carry Nigeria',a)
    def test_session_storage_test_contract(self):
        kotlin = source('app/src/test/java/com/example/data/remote/CloudflareSyncRepositoryTest.kt')
        self.assertEqual(kotlin.count('sessionCookie = null, userId = "buyer-2"'), 2)
        self.assertIn('fun updateProfile_sendsBearerTokenAndCheckoutFailsClosedInStaging()', kotlin)
        self.assertIn('assertEquals("PAYMENTS_DISABLED", (checkoutRes as CloudflareResult.Failure).code)', kotlin)
        self.assertNotIn('assertTrue(checkoutRes is CloudflareResult.Success)', kotlin)
        self.assertEqual(kotlin.count('sessionCookie = "d".repeat(64), userId = "buyer-2"'), 1)

    def test_storefront_discovery_route_is_not_rejected(self):
        worker = source('web/deploy/chatgpt-sites/worker.ts')
        self.assertNotIn("(route[1] === 'storefronts' && !route[2])", worker)
        self.assertIn("if (route[1] === 'storefronts' && !id)", worker)
        self.assertIn("readStorefronts(env.DB, offset)", worker)
        smoke = source('web/deploy/chatgpt-sites/worker-smoke.mjs')
        self.assertIn("listed.storefronts.map(x => x.id)", smoke)

    def test_flags_and_worker_security(self):
        config=source('web/wrangler.jsonc')
        for variable in ('PAYMENTS_ENABLED','COINS_PURCHASES_ENABLED','KYC_UPLOADS_ENABLED'):
            self.assertIn(variable, config)
        m=source('web/deploy/chatgpt-sites/marketplace.ts')
        self.assertIn('hasValidMutationOrigin(request, env)', m)
        s=source('web/deploy/chatgpt-sites/catalog.ts')
        self.assertIn('verified = 1 AND suspended = 0', s)

if __name__ == '__main__': unittest.main()
