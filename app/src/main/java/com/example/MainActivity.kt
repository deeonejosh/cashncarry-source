package com.example

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.VideoCall
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.data.model.UiState
import com.example.data.remote.CloudflareResult
import com.example.data.remote.CloudflareSessionSnapshot
import com.example.data.remote.CloudflareSyncRepository
import com.example.data.remote.SharedPreferencesSessionStorage
import com.example.data.repository.AdminRepository
import com.example.data.repository.AiRecommendationRepository
import com.example.data.repository.CatalogRepository
import com.example.data.repository.LiveCommerceRepository
import com.example.ui.auth.AuthScreen
import com.example.ui.auth.LogoutConfirmationDialog
import com.example.ui.auth.SessionLoadingScreen
import com.example.ui.components.MiniPiPStreamBar
import com.example.ui.screens.AdminConsoleScreen
import com.example.ui.screens.BroadcastStudioScreen
import com.example.ui.screens.CartCheckoutOrdersScreen
import com.example.ui.screens.DiscoverScreen
import com.example.ui.screens.HomeMarketplaceScreen
import com.example.ui.screens.LiveHubScreen
import com.example.ui.screens.LivePlayerScreen
import com.example.ui.screens.ProductDetailScreen
import com.example.ui.screens.SellerCentreScreen
import com.example.ui.screens.SellerOnboardingScreen
import com.example.ui.screens.StorefrontScreen
import com.example.ui.screens.UserProfileScreen
import com.example.ui.screens.VideoFeedScreen
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandOrangeSoft
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.CashNCarryTheme
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft
import com.example.ui.viewmodel.LiveCommerceViewModel
import com.example.ui.viewmodel.MarketplaceViewModel
import com.example.ui.viewmodel.SellerAdminViewModel
import kotlinx.coroutines.launch

object Routes {
    const val HOME = "home"
    const val DISCOVER = "discover"
    const val LIVE = "live"
    const val REELS = "reels"
    const val ORDERS = "orders/{tab}"
    const val PRODUCT = "product/{productId}"
    const val LIVE_PLAYER = "live_player/{streamId}"
    const val STUDIO = "broadcast_studio"
    const val STOREFRONT = "storefront/{sellerId}"
    const val SELLER_CENTRE = "seller_centre"
    const val SELLER_ONBOARDING = "seller_onboarding"
    const val ADMIN_CONSOLE = "admin_console"
    const val PROFILE = "profile"
    const val AUTH = "auth"

    fun orders(tab: Int = 0) = "orders/$tab"
    fun product(productId: String) = "product/$productId"
    fun livePlayer(streamId: String) = "live_player/$streamId"
    fun storefront(sellerId: String) = "storefront/$sellerId"
}

private data class TopTab(
    val route: String,
    val matchPrefix: String,
    val label: String,
    val icon: ImageVector,
    val tag: String
)

private sealed interface AppSessionState {
    data object Loading : AppSessionState
    data class Ready(val session: CloudflareSessionSnapshot?) : AppSessionState
}

internal fun resolveDeepLinkRoute(uri: Uri?): String? {
    if (uri == null) return null
    val path = uri.path.orEmpty().trim('/').lowercase()
    val segments = path.split('/').filter { it.isNotBlank() }
    val first = segments.firstOrNull() ?: return null
    val second = segments.getOrNull(1)
    return when {
        first == "seller" && second == "onboarding" -> Routes.SELLER_ONBOARDING
        first == "seller" || first == "seller-centre" -> Routes.SELLER_CENTRE
        first == "studio" || first == "broadcast" -> Routes.STUDIO
        first == "for-you" || first == "reels" -> Routes.REELS
        first == "live" && !second.isNullOrBlank() -> Routes.livePlayer(second)
        first == "live" -> Routes.LIVE
        first == "product" && !second.isNullOrBlank() -> Routes.product(second)
        first == "storefront" && !second.isNullOrBlank() -> Routes.storefront(second)
        first == "admin" -> Routes.ADMIN_CONSOLE
        first == "orders" || first == "cart" -> Routes.orders(0)
        first == "discover" || first == "shop" -> Routes.DISCOVER
        first == "profile" -> Routes.PROFILE
        else -> null
    }
}

class MainActivity : ComponentActivity() {
    private var pendingDeepLinkState by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingDeepLinkState = resolveDeepLinkRoute(intent?.data)
        enableEdgeToEdge()

        setContent {
            CashNCarryTheme {
                val context = LocalContext.current
                val cloudflareSyncRepo = remember(context) {
                    CloudflareSyncRepository(SharedPreferencesSessionStorage(context))
                }
                var appState by remember { mutableStateOf<AppSessionState>(AppSessionState.Loading) }

                LaunchedEffect(cloudflareSyncRepo) {
                    val cached = cloudflareSyncRepo.currentSessionSnapshot()
                    appState = if (!cached.signedIn) {
                        AppSessionState.Ready(session = null)
                    } else {
                        when (val restored = cloudflareSyncRepo.restoreSession()) {
                            is CloudflareResult.Success -> AppSessionState.Ready(restored.data)
                            is CloudflareResult.Failure -> AppSessionState.Ready(session = null)
                        }
                    }
                }

                when (val current = appState) {
                    AppSessionState.Loading -> SessionLoadingScreen()
                    is AppSessionState.Ready -> {
                        val sessionKey = current.session?.userId?.ifBlank { "guest" } ?: "guest"
                        key(sessionKey) {
                            CashNCarryShell(
                                session = current.session,
                                cloudflareSyncRepo = cloudflareSyncRepo,
                                pendingDeepLink = pendingDeepLinkState,
                                onConsumeDeepLink = { pendingDeepLinkState = null },
                                onSessionChanged = { newSession ->
                                    appState = AppSessionState.Ready(newSession)
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        resolveDeepLinkRoute(intent.data)?.let { route ->
            pendingDeepLinkState = route
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CashNCarryShell(
    session: CloudflareSessionSnapshot?,
    cloudflareSyncRepo: CloudflareSyncRepository,
    pendingDeepLink: String?,
    onConsumeDeepLink: () -> Unit,
    onSessionChanged: (CloudflareSessionSnapshot?) -> Unit
) {
    var showCreateSheet by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val catalogRepo = remember(cloudflareSyncRepo) { CatalogRepository(cloudflareSyncRepo) }
    val liveRepo = remember(cloudflareSyncRepo) { LiveCommerceRepository(cloudflareSyncRepo) }
    val adminRepo = remember { AdminRepository() }
    val aiRepo = remember { AiRecommendationRepository() }

    val currentUserId = session?.userId.orEmpty()
    val displayName = session?.displayName?.takeIf { it.isNotBlank() }
        ?: session?.email?.substringBefore("@")?.ifBlank { null }
        ?: "Guest"
    val userEmail = session?.email.orEmpty()

    val vmKey = currentUserId.ifBlank { "guest" }

    val marketplaceVm: MarketplaceViewModel = viewModel(
        key = "mkt_$vmKey",
        factory = viewModelFactory {
            initializer {
                MarketplaceViewModel(
                    catalogRepository = catalogRepo,
                    aiRepository = aiRepo,
                    currentUserId = currentUserId,
                    currentUserName = displayName,
                    currentUserEmail = userEmail,
                    cloudflareSyncRepository = cloudflareSyncRepo
                )
            }
        }
    )

    val liveVm: LiveCommerceViewModel = viewModel(
        key = "live_$vmKey",
        factory = viewModelFactory {
            initializer {
                LiveCommerceViewModel(
                    liveRepo = liveRepo,
                    adminRepo = adminRepo,
                    currentUserId = currentUserId,
                    currentUserName = displayName
                )
            }
        }
    )

    val sellerAdminVm: SellerAdminViewModel = viewModel(
        key = "seller_$vmKey",
        factory = viewModelFactory {
            initializer {
                SellerAdminViewModel(
                    catalogRepo = catalogRepo,
                    liveRepo = liveRepo,
                    adminRepo = adminRepo,
                    currentUserId = currentUserId,
                    currentUserName = displayName,
                    currentUserEmail = userEmail
                )
            }
        }
    )

    val productsState by marketplaceVm.productsState.collectAsStateWithLifecycle()
    val sellersState by marketplaceVm.sellersState.collectAsStateWithLifecycle()
    val cartState by marketplaceVm.cartState.collectAsStateWithLifecycle()
    val wishlistState by marketplaceVm.wishlistState.collectAsStateWithLifecycle()
    val ordersState by marketplaceVm.buyerOrdersState.collectAsStateWithLifecycle()
    val userProfile by marketplaceVm.userProfile.collectAsStateWithLifecycle()
    val sellerApplication by marketplaceVm.sellerApplication.collectAsStateWithLifecycle()
    val isSubmittingSellerApp by marketplaceVm.isSubmittingSellerApp.collectAsStateWithLifecycle()
    val privateInfo by marketplaceVm.userPrivateInfo.collectAsStateWithLifecycle()
    val selectedReviews by marketplaceVm.selectedProductReviews.collectAsStateWithLifecycle()
    val searchQuery by marketplaceVm.searchQuery.collectAsStateWithLifecycle()
    val selectedCategory by marketplaceVm.selectedCategory.collectAsStateWithLifecycle()
    val selectedBrand by marketplaceVm.selectedBrand.collectAsStateWithLifecycle()
    val selectedSellerFilterId by marketplaceVm.selectedSellerFilterId.collectAsStateWithLifecycle()
    val sortOption by marketplaceVm.sortOption.collectAsStateWithLifecycle()
    val inStockOnly by marketplaceVm.inStockOnly.collectAsStateWithLifecycle()
    val deliveryStateFilterEnabled by marketplaceVm.deliveryStateFilterEnabled.collectAsStateWithLifecycle()
    val compareIds by marketplaceVm.compareProductIds.collectAsStateWithLifecycle()
    val aiAdviceState by marketplaceVm.aiAdviceState.collectAsStateWithLifecycle()
    val mktMessage by marketplaceVm.actionMessage.collectAsStateWithLifecycle()
    val cfHealth by marketplaceVm.cloudflareHealth.collectAsStateWithLifecycle()

    val livestreamsState by liveVm.livestreamsState.collectAsStateWithLifecycle()
    val auctionsState by liveVm.auctionsState.collectAsStateWithLifecycle()
    val shortVideosState by liveVm.shortVideosState.collectAsStateWithLifecycle()
    val userShortVideos by liveVm.userShortVideos.collectAsStateWithLifecycle()
    val wallet by liveVm.walletState.collectAsStateWithLifecycle()
    val walletLedger by liveVm.walletLedgerState.collectAsStateWithLifecycle()
    val virtualGifts by liveVm.virtualGifts.collectAsStateWithLifecycle()
    val activeStreamMessages by liveVm.activeStreamMessages.collectAsStateWithLifecycle()
    val activeTopGifters by liveVm.activeTopGifters.collectAsStateWithLifecycle()
    val activeAuctionBids by liveVm.activeAuctionBids.collectAsStateWithLifecycle()
    val activeVideoComments by liveVm.activeVideoComments.collectAsStateWithLifecycle()
    val usePromoCoins by liveVm.usePromoCoins.collectAsStateWithLifecycle()
    val giftBanner by liveVm.giftBanner.collectAsStateWithLifecycle()
    val minimizedStreamId by liveVm.minimizedStreamId.collectAsStateWithLifecycle()
    val liveMessage by liveVm.statusBanner.collectAsStateWithLifecycle()
    val isUploadingVideo by liveVm.isUploadingVideo.collectAsStateWithLifecycle()
    val videoUploadProgress by liveVm.videoUploadProgress.collectAsStateWithLifecycle()
    val videoUploadError by liveVm.videoUploadError.collectAsStateWithLifecycle()

    val sellerProducts by sellerAdminVm.sellerProducts.collectAsStateWithLifecycle()
    val sellerOrders by sellerAdminVm.sellerOrders.collectAsStateWithLifecycle()
    val sellerGiftTx by sellerAdminVm.sellerGiftTransactions.collectAsStateWithLifecycle()
    val adminDisputes by sellerAdminVm.adminDisputes.collectAsStateWithLifecycle()
    val adminAuditLogs by sellerAdminVm.adminAuditLogs.collectAsStateWithLifecycle()
    val sellerFeedback by sellerAdminVm.feedback.collectAsStateWithLifecycle()

    // Authoritative server-derived RBAC checks
    val isAuthenticated = session?.signedIn == true && currentUserId.isNotBlank()
    val isApprovedSeller = isAuthenticated && (
        userProfile?.isApprovedSeller ?: (session?.isApprovedSeller == true)
    )
    val isPendingSeller = isAuthenticated && !isApprovedSeller && (
        userProfile?.sellerStatus.equals("pending", ignoreCase = true) ||
            sellerApplication?.status.equals("pending", ignoreCase = true) ||
            (userProfile == null && session?.sellerStatus.equals("pending", ignoreCase = true))
    )
    val isAdmin = isAuthenticated && (
        userProfile?.role.equals("admin", ignoreCase = true) ||
            session?.role.equals("admin", ignoreCase = true)
    )

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(mktMessage) {
        mktMessage?.let {
            snackbarHostState.showSnackbar(it)
            marketplaceVm.clearMessage()
        }
    }
    LaunchedEffect(liveMessage) {
        liveMessage?.let {
            snackbarHostState.showSnackbar(it)
            liveVm.clearStatusBanner()
        }
    }
    LaunchedEffect(sellerFeedback) {
        sellerFeedback?.let {
            snackbarHostState.showSnackbar(it)
            sellerAdminVm.clearFeedback()
        }
    }

    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: Routes.HOME

    LaunchedEffect(pendingDeepLink) {
        val target = pendingDeepLink ?: return@LaunchedEffect
        navController.navigate(target) {
            launchSingleTop = true
        }
        onConsumeDeepLink()
    }

    val allProducts = (productsState as? UiState.Success)?.data ?: emptyList()
    val allSellers = (sellersState as? UiState.Success)?.data ?: emptyList()
    val allStreams = (livestreamsState as? UiState.Success)?.data ?: emptyList()
    val allAuctions = (auctionsState as? UiState.Success)?.data ?: emptyList()
    val allVideos = (shortVideosState as? UiState.Success)?.data ?: emptyList()
    val cartItems = (cartState as? UiState.Success)?.data ?: emptyList()
    val wishlistItems = (wishlistState as? UiState.Success)?.data ?: emptyList()
    val orders = (ordersState as? UiState.Success)?.data ?: emptyList()

    val cartCount = cartItems.sumOf { it.quantity }.toInt()
    val wishlistIds = remember(wishlistItems) { wishlistItems.map { it.productId }.toSet() }
    val selectedState = userProfile?.selectedState ?: "Lagos"
    val followingSellerIds = userProfile?.followingSellerIds ?: emptyList()
    val recentIds = userProfile?.recentProductIds ?: emptyList()
    val hasSavedShippingReady = privateInfo?.savedPaymentReady == true

    val showChromeBars = !currentRoute.startsWith("live_player/") &&
        currentRoute != Routes.STUDIO &&
        currentRoute != Routes.AUTH &&
        currentRoute != Routes.SELLER_ONBOARDING &&
        !currentRoute.startsWith("product/")

    val minimizedStream = remember(allStreams, minimizedStreamId) {
        minimizedStreamId?.let { id -> allStreams.find { it.id == id } }
    }

    val topTabs = listOf(
        TopTab(Routes.HOME, Routes.HOME, "Home", Icons.Default.Home, "nav_home"),
        TopTab(Routes.DISCOVER, Routes.DISCOVER, "Discover", Icons.Default.Search, "nav_discover"),
        TopTab(Routes.LIVE, Routes.LIVE, "LIVE", Icons.Default.LiveTv, "nav_live"),
        TopTab(Routes.REELS, Routes.REELS, "Reels", Icons.Default.PlayCircle, "nav_reels"),
        TopTab(Routes.orders(0), "orders/", "Orders", Icons.Default.ShoppingBag, "nav_orders")
    )

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val isWide = maxWidth >= 680.dp

        Scaffold(
            containerColor = Color.White,
            contentWindowInsets = if (showChromeBars) WindowInsets.safeDrawing else WindowInsets(0.dp),
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
            bottomBar = {
                if (showChromeBars && !isWide) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        if (minimizedStream != null) {
                            MiniPiPStreamBar(
                                stream = minimizedStream,
                                onExpand = {
                                    liveVm.openStream(minimizedStream.id)
                                    navController.navigate(Routes.livePlayer(minimizedStream.id))
                                },
                                onClose = { liveVm.dismissMiniPlayer() }
                            )
                        }
                        Surface(
                            color = Color.White,
                            shadowElevation = 10.dp,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.navigationBarsPadding()) {
                                HorizontalDivider(color = BrandBorder, thickness = 0.8.dp)
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceAround,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(66.dp)
                                        .padding(horizontal = 6.dp)
                                ) {
                                    MockupBottomNavItem(
                                        selected = currentRoute == Routes.REELS,
                                        icon = if (currentRoute == Routes.REELS) Icons.Default.PlayCircle else Icons.Outlined.PlayCircle,
                                        label = "For You",
                                        tag = "nav_reels",
                                        onClick = {
                                            navController.navigate(Routes.REELS) {
                                                popUpTo(Routes.HOME) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    )

                                    MockupShopNavItem(
                                        selected = currentRoute == Routes.HOME,
                                        tag = "nav_home",
                                        onClick = {
                                            navController.navigate(Routes.HOME) {
                                                popUpTo(Routes.HOME) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    )

                                    Surface(
                                        onClick = { showCreateSheet = true },
                                        shape = CircleShape,
                                        color = BrandOrange,
                                        shadowElevation = 6.dp,
                                        modifier = Modifier
                                            .size(50.dp)
                                            .testTag("nav_create_plus")
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.Add,
                                                contentDescription = "Create, Go Live or Sell",
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                    }

                                    MockupBottomNavItem(
                                        selected = currentRoute.startsWith("orders/"),
                                        icon = if (currentRoute.startsWith("orders/")) Icons.Default.ShoppingBag else Icons.Outlined.ShoppingBag,
                                        label = "Orders",
                                        badgeCount = orders.size,
                                        tag = "nav_orders",
                                        onClick = {
                                            navController.navigate(Routes.orders(0)) {
                                                popUpTo(Routes.HOME) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    )

                                    MockupBottomNavItem(
                                        selected = currentRoute == Routes.PROFILE,
                                        icon = if (currentRoute == Routes.PROFILE) Icons.Default.Person else Icons.Outlined.Person,
                                        label = "Profile",
                                        tag = "nav_profile",
                                        onClick = {
                                            navController.navigate(Routes.PROFILE) {
                                                popUpTo(Routes.HOME) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        ) { innerPadding ->
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (showChromeBars && isWide) {
                    NavigationRail(
                        containerColor = Color.White,
                        modifier = Modifier.fillMaxHeight()
                    ) {
                        topTabs.forEach { tab ->
                            val selected = currentRoute == tab.route || currentRoute.startsWith(tab.matchPrefix)
                            NavigationRailItem(
                                selected = selected,
                                onClick = {
                                    navController.navigate(tab.route) {
                                        popUpTo(Routes.HOME) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label) },
                                modifier = Modifier.testTag(tab.tag)
                            )
                        }
                    }
                }

                Box(modifier = Modifier.weight(1f)) {
                    NavHost(
                        navController = navController,
                        startDestination = Routes.HOME
                    ) {
                        composable(Routes.HOME) {
                            HomeMarketplaceScreen(
                                productsState = productsState,
                                sellersState = sellersState,
                                livestreamsState = livestreamsState,
                                shortVideosState = shortVideosState,
                                selectedState = selectedState,
                                selectedCategory = selectedCategory,
                                searchQuery = searchQuery,
                                cartCount = cartCount,
                                wishlistProductIds = wishlistIds,
                                compareProductIds = compareIds.toSet(),
                                recentProductIds = recentIds,
                                wallet = wallet,
                                isAuthenticated = isAuthenticated,
                                isApprovedSeller = isApprovedSeller,
                                isPendingSeller = isPendingSeller,
                                isAdmin = isAdmin,
                                onSearchChange = marketplaceVm::setSearchQuery,
                                onTriggerSearch = {
                                    marketplaceVm.runAiSearchAdvice()
                                    navController.navigate(Routes.DISCOVER)
                                },
                                onSelectCategory = marketplaceVm::setCategory,
                                onUpdateNigerianState = marketplaceVm::updateNigerianState,
                                onOpenProduct = { prod ->
                                    marketplaceVm.selectProductForDetail(prod.id)
                                    navController.navigate(Routes.product(prod.id))
                                },
                                onAddToCart = { prod ->
                                    if (!isAuthenticated) {
                                        navController.navigate(Routes.AUTH)
                                    } else {
                                        marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                    }
                                },
                                onToggleWishlist = { prod ->
                                    if (!isAuthenticated) {
                                        navController.navigate(Routes.AUTH)
                                    } else {
                                        marketplaceVm.toggleWishlist(prod)
                                    }
                                },
                                onToggleCompare = { prod -> marketplaceVm.toggleCompareProduct(prod.id) },
                                onOpenLivestream = { streamId ->
                                    liveVm.openStream(streamId)
                                    navController.navigate(Routes.livePlayer(streamId))
                                },
                                onOpenLiveHub = { navController.navigate(Routes.LIVE) },
                                onOpenVideoFeed = { navController.navigate(Routes.REELS) },
                                onOpenDiscover = { navController.navigate(Routes.DISCOVER) },
                                onOpenStorefront = { sellerId -> navController.navigate(Routes.storefront(sellerId)) },
                                onOpenCart = { navController.navigate(Routes.orders(0)) },
                                onOpenWallet = { navController.navigate(Routes.orders(2)) },
                                onOpenSellerCentre = { navController.navigate(Routes.SELLER_CENTRE) },
                                onOpenSellerOnboarding = { navController.navigate(Routes.SELLER_ONBOARDING) },
                                onOpenAdminConsole = { navController.navigate(Routes.ADMIN_CONSOLE) },
                                onOpenProfile = { navController.navigate(Routes.PROFILE) },
                                onRetryHome = {
                                    marketplaceVm.refreshMarketplace()
                                    liveVm.refreshLiveCommerce()
                                },
                                liveAuctions = allAuctions.filter { it.status == "live" },
                                currentUserId = currentUserId,
                                onPlaceAuctionBid = { auc, bid ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else liveVm.placeBid(auc, bid)
                                },
                                onClaimAuctionWin = { auc ->
                                    if (!isAuthenticated) {
                                        navController.navigate(Routes.AUTH)
                                    } else {
                                        liveVm.claimWonAuction(
                                            auction = auc,
                                            deliveryState = selectedState,
                                            deliveryAddress = privateInfo?.shippingAddress.orEmpty()
                                        ) {
                                            navController.navigate(Routes.orders(1))
                                        }
                                    }
                                }
                            )
                        }

                        composable(Routes.DISCOVER) {
                            DiscoverScreen(
                                products = allProducts,
                                sellers = allSellers,
                                selectedState = selectedState,
                                searchQuery = searchQuery,
                                selectedCategory = selectedCategory,
                                selectedBrand = selectedBrand,
                                selectedSellerId = selectedSellerFilterId,
                                sortOption = sortOption,
                                inStockOnly = inStockOnly,
                                deliveryStateFilterEnabled = deliveryStateFilterEnabled,
                                wishlistIds = wishlistIds,
                                compareIds = compareIds,
                                aiAdviceState = aiAdviceState,
                                productsError = (productsState as? UiState.Error)?.message,
                                onRetryProducts = marketplaceVm::refreshMarketplace,
                                onSearchChange = marketplaceVm::setSearchQuery,
                                onRunAiSearch = marketplaceVm::runAiSearchAdvice,
                                onSelectCategory = marketplaceVm::setCategory,
                                onSelectBrand = marketplaceVm::setBrand,
                                onSelectSeller = marketplaceVm::setSellerFilter,
                                onSelectSort = marketplaceVm::setSortOption,
                                onToggleInStock = marketplaceVm::toggleInStockOnly,
                                onToggleDeliveryState = marketplaceVm::toggleDeliveryStateFilter,
                                onOpenProduct = { prod ->
                                    marketplaceVm.selectProductForDetail(prod.id)
                                    navController.navigate(Routes.product(prod.id))
                                },
                                onAddToCart = { prod ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                },
                                onToggleWishlist = { prod ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else marketplaceVm.toggleWishlist(prod)
                                },
                                onToggleCompare = { prod -> marketplaceVm.toggleCompareProduct(prod.id) },
                                onOpenLivestream = { streamId ->
                                    liveVm.openStream(streamId)
                                    navController.navigate(Routes.livePlayer(streamId))
                                }
                            )
                        }

                        composable(Routes.LIVE) {
                            LiveHubScreen(
                                livestreamsState = livestreamsState,
                                auctionsState = auctionsState,
                                activeAuctionBids = activeAuctionBids,
                                followingSellerIds = followingSellerIds,
                                currentUserId = currentUserId,
                                hasSavedShippingReady = hasSavedShippingReady,
                                selectedState = selectedState,
                                selectedAddress = privateInfo?.shippingAddress.orEmpty(),
                                onOpenStream = { streamId ->
                                    liveVm.openStream(streamId)
                                    navController.navigate(Routes.livePlayer(streamId))
                                },
                                onGoLive = {
                                    when {
                                        !isAuthenticated -> navController.navigate(Routes.AUTH)
                                        isApprovedSeller -> navController.navigate(Routes.STUDIO)
                                        else -> navController.navigate(Routes.SELLER_ONBOARDING)
                                    }
                                },
                                onRetry = liveVm::refreshLiveCommerce,
                                onSelectAuction = liveVm::selectAuction,
                                onPlaceBid = { auc, bid ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else liveVm.placeBid(auc, bid)
                                },
                                onClaimWonAuction = liveVm::claimWonAuction,
                                onOpenShippingSetup = { navController.navigate(Routes.orders(0)) },
                                onOrderCreated = { navController.navigate(Routes.orders(1)) }
                            )
                        }

                        composable(Routes.REELS) {
                            VideoFeedScreen(
                                shortVideosState = shortVideosState,
                                allProducts = allProducts,
                                followingSellerIds = followingSellerIds,
                                activeVideoComments = activeVideoComments,
                                currentUserId = currentUserId,
                                isApprovedSeller = isApprovedSeller,
                                isPendingSeller = isPendingSeller,
                                isUploadingVideo = isUploadingVideo,
                                videoUploadProgress = videoUploadProgress,
                                videoUploadError = videoUploadError,
                                onSelectVideoForComments = liveVm::selectVideoForComments,
                                onLikeVideo = { id ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else liveVm.likeShortVideo(id)
                                },
                                onCommentVideo = { id, text ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else liveVm.commentShortVideo(id, text)
                                },
                                onToggleFollowSeller = { sellerId ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else marketplaceVm.toggleFollowSeller(sellerId)
                                },
                                onAddToCart = { prod ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                },
                                onBuyNow = { prod ->
                                    if (!isAuthenticated) {
                                        navController.navigate(Routes.AUTH)
                                    } else {
                                        marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                        navController.navigate(Routes.orders(0))
                                    }
                                },
                                onOpenProduct = { prod ->
                                    marketplaceVm.selectProductForDetail(prod.id)
                                    navController.navigate(Routes.product(prod.id))
                                },
                                onWatchLive = { streamId ->
                                    liveVm.openStream(streamId)
                                    navController.navigate(Routes.livePlayer(streamId))
                                },
                                onRetryVideos = liveVm::refreshLiveCommerce,
                                onRequireSignIn = { navController.navigate(Routes.AUTH) },
                                onOpenSellerOnboarding = { navController.navigate(Routes.SELLER_ONBOARDING) },
                                onUploadVideo = { uri, title, caption, product, onSuccess ->
                                    liveVm.uploadVideoFile(
                                        contentResolver = context.contentResolver,
                                        videoUri = uri,
                                        title = title,
                                        caption = caption,
                                        product = product,
                                        cacheDir = context.cacheDir,
                                        onUploaded = onSuccess
                                    )
                                },
                                onClearUploadError = liveVm::clearVideoUploadState,
                                onDeleteVideo = liveVm::deleteShortVideo
                            )
                        }

                        composable(
                            route = Routes.ORDERS,
                            arguments = listOf(navArgument("tab") { type = NavType.IntType; defaultValue = 0 })
                        ) { entry ->
                            val initialTab = entry.arguments?.getInt("tab") ?: 0
                            CartCheckoutOrdersScreen(
                                initialTab = initialTab,
                                cartItems = cartItems,
                                orders = orders,
                                wishlistItems = wishlistItems,
                                wallet = wallet,
                                walletLedger = walletLedger,
                                privateInfo = privateInfo,
                                selectedState = selectedState,
                                userName = displayName,
                                userEmail = userEmail,
                                isAuthenticated = isAuthenticated,
                                paymentsEnabled = cfHealth.staging.paymentsEnabled,
                                coinsPurchasesEnabled = cfHealth.staging.coinsPurchasesEnabled,
                                onRequireSignIn = { navController.navigate(Routes.AUTH) },
                                onUpdateCartQty = marketplaceVm::updateCartQuantity,
                                onCheckoutCart = { state, address, method ->
                                    if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                    else marketplaceVm.checkoutCart(state, address, method) {}
                                },
                                onPayExistingOrder = marketplaceVm::payOrder,
                                onSaveShippingSetup = marketplaceVm::saveShippingSetup,
                                onBuyCoins = liveVm::buyCoins,
                                onSignOut = { showLogoutDialog = true }
                            )
                        }

                        composable(
                            route = Routes.PRODUCT,
                            arguments = listOf(navArgument("productId") { type = NavType.StringType })
                        ) { entry ->
                            val productId = entry.arguments?.getString("productId").orEmpty()
                            val product = allProducts.find { it.id == productId }
                            if (product != null) {
                                val seller = allSellers.find { it.ownerId == product.sellerId }
                                val related = allProducts.filter { it.category == product.category && it.id != product.id }
                                ProductDetailScreen(
                                    product = product,
                                    seller = seller,
                                    reviews = selectedReviews,
                                    relatedProducts = related,
                                    selectedState = selectedState,
                                    isWishlisted = wishlistIds.contains(product.id),
                                    isFollowingSeller = followingSellerIds.contains(product.sellerId),
                                    onBack = { navController.popBackStack() },
                                    onAddToCart = { variant ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.addToCart(product, variant)
                                    },
                                    onBuyNow = { variant ->
                                        if (!isAuthenticated) {
                                            navController.navigate(Routes.AUTH)
                                        } else {
                                            marketplaceVm.addToCart(product, variant)
                                            navController.navigate(Routes.orders(0))
                                        }
                                    },
                                    onToggleWishlist = {
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.toggleWishlist(product)
                                    },
                                    onToggleFollowSeller = {
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.toggleFollowSeller(product.sellerId)
                                    },
                                    onWatchLive = { streamId ->
                                        liveVm.openStream(streamId)
                                        navController.navigate(Routes.livePlayer(streamId))
                                    },
                                    onOpenStorefront = { sellerId -> navController.navigate(Routes.storefront(sellerId)) },
                                    onOpenProduct = { rel ->
                                        marketplaceVm.selectProductForDetail(rel.id)
                                        navController.navigate(Routes.product(rel.id))
                                    },
                                    onSubmitReview = { rating, comment ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.submitReview(product.id, rating, comment)
                                    }
                                )
                            } else {
                                MissingEntityFallback(
                                    title = "Product not found",
                                    subtitle = "This item is no longer available.",
                                    onBack = { navController.popBackStack() }
                                )
                            }
                        }

                        composable(
                            route = Routes.LIVE_PLAYER,
                            arguments = listOf(navArgument("streamId") { type = NavType.StringType })
                        ) { entry ->
                            val streamId = entry.arguments?.getString("streamId").orEmpty()
                            val stream = allStreams.find { it.id == streamId }
                            if (stream != null) {
                                LaunchedEffect(stream.id) { liveVm.openStream(stream.id) }
                                val streamProducts = allProducts.filter {
                                    it.sellerId == stream.sellerId || it.liveStreamId == stream.id
                                }
                                val streamAuction = allAuctions.firstOrNull {
                                    it.sellerId == stream.sellerId && it.status == "live"
                                }
                                LivePlayerScreen(
                                    stream = stream,
                                    streamProducts = streamProducts,
                                    activeAuction = streamAuction,
                                    messages = activeStreamMessages,
                                    topGifters = activeTopGifters,
                                    virtualGifts = virtualGifts,
                                    wallet = wallet,
                                    usePromoCoins = usePromoCoins,
                                    giftBanner = giftBanner,
                                    isFollowingSeller = followingSellerIds.contains(stream.sellerId),
                                    currentUserId = currentUserId,
                                    isAdmin = isAdmin,
                                    coinsPurchasesEnabled = cfHealth.staging.coinsPurchasesEnabled,
                                    onBack = { navController.popBackStack() },
                                    onMinimizePiP = {
                                        liveVm.minimizeStream(stream.id)
                                        navController.popBackStack()
                                    },
                                    onToggleFollowSeller = {
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.toggleFollowSeller(stream.sellerId)
                                    },
                                    onSendLike = {
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else liveVm.sendLike(stream.id)
                                    },
                                    onSendChat = { text ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else liveVm.sendChatMessage(stream.id, text)
                                    },
                                    onModerateDeleteMessage = { msgId ->
                                        liveVm.moderateDeleteMessage(stream.id, msgId)
                                    },
                                    onTogglePromoCoins = liveVm::setUsePromoCoins,
                                    onSendGift = { gift ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else liveVm.sendGift(stream, gift)
                                    },
                                    onClearGiftBanner = liveVm::clearGiftBanner,
                                    onClaimPromoCoins = liveVm::claimPromoCoins,
                                    onOpenWalletTopUp = { navController.navigate(Routes.orders(2)) },
                                    onAddToCart = { prod ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                    },
                                    onBuyNow = { prod ->
                                        if (!isAuthenticated) {
                                            navController.navigate(Routes.AUTH)
                                        } else {
                                            marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                            liveVm.minimizeStream(stream.id)
                                            navController.navigate(Routes.orders(0))
                                        }
                                    },
                                    onOpenProductDetail = { prod ->
                                        liveVm.minimizeStream(stream.id)
                                        marketplaceVm.selectProductForDetail(prod.id)
                                        navController.navigate(Routes.product(prod.id))
                                    },
                                    onPlaceAuctionBid = { auc, bid ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else liveVm.placeBid(auc, bid)
                                    },
                                    onReportStream = { reason -> liveVm.reportLivestream(stream.id, reason) }
                                )
                            } else {
                                MissingEntityFallback(
                                    title = "Broadcast not found",
                                    subtitle = "No one is live on this room right now.",
                                    onBack = { navController.popBackStack() }
                                )
                            }
                        }

                        composable(Routes.STUDIO) {
                            when {
                                !isAuthenticated -> AuthRequiredGate(
                                    title = "Sign In Required",
                                    subtitle = "Sign in and complete seller approval before hosting live streams.",
                                    onSignIn = { navController.navigate(Routes.AUTH) },
                                    onBack = { navController.popBackStack() }
                                )
                                !isApprovedSeller -> SellerPermissionGate(
                                    isPendingSeller = isPendingSeller,
                                    onStartSelling = { navController.navigate(Routes.SELLER_ONBOARDING) },
                                    onBack = { navController.popBackStack() }
                                )
                                else -> {
                                    val myLiveStream = allStreams.firstOrNull {
                                        it.sellerId == currentUserId && it.status == "live"
                                    }
                                    BroadcastStudioScreen(
                                        sellerProducts = sellerProducts,
                                        activeStream = myLiveStream,
                                        streamMessages = activeStreamMessages,
                                        liveStreamingConfigured = cfHealth.staging.liveStreamingConfigured,
                                        onBack = { navController.popBackStack() },
                                        onStartLive = liveVm::startBroadcast,
                                        onPinProduct = liveVm::pinProduct,
                                        onLaunchFlashDeal = liveVm::triggerFlashDeal,
                                        onLaunchAuction = { prod, startBid, minInc, mins ->
                                            sellerAdminVm.launchAuction(displayName, prod, startBid, minInc, mins)
                                        },
                                        onSendHostChat = liveVm::sendChatMessage,
                                        onModeratorDeleteChat = liveVm::moderateDeleteMessage,
                                        onEndLive = { id ->
                                            liveVm.endBroadcast(id) { navController.popBackStack() }
                                        }
                                    )
                                }
                            }
                        }

                        composable(
                            route = Routes.STOREFRONT,
                            arguments = listOf(navArgument("sellerId") { type = NavType.StringType })
                        ) { entry ->
                            val sellerId = entry.arguments?.getString("sellerId").orEmpty()
                            val seller = allSellers.find { it.ownerId == sellerId || it.id == sellerId }
                            if (seller != null) {
                                StorefrontScreen(
                                    seller = seller,
                                    sellerProducts = allProducts.filter { it.sellerId == seller.ownerId },
                                    sellerStreams = allStreams.filter { it.sellerId == seller.ownerId },
                                    sellerVideos = allVideos.filter { it.sellerId == seller.ownerId },
                                    wishlistIds = wishlistIds,
                                    compareIds = compareIds,
                                    isFollowing = followingSellerIds.contains(seller.ownerId),
                                    onBack = { navController.popBackStack() },
                                    onToggleFollow = {
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.toggleFollowSeller(seller.ownerId)
                                    },
                                    onOpenProduct = { prod ->
                                        marketplaceVm.selectProductForDetail(prod.id)
                                        navController.navigate(Routes.product(prod.id))
                                    },
                                    onAddToCart = { prod ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.addToCart(prod, prod.variants.firstOrNull() ?: "Standard")
                                    },
                                    onToggleWishlist = { prod ->
                                        if (!isAuthenticated) navController.navigate(Routes.AUTH)
                                        else marketplaceVm.toggleWishlist(prod)
                                    },
                                    onToggleCompare = { prod -> marketplaceVm.toggleCompareProduct(prod.id) },
                                    onOpenStream = { streamId ->
                                        liveVm.openStream(streamId)
                                        navController.navigate(Routes.livePlayer(streamId))
                                    },
                                    onOpenVideos = { navController.navigate(Routes.REELS) }
                                )
                            } else {
                                MissingEntityFallback(
                                    title = "Storefront not found",
                                    subtitle = "Unable to load this seller storefront.",
                                    onBack = { navController.popBackStack() }
                                )
                            }
                        }

                        composable(Routes.SELLER_CENTRE) {
                            when {
                                !isAuthenticated -> AuthRequiredGate(
                                    title = "Sign In Required",
                                    subtitle = "Sign in to check your seller status or manage your storefront.",
                                    onSignIn = { navController.navigate(Routes.AUTH) },
                                    onBack = { navController.popBackStack() }
                                )
                                !isApprovedSeller -> SellerPermissionGate(
                                    isPendingSeller = isPendingSeller,
                                    onStartSelling = { navController.navigate(Routes.SELLER_ONBOARDING) },
                                    onBack = { navController.popBackStack() }
                                )
                                else -> {
                                    val myStore = allSellers.find { it.ownerId == currentUserId }
                                    SellerCentreScreen(
                                        sellerStorefront = myStore,
                                        sellerProducts = sellerProducts,
                                        sellerOrders = sellerOrders,
                                        giftTransactions = sellerGiftTx,
                                        defaultSellerName = displayName,
                                        onBack = { navController.popBackStack() },
                                        onOpenBroadcastStudio = { navController.navigate(Routes.STUDIO) },
                                        onSaveStorefront = sellerAdminVm::saveStorefront,
                                        onAddProduct = sellerAdminVm::addProduct,
                                        onUpdateProduct = sellerAdminVm::updateStockAndFlash,
                                        onFulfilOrder = sellerAdminVm::fulfilOrder,
                                        onLaunchAuction = sellerAdminVm::launchAuction,
                                        onOpenVideoUpload = { navController.navigate(Routes.REELS) },
                                        onSubmitForReview = sellerAdminVm::submitProductForReview
                                    )
                                }
                            }
                        }

                        composable(Routes.SELLER_ONBOARDING) {
                            SellerOnboardingScreen(
                                isAuthenticated = isAuthenticated,
                                userProfile = userProfile,
                                sellerApplication = sellerApplication,
                                isSubmitting = isSubmittingSellerApp,
                                kycUploadsEnabled = cfHealth.staging.kycUploadsEnabled,
                                onBack = { navController.popBackStack() },
                                onRequireSignIn = { navController.navigate(Routes.AUTH) },
                                onOpenSellerCentre = {
                                    if (isApprovedSeller) {
                                        navController.navigate(Routes.SELLER_CENTRE)
                                    }
                                },
                                onSubmitApplication = { businessName, cacNumber, businessType, stateLocation, phone, description ->
                                    marketplaceVm.submitSellerApplication(
                                        businessName = businessName,
                                        cacNumber = cacNumber,
                                        businessType = businessType,
                                        stateLocation = stateLocation,
                                        phone = phone,
                                        description = description
                                    )
                                }
                            )
                        }

                        composable(Routes.ADMIN_CONSOLE) {
                            AdminConsoleScreen(
                                isAdmin = isAdmin,
                                sellers = allSellers,
                                products = allProducts,
                                gifts = virtualGifts,
                                disputes = adminDisputes,
                                auditLogs = adminAuditLogs,
                                onBack = { navController.popBackStack() },
                                onVerifySeller = sellerAdminVm::adminVerifySeller,
                                onModerateProduct = sellerAdminVm::adminModerateProduct,
                                onSaveGift = sellerAdminVm::adminSaveGift,
                                onResolveDispute = sellerAdminVm::adminResolveDispute
                            )
                        }

                        composable(Routes.PROFILE) {
                            UserProfileScreen(
                                isAuthenticated = isAuthenticated,
                                userProfile = userProfile,
                                sellerApplication = sellerApplication,
                                fallbackName = displayName,
                                userEmail = userEmail,
                                avatarUrl = null,
                                wallet = wallet,
                                uploadedVideos = userShortVideos,
                                catalogProducts = allProducts,
                                onBack = { navController.popBackStack() },
                                onRequireSignIn = { navController.navigate(Routes.AUTH) },
                                onSaveProfile = marketplaceVm::updateUserProfile,
                                onOpenVideoUpload = {
                                    if (isApprovedSeller) navController.navigate(Routes.REELS)
                                    else navController.navigate(Routes.SELLER_ONBOARDING)
                                },
                                onOpenBroadcastStudio = {
                                    if (isApprovedSeller) navController.navigate(Routes.STUDIO)
                                    else navController.navigate(Routes.SELLER_ONBOARDING)
                                },
                                onOpenSellerCentre = {
                                    if (isApprovedSeller) navController.navigate(Routes.SELLER_CENTRE)
                                    else navController.navigate(Routes.SELLER_ONBOARDING)
                                },
                                onOpenSellerOnboarding = { navController.navigate(Routes.SELLER_ONBOARDING) },
                                onWatchVideoFeed = { navController.navigate(Routes.REELS) },
                                onOpenProduct = { prod ->
                                    marketplaceVm.selectProductForDetail(prod.id)
                                    navController.navigate(Routes.product(prod.id))
                                },
                                onOpenWallet = { navController.navigate(Routes.orders(2)) },
                                onSignOut = { showLogoutDialog = true }
                            )
                        }

                        composable(Routes.AUTH) {
                            AuthScreen(
                                cloudflareSyncRepo = cloudflareSyncRepo,
                                onAuthSuccess = { newSession ->
                                    onSessionChanged(newSession)
                                    navController.popBackStack()
                                },
                                onContinueAsGuest = {
                                    navController.popBackStack()
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showCreateSheet) {
        ModalBottomSheet(
            onDismissRequest = { showCreateSheet = false },
            containerColor = Color.White
        ) {
            CreateActionSheetContent(
                isAuthenticated = isAuthenticated,
                isApprovedSeller = isApprovedSeller,
                isPendingSeller = isPendingSeller,
                onRequireSignIn = {
                    showCreateSheet = false
                    navController.navigate(Routes.AUTH)
                },
                onStartSelling = {
                    showCreateSheet = false
                    navController.navigate(Routes.SELLER_ONBOARDING)
                },
                onUploadVideo = {
                    showCreateSheet = false
                    navController.navigate(Routes.REELS)
                },
                onGoLive = {
                    showCreateSheet = false
                    navController.navigate(Routes.STUDIO)
                },
                onManageProducts = {
                    showCreateSheet = false
                    navController.navigate(Routes.SELLER_CENTRE)
                }
            )
        }
    }

    if (showLogoutDialog) {
        LogoutConfirmationDialog(
            onConfirmLogout = {
                showLogoutDialog = false
                scope.launch {
                    cloudflareSyncRepo.signOut()
                    onSessionChanged(null)
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            },
            onDismiss = { showLogoutDialog = false }
        )
    }
}

@Composable
internal fun CreateActionSheetContent(
    isAuthenticated: Boolean,
    isApprovedSeller: Boolean,
    isPendingSeller: Boolean,
    onRequireSignIn: () -> Unit,
    onStartSelling: () -> Unit,
    onUploadVideo: () -> Unit,
    onGoLive: () -> Unit,
    onManageProducts: () -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
            .testTag("create_action_sheet")
    ) {
        when {
            !isAuthenticated -> {
                Text(
                    text = "Sign In Required",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = BrandSlate
                )
                Text(
                    text = "Sign in or create a buyer account to access seller tools, save items, and interact with sellers.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = BrandMuted
                )
                Button(
                    onClick = onRequireSignIn,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("create_sheet_sign_in_btn")
                ) {
                    Text("Sign In / Create Account", fontWeight = FontWeight.Bold)
                }
            }

            isPendingSeller -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(BrandOrangeSoft)
                    ) {
                        Icon(Icons.Default.HourglassTop, contentDescription = null, tint = BrandOrange)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Seller Verification Pending",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = BrandSlate
                        )
                        Text(
                            text = "Your seller account is awaiting approval.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BrandMuted,
                            modifier = Modifier.testTag("create_sheet_pending_banner")
                        )
                    }
                }
                OutlinedButton(
                    onClick = onStartSelling,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("create_sheet_view_status_btn")
                ) {
                    Text("View Application Status", color = BrandSlate, fontWeight = FontWeight.Bold)
                }
            }

            !isApprovedSeller -> {
                Text(
                    text = "Become a Seller",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = BrandSlate
                )
                Text(
                    text = "Only approved sellers can upload shoppable videos, go live, or publish products on Cash N Carry Nigeria.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = BrandMuted
                )
                Button(
                    onClick = onStartSelling,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("create_sheet_start_selling_btn")
                ) {
                    Text("Start Selling", fontWeight = FontWeight.Bold)
                }
            }

            else -> {
                Text(
                    text = "Seller Creator Studio",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = BrandSlate
                )
                CreateSheetItem(
                    icon = Icons.Default.PlayCircle,
                    title = "Upload Video",
                    subtitle = "Upload a verified video linked to one of your products",
                    tint = BrandOrange,
                    tag = "create_sheet_upload_video",
                    onClick = onUploadVideo
                )
                CreateSheetItem(
                    icon = Icons.Default.VideoCall,
                    title = "Go Live",
                    subtitle = "Open Broadcast Studio and host live shopping",
                    tint = LiveCrimson,
                    tag = "create_sheet_go_live",
                    onClick = onGoLive
                )
                CreateSheetItem(
                    icon = Icons.Default.Storefront,
                    title = "Manage Products",
                    subtitle = "Open Seller Centre for listings, orders & storefronts",
                    tint = BrandEmerald,
                    tag = "create_sheet_manage_products",
                    onClick = onManageProducts
                )
            }
        }
        Spacer(Modifier.height(14.dp))
    }
}

@Composable
internal fun AuthRequiredGate(
    title: String,
    subtitle: String,
    onSignIn: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(24.dp)
            .testTag("auth_required_gate")
    ) {
        Icon(Icons.Default.Lock, contentDescription = null, tint = BrandNavy, modifier = Modifier.size(44.dp))
        Spacer(Modifier.height(12.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = BrandSlate)
        Spacer(Modifier.height(6.dp))
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = BrandMuted, textAlign = TextAlign.Center)
        Spacer(Modifier.height(18.dp))
        Button(
            onClick = onSignIn,
            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .testTag("gate_sign_in_button")
        ) {
            Text("Sign In / Register", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth().height(48.dp)) {
            Text("Go Back")
        }
    }
}

@Composable
internal fun SellerPermissionGate(
    isPendingSeller: Boolean,
    onStartSelling: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(24.dp)
            .testTag("seller_permission_gate")
    ) {
        Icon(
            imageVector = if (isPendingSeller) Icons.Default.HourglassTop else Icons.Default.Storefront,
            contentDescription = null,
            tint = if (isPendingSeller) BrandOrange else BrandEmerald,
            modifier = Modifier.size(48.dp)
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = if (isPendingSeller) "Your seller account is awaiting approval." else "Become a Seller",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = BrandSlate,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = if (isPendingSeller) {
                "Seller Centre, product publishing, video uploads, and livestream broadcasting unlock once an admin approves your application."
            } else {
                "Buyer accounts cannot access Seller Centre or creator tools. Apply to become an approved seller first."
            },
            style = MaterialTheme.typography.bodyMedium,
            color = BrandMuted,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(18.dp))
        Button(
            onClick = onStartSelling,
            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .testTag("gate_start_selling_button")
        ) {
            Text(
                text = if (isPendingSeller) "View Application Status" else "Start Selling",
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth().height(48.dp)) {
            Text("Go Back")
        }
    }
}

@Composable
private fun MockupBottomNavItem(
    selected: Boolean,
    icon: ImageVector,
    label: String,
    tag: String,
    badgeCount: Int = 0,
    onClick: () -> Unit
) {
    val tint = if (selected) BrandEmerald else BrandSlate
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .testTag(tag)
    ) {
        if (badgeCount > 0) {
            BadgedBox(
                badge = {
                    Badge(containerColor = BrandOrange) {
                        Text("$badgeCount", color = Color.White)
                    }
                }
            ) {
                Icon(icon, contentDescription = label, tint = tint, modifier = Modifier.size(23.dp))
            }
        } else {
            Icon(icon, contentDescription = label, tint = tint, modifier = Modifier.size(23.dp))
        }
        Spacer(Modifier.height(2.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = tint
        )
        Spacer(Modifier.height(2.dp))
        Box(
            modifier = Modifier
                .width(24.dp)
                .height(3.dp)
                .clip(RoundedCornerShape(50))
                .background(if (selected) BrandEmerald else Color.Transparent)
        )
    }
}

@Composable
private fun MockupShopNavItem(
    selected: Boolean,
    tag: String,
    onClick: () -> Unit
) {
    val tint = if (selected) BrandEmerald else BrandSlate
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .testTag(tag)
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo_cashncarry_mark),
            contentDescription = "Shop",
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(24.dp)
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = "Shop",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = tint
        )
        Spacer(Modifier.height(2.dp))
        Box(
            modifier = Modifier
                .width(28.dp)
                .height(3.dp)
                .clip(RoundedCornerShape(50))
                .background(if (selected) BrandEmerald else Color.Transparent)
        )
    }
}

@Composable
private fun CreateSheetItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    tint: Color,
    tag: String,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = SurfaceSoft,
        border = BorderStroke(1.dp, BrandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag(tag)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(12.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(tint.copy(alpha = 0.14f))
            ) {
                Icon(icon, contentDescription = title, tint = tint, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = BrandSlate)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
            }
        }
    }
}

@Composable
private fun MissingEntityFallback(
    title: String,
    subtitle: String,
    onBack: () -> Unit
) {
    Column(
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .padding(24.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = BrandSlate
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = BrandMuted
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onBack,
            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
            modifier = Modifier
                .defaultMinSize(minHeight = 48.dp)
                .testTag("fallback_back_button")
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text("Go Back")
        }
    }
}
