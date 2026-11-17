package com.example.ui

import android.net.Uri
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.CreateActionSheetContent
import com.example.Routes
import com.example.SellerPermissionGate
import com.example.resolveDeepLinkRoute
import com.example.ui.screens.DiscoverScreen
import com.example.ui.theme.CashNCarryTheme
import com.example.ui.viewmodel.ProductSortOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class RbacAndEmptyStatesTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun createSheet_guestSeesSignInAndNotCreatorTools() {
        var signInClicked = false
        composeRule.setContent {
            CashNCarryTheme {
                CreateActionSheetContent(
                    isAuthenticated = false,
                    isApprovedSeller = false,
                    isPendingSeller = false,
                    onRequireSignIn = { signInClicked = true },
                    onStartSelling = {},
                    onUploadVideo = {},
                    onGoLive = {},
                    onManageProducts = {}
                )
            }
        }
        composeRule.onNodeWithTag("create_sheet_sign_in_btn").assertIsDisplayed().performClick()
        assertTrue(signInClicked)
        composeRule.onNodeWithTag("create_sheet_upload_video").assertDoesNotExist()
        composeRule.onNodeWithTag("create_sheet_go_live").assertDoesNotExist()
        composeRule.onNodeWithTag("create_sheet_manage_products").assertDoesNotExist()
    }

    @Test
    fun createSheet_buyerSeesBecomeSellerAndStartSelling() {
        var startSellingClicked = false
        composeRule.setContent {
            CashNCarryTheme {
                CreateActionSheetContent(
                    isAuthenticated = true,
                    isApprovedSeller = false,
                    isPendingSeller = false,
                    onRequireSignIn = {},
                    onStartSelling = { startSellingClicked = true },
                    onUploadVideo = {},
                    onGoLive = {},
                    onManageProducts = {}
                )
            }
        }
        composeRule.onNodeWithText("Become a Seller").assertIsDisplayed()
        composeRule.onNodeWithTag("create_sheet_start_selling_btn").assertIsDisplayed().performClick()
        assertTrue(startSellingClicked)
        composeRule.onNodeWithTag("create_sheet_upload_video").assertDoesNotExist()
        composeRule.onNodeWithTag("create_sheet_go_live").assertDoesNotExist()
        composeRule.onNodeWithTag("create_sheet_manage_products").assertDoesNotExist()
    }

    @Test
    fun createSheet_pendingSellerSeesAwaitingApprovalAndCannotPost() {
        composeRule.setContent {
            CashNCarryTheme {
                CreateActionSheetContent(
                    isAuthenticated = true,
                    isApprovedSeller = false,
                    isPendingSeller = true,
                    onRequireSignIn = {},
                    onStartSelling = {},
                    onUploadVideo = {},
                    onGoLive = {},
                    onManageProducts = {}
                )
            }
        }
        composeRule.onNodeWithText("Your seller account is awaiting approval.").assertIsDisplayed()
        composeRule.onNodeWithTag("create_sheet_upload_video").assertDoesNotExist()
        composeRule.onNodeWithTag("create_sheet_go_live").assertDoesNotExist()
        composeRule.onNodeWithTag("create_sheet_manage_products").assertDoesNotExist()
    }

    @Test
    fun createSheet_approvedSellerSeesCreatorTools() {
        composeRule.setContent {
            CashNCarryTheme {
                CreateActionSheetContent(
                    isAuthenticated = true,
                    isApprovedSeller = true,
                    isPendingSeller = false,
                    onRequireSignIn = {},
                    onStartSelling = {},
                    onUploadVideo = {},
                    onGoLive = {},
                    onManageProducts = {}
                )
            }
        }
        composeRule.onNodeWithTag("create_sheet_upload_video").assertIsDisplayed()
        composeRule.onNodeWithTag("create_sheet_go_live").assertIsDisplayed()
        composeRule.onNodeWithTag("create_sheet_manage_products").assertIsDisplayed()
    }

    @Test
    fun sellerPermissionGate_blocksPendingAndBuyerDirectAccess() {
        composeRule.setContent {
            CashNCarryTheme {
                SellerPermissionGate(
                    isPendingSeller = true,
                    onStartSelling = {},
                    onBack = {}
                )
            }
        }
        composeRule.onNodeWithText("Your seller account is awaiting approval.").assertIsDisplayed()
        composeRule.onNodeWithTag("gate_start_selling_button").assertIsDisplayed()
    }

    @Test
    fun discoverScreen_showsExactEmptyCopyVsErrorRetry() {
        var retried = false
        composeRule.setContent {
            CashNCarryTheme {
                DiscoverScreen(
                    products = emptyList(),
                    sellers = emptyList(),
                    selectedState = "Lagos",
                    searchQuery = "",
                    selectedCategory = "All",
                    selectedBrand = "All",
                    selectedSellerId = null,
                    sortOption = ProductSortOption.RECOMMENDED,
                    inStockOnly = false,
                    deliveryStateFilterEnabled = false,
                    wishlistIds = emptySet(),
                    compareIds = emptyList(),
                    aiAdviceState = null,
                    productsError = null,
                    onRetryProducts = {},
                    onSearchChange = {},
                    onRunAiSearch = {},
                    onSelectCategory = {},
                    onSelectBrand = {},
                    onSelectSeller = {},
                    onSelectSort = {},
                    onToggleInStock = {},
                    onToggleDeliveryState = {},
                    onOpenProduct = {},
                    onAddToCart = {},
                    onToggleWishlist = {},
                    onToggleCompare = {},
                    onOpenLivestream = {}
                )
            }
        }
        composeRule.onNodeWithText("No products available yet. Check back soon for new arrivals.").assertIsDisplayed()

        composeRule.setContent {
            CashNCarryTheme {
                DiscoverScreen(
                    products = emptyList(),
                    sellers = emptyList(),
                    selectedState = "Lagos",
                    searchQuery = "",
                    selectedCategory = "All",
                    selectedBrand = "All",
                    selectedSellerId = null,
                    sortOption = ProductSortOption.RECOMMENDED,
                    inStockOnly = false,
                    deliveryStateFilterEnabled = false,
                    wishlistIds = emptySet(),
                    compareIds = emptyList(),
                    aiAdviceState = null,
                    productsError = "Network timeout",
                    onRetryProducts = { retried = true },
                    onSearchChange = {},
                    onRunAiSearch = {},
                    onSelectCategory = {},
                    onSelectBrand = {},
                    onSelectSeller = {},
                    onSelectSort = {},
                    onToggleInStock = {},
                    onToggleDeliveryState = {},
                    onOpenProduct = {},
                    onAddToCart = {},
                    onToggleWishlist = {},
                    onToggleCompare = {},
                    onOpenLivestream = {}
                )
            }
        }
        composeRule.onNodeWithTag("discover_error_state").assertIsDisplayed()
        composeRule.onNodeWithTag("discover_retry_button").performClick()
        assertTrue(retried)
    }

    @Test
    fun deepLinks_mapToProtectedRoutes() {
        assertEquals(Routes.SELLER_CENTRE, resolveDeepLinkRoute(Uri.parse("https://www.cashncarryng.com/seller")))
        assertEquals(Routes.SELLER_ONBOARDING, resolveDeepLinkRoute(Uri.parse("https://www.cashncarryng.com/seller/onboarding")))
        assertEquals(Routes.STUDIO, resolveDeepLinkRoute(Uri.parse("https://www.cashncarryng.com/studio")))
        assertEquals(Routes.REELS, resolveDeepLinkRoute(Uri.parse("https://www.cashncarryng.com/for-you")))
        assertEquals(Routes.livePlayer("room-9"), resolveDeepLinkRoute(Uri.parse("https://www.cashncarryng.com/live/room-9")))
        assertEquals(Routes.product("prod-1"), resolveDeepLinkRoute(Uri.parse("cnc://app/product/prod-1")))
        assertEquals(Routes.ADMIN_CONSOLE, resolveDeepLinkRoute(Uri.parse("cnc://app/admin")))
    }
}
