package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Chair
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sensors
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.core.formatCompactCount
import com.example.core.formatNaira
import com.example.data.model.Auction
import com.example.data.model.Livestream
import com.example.data.model.Product
import com.example.data.model.SellerStorefront
import com.example.data.model.ShortVideo
import com.example.data.model.UiState
import com.example.data.model.WalletBalance
import com.example.ui.components.AnimatedLiveBadge
import com.example.ui.components.LiveAuctionCard
import com.example.ui.components.MarketplaceImage
import com.example.ui.components.NigerianStateSelectorSheet
import com.example.ui.components.ProductCard
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldDark
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandOrangeBright
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.CategoryBeauty
import com.example.ui.theme.CategoryElectronics
import com.example.ui.theme.CategoryFashion
import com.example.ui.theme.CategoryGroceries
import com.example.ui.theme.CategoryHome
import com.example.ui.theme.CategoryMore
import com.example.ui.theme.GoldCoin
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SellerMagenta
import com.example.ui.theme.SurfaceSoft

private data class CategoryTileSpec(
    val title: String,
    val filterValue: String,
    val color: Color,
    val icon: ImageVector
)

private data class HeroSlideSpec(
    val badgeText: String,
    val headline: String,
    val subtitle: String,
    val primaryCta: String,
    val imageRes: Int
)

private val HERO_SLIDES = listOf(
    HeroSlideSpec(
        badgeText = "Nigeria's Social Shopping Marketplace",
        headline = "Watch live.\nDiscover. Shop.",
        subtitle = "Shop from verified sellers, discover exclusive deals, join live sales and enjoy fast delivery across Nigeria.",
        primaryCta = "Start Shopping",
        imageRes = R.drawable.img_hero_marketplace
    ),
    HeroSlideSpec(
        badgeText = "Flash Drops & Live Auctions",
        headline = "Bid in real time.\nWin hot deals.",
        subtitle = "Join Lagos & Abuja creators unboxing smartphones, fashion & beauty drops with instant Naira checkout.",
        primaryCta = "Explore Drops",
        imageRes = R.drawable.img_live_fashion
    ),
    HeroSlideSpec(
        badgeText = "Nationwide Delivery Coverage",
        headline = "Verified stores.\nDelivered fast.",
        subtitle = "Shop from verified Nigerian sellers with delivery tracking across all 36 states + FCT.",
        primaryCta = "Browse Catalog",
        imageRes = R.drawable.img_live_tech
    )
)

private val CATEGORY_TILES = listOf(
    CategoryTileSpec("Fashion", "Fashion", CategoryFashion, Icons.Default.Checkroom),
    CategoryTileSpec("Beauty", "Beauty", CategoryBeauty, Icons.Default.Spa),
    CategoryTileSpec("Electronics", "Electronics", CategoryElectronics, Icons.Default.Headphones),
    CategoryTileSpec("Home & Living", "Home & Living", CategoryHome, Icons.Default.Chair),
    CategoryTileSpec("Groceries", "Groceries", CategoryGroceries, Icons.Default.ShoppingBasket),
    CategoryTileSpec("More Categories", "All", CategoryMore, Icons.Default.GridView)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeMarketplaceScreen(
    productsState: UiState<List<Product>>,
    sellersState: UiState<List<SellerStorefront>>,
    livestreamsState: UiState<List<Livestream>>,
    shortVideosState: UiState<List<ShortVideo>>,
    selectedState: String,
    selectedCategory: String,
    searchQuery: String,
    cartCount: Int,
    wishlistProductIds: Set<String>,
    compareProductIds: Set<String>,
    recentProductIds: List<String>,
    wallet: WalletBalance,
    isAuthenticated: Boolean,
    isApprovedSeller: Boolean,
    isPendingSeller: Boolean,
    isAdmin: Boolean,
    onSearchChange: (String) -> Unit,
    onTriggerSearch: () -> Unit,
    onSelectCategory: (String) -> Unit,
    onUpdateNigerianState: (String) -> Unit,
    onOpenProduct: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit,
    onOpenLivestream: (String) -> Unit,
    onOpenLiveHub: () -> Unit,
    onOpenVideoFeed: () -> Unit,
    onOpenDiscover: () -> Unit,
    onOpenStorefront: (String) -> Unit,
    onOpenCart: () -> Unit,
    onOpenWallet: () -> Unit,
    onOpenSellerCentre: () -> Unit,
    onOpenSellerOnboarding: () -> Unit,
    onOpenAdminConsole: () -> Unit,
    onOpenProfile: () -> Unit,
    onRetryHome: () -> Unit,
    liveAuctions: List<Auction> = emptyList(),
    currentUserId: String = "",
    onPlaceAuctionBid: (Auction, Long) -> Unit = { _, _ -> },
    onClaimAuctionWin: (Auction) -> Unit = {}
) {
    var showStateSheet by remember { mutableStateOf(false) }
    var showQuickMenu by remember { mutableStateOf(false) }

    val allProducts = (productsState as? UiState.Success)?.data ?: emptyList()
    val filteredProducts = remember(allProducts, selectedCategory, searchQuery) {
        allProducts.filter { p ->
            val catOk = selectedCategory == "All" || p.category.equals(selectedCategory, ignoreCase = true)
            val qOk = searchQuery.isBlank() ||
                p.title.contains(searchQuery, ignoreCase = true) ||
                p.brand.contains(searchQuery, ignoreCase = true) ||
                p.category.contains(searchQuery, ignoreCase = true)
            catOk && qOk
        }
    }
    val popularProducts = remember(allProducts) {
        allProducts.sortedByDescending { it.rating * 10 + it.reviewCount }.take(8)
    }
    val recentlyViewed = remember(allProducts, recentProductIds) {
        recentProductIds.mapNotNull { id -> allProducts.find { it.id == id } }
    }
    val livestreams = (livestreamsState as? UiState.Success)?.data ?: emptyList()
    val liveNowCount = remember(livestreams) { livestreams.count { it.status == "live" } }
    val sellers = (sellersState as? UiState.Success)?.data ?: emptyList()
    val videos = (shortVideosState as? UiState.Success)?.data ?: emptyList()

    val heroPagerState = rememberPagerState(pageCount = { HERO_SLIDES.size })

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentPadding = PaddingValues(bottom = 28.dp)
    ) {
        // 1. Brand Top Header + Search Pill + Live Ticker Strip
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    IconButton(
                        onClick = { showQuickMenu = true },
                        modifier = Modifier
                            .size(40.dp)
                            .testTag("home_menu_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Marketplace Menu",
                            tint = BrandSlate
                        )
                    }

                    Image(
                        painter = painterResource(id = R.drawable.logo_cashncarry_mark),
                        contentDescription = "Cash N Carry Logo",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.size(32.dp)
                    )

                    Spacer(Modifier.width(6.dp))

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { showStateSheet = true }
                            .testTag("state_selector_button")
                    ) {
                        Text(
                            text = "Cash N Carry",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = BrandEmerald,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Nigeria • $selectedState",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = BrandOrange,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = "Change delivery state",
                                tint = BrandOrange,
                                modifier = Modifier.size(12.dp)
                            )
                        }
                    }

                    if (isAdmin) {
                        IconButton(
                            onClick = onOpenAdminConsole,
                            modifier = Modifier
                                .size(38.dp)
                                .testTag("admin_console_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.AdminPanelSettings,
                                contentDescription = "Admin Console",
                                tint = BrandEmeraldDark
                            )
                        }
                    }

                    if (isApprovedSeller) {
                        IconButton(
                            onClick = onOpenSellerCentre,
                            modifier = Modifier
                                .size(38.dp)
                                .testTag("seller_centre_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Storefront,
                                contentDescription = "Seller Centre",
                                tint = BrandSlate
                            )
                        }
                    }

                    IconButton(
                        onClick = onOpenWallet,
                        modifier = Modifier
                            .size(38.dp)
                            .testTag("wallet_button")
                    ) {
                        BadgedBox(
                            badge = {
                                if (wallet.purchasedCoins + wallet.promoTestCoins > 0) {
                                    Badge(containerColor = BrandOrange)
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.AccountBalanceWallet,
                                contentDescription = "Coin Wallet",
                                tint = BrandSlate
                            )
                        }
                    }

                    IconButton(
                        onClick = onOpenCart,
                        modifier = Modifier
                            .size(40.dp)
                            .testTag("cart_button")
                    ) {
                        BadgedBox(
                            badge = {
                                if (cartCount > 0) {
                                    Badge(containerColor = BrandOrange) {
                                        Text("$cartCount", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.ShoppingCart,
                                contentDescription = "Shopping Cart",
                                tint = BrandSlate
                            )
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Sleek Pill Search Bar (matching mockup rounded pill)
                Surface(
                    shape = RoundedCornerShape(50),
                    color = SurfaceSoft,
                    border = BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(start = 14.dp, end = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = BrandMuted,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Box(
                            contentAlignment = Alignment.CenterStart,
                            modifier = Modifier.weight(1f)
                        ) {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "Search products, sellers...",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = BrandMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = onSearchChange,
                                singleLine = true,
                                textStyle = MaterialTheme.typography.bodyMedium.copy(color = BrandSlate),
                                cursorBrush = SolidColor(BrandEmerald),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("home_search_input")
                            )
                        }
                        IconButton(
                            onClick = onTriggerSearch,
                            modifier = Modifier
                                .size(36.dp)
                                .testTag("ai_search_trigger")
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = "AI Search & Recommendations",
                                tint = BrandEmerald,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // Predictive search suggestions
                if (searchQuery.isNotBlank()) {
                    val predictions = remember(allProducts, searchQuery) {
                        allProducts.filter { it.title.contains(searchQuery, ignoreCase = true) }.take(3)
                    }
                    if (predictions.isNotEmpty()) {
                        Surface(
                            color = SurfaceSoft,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, BrandBorder),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 6.dp)
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                predictions.forEach { pred ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { onOpenProduct(pred) }
                                            .padding(horizontal = 8.dp, vertical = 6.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Search,
                                            contentDescription = null,
                                            tint = BrandMuted,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Text(
                                            text = pred.title,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = BrandSlate,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Text(
                                            text = formatNaira(pred.priceNaira),
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = BrandEmerald
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(10.dp))

                // Sub-Header Live Action Strip (matches mockup: green pill left + red Live Now right)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Surface(
                        color = BrandEmeraldDark,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .clickable(onClick = onOpenLiveHub)
                            .testTag("watch_live_hot_deals_pill")
                    ) {
                        Text(
                            text = "Watch Live for Hot Deals",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .clickable(onClick = onOpenLiveHub)
                            .padding(horizontal = 8.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Sensors,
                            contentDescription = "Live broadcasts",
                            tint = LiveCrimson,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(5.dp))
                        Text(
                            text = if (liveNowCount > 0) "$liveNowCount Live Now ›" else "No one is live ›",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = BrandSlate
                        )
                    }
                }
            }
        }

        // 2. Hero Carousel Banner ("Watch live. Discover. Shop.") + Dots
        item {
            Column(modifier = Modifier.fillMaxWidth()) {
                HorizontalPager(
                    state = heroPagerState,
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    pageSpacing = 12.dp
                ) { page ->
                    val slide = HERO_SLIDES[page]
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(216.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(BrandEmeraldDark, BrandEmerald)
                                )
                            )
                            .clickable(onClick = onOpenLiveHub)
                    ) {
                        Image(
                            painter = painterResource(id = slide.imageRes),
                            contentDescription = slide.headline,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxHeight()
                                .width(190.dp)
                                .align(Alignment.CenterEnd)
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.horizontalGradient(
                                        0.0f to BrandEmeraldDark,
                                        0.55f to BrandEmerald.copy(alpha = 0.94f),
                                        0.82f to BrandEmerald.copy(alpha = 0.45f),
                                        1.0f to Color.Transparent
                                    )
                                )
                        )
                        Column(
                            verticalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            Surface(
                                color = Color.White.copy(alpha = 0.16f),
                                shape = RoundedCornerShape(50)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    NigerianMiniFlag()
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        text = slide.badgeText,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            Column(modifier = Modifier.fillMaxWidth(0.76f)) {
                                Text(
                                    text = slide.headline,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.ExtraBold,
                                    lineHeight = 28.sp,
                                    color = Color.White
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = slide.subtitle,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White.copy(alpha = 0.88f),
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Button(
                                    onClick = onTriggerSearch,
                                    shape = RoundedCornerShape(50),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = BrandOrange,
                                        contentColor = Color.White
                                    ),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Text(
                                        text = slide.primaryCta,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }

                                Surface(
                                    color = BrandEmeraldDark.copy(alpha = 0.85f),
                                    shape = RoundedCornerShape(50),
                                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
                                    modifier = Modifier
                                        .height(36.dp)
                                        .clickable(onClick = onOpenLiveHub)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 12.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.PlayArrow,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            text = "Watch Live",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(10.dp))

                // Pager Dots
                Row(
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    repeat(HERO_SLIDES.size) { idx ->
                        val active = heroPagerState.currentPage == idx
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 4.dp)
                                .size(if (active) 8.dp else 6.dp)
                                .clip(CircleShape)
                                .background(if (active) BrandEmerald else BrandBorder)
                        )
                    }
                }
            }
        }

        // 3. Twin Promo Cards Row ("Flash deals" Orange + "Shop local" White with Nigerian Flag)
        item {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 14.dp)
            ) {
                // Left: Vibrant Orange Flash Deals card
                Card(
                    shape = RoundedCornerShape(18.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(104.dp)
                        .clickable(onClick = onTriggerSearch)
                        .testTag("promo_flash_deals_card")
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.linearGradient(
                                    listOf(BrandOrange, BrandOrangeBright)
                                )
                            )
                            .padding(14.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Bolt,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.28f),
                            modifier = Modifier
                                .size(64.dp)
                                .align(Alignment.CenterEnd)
                        )
                        Column(
                            verticalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Column {
                                Text(
                                    text = "Flash deals",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color.White
                                )
                                Text(
                                    text = "Limited time. Big savings.",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White.copy(alpha = 0.92f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Text(
                                text = "Shop now →",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                // Right: Shop local card with Nigerian flag
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, BrandBorder),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(104.dp)
                        .clickable(onClick = onTriggerSearch)
                        .testTag("promo_shop_local_card")
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                    ) {
                        Column(
                            verticalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                        ) {
                            Text(
                                text = "Shop local.\nFind something special.",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = BrandSlate,
                                lineHeight = 16.sp,
                                maxLines = 3
                            )
                            Text(
                                text = "Explore sellers →",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = BrandEmerald
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                        NigerianFlagBadge()
                    }
                }
            }
        }

        // 4. "Shop by category" 2x3 Vibrant Colored Tiles
        item {
            SectionHeader(
                title = "Shop by category",
                actionLabel = "See all categories →",
                onAction = onTriggerSearch
            )
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp)
            ) {
                CATEGORY_TILES.chunked(3).forEach { rowTiles ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        rowTiles.forEach { tile ->
                            val isSelected = tile.filterValue != "All" &&
                                selectedCategory.equals(tile.filterValue, ignoreCase = true)
                            Surface(
                                color = tile.color,
                                shape = RoundedCornerShape(14.dp),
                                border = if (isSelected) BorderStroke(2.5.dp, BrandSlate) else null,
                                shadowElevation = 2.dp,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(54.dp)
                                    .clickable {
                                        if (tile.filterValue == "All") {
                                            onSelectCategory("All")
                                            onTriggerSearch()
                                        } else {
                                            onSelectCategory(
                                                if (isSelected) "All" else tile.filterValue
                                            )
                                        }
                                    }
                                    .testTag("category_tile_${tile.title.lowercase().replace(" ", "_")}")
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Start,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(horizontal = 9.dp)
                                ) {
                                    Icon(
                                        imageVector = tile.icon,
                                        contentDescription = tile.title,
                                        tint = Color.White,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        text = tile.title,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        maxLines = 2,
                                        lineHeight = 13.sp,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. "Featured sellers" (Colored header + monogram + 2 product thumbnails)
        when (sellersState) {
            is UiState.Loading -> Unit
            is UiState.Error -> {
                item {
                    SectionHeader(
                        title = "Featured sellers",
                        actionLabel = "Retry",
                        onAction = onRetryHome
                    )
                    HomeSectionMessageBanner(
                        message = sellersState.message,
                        isError = true,
                        onRetry = onRetryHome
                    )
                }
            }
            is UiState.Success -> {
                if (sellers.isEmpty()) {
                    item {
                        SectionHeader(
                            title = "Featured sellers",
                            actionLabel = if (isApprovedSeller) "Seller Centre →" else "Become a Seller →",
                            onAction = if (isApprovedSeller) onOpenSellerCentre else onOpenSellerOnboarding
                        )
                        HomeSectionMessageBanner(
                            message = "No sellers available yet.",
                            isError = false,
                            testTag = "home_sellers_empty"
                        )
                    }
                } else {
                    item {
                        SectionHeader(
                            title = "Featured sellers",
                            actionLabel = "See all sellers →",
                            onAction = onOpenDiscover
                        )
                        val headerColors = listOf(BrandOrange, SellerMagenta, BrandEmerald)
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 14.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            itemsIndexed(sellers, key = { _, s -> s.id }) { idx, seller ->
                                val headerBg = headerColors[idx % headerColors.size]
                                val sellerThumbs = remember(allProducts, seller) {
                                    val matching = allProducts.filter { it.sellerId == seller.ownerId }
                                        .map { it.imageKey }
                                        .distinct()
                                    when {
                                        matching.size >= 2 -> matching.take(2)
                                        matching.size == 1 -> listOf(matching[0], seller.bannerKey)
                                        else -> listOf(seller.logoKey, seller.bannerKey)
                                    }
                                }
                                val initials = remember(seller.businessName) {
                                    seller.businessName.split(" ")
                                        .filter { it.isNotBlank() }
                                        .take(2)
                                        .joinToString("") { it.first().uppercaseChar().toString() }
                                        .ifBlank { "CN" }
                                }

                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    border = BorderStroke(1.dp, BrandBorder),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                    modifier = Modifier
                                        .width(178.dp)
                                        .clickable { onOpenStorefront(seller.ownerId) }
                                        .testTag("featured_seller_${seller.id}")
                                ) {
                                    Column {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(headerBg)
                                                .padding(10.dp)
                                        ) {
                                            Box(
                                                contentAlignment = Alignment.Center,
                                                modifier = Modifier
                                                    .size(32.dp)
                                                    .clip(CircleShape)
                                                    .background(Color.White)
                                            ) {
                                                Text(
                                                    text = initials,
                                                    style = MaterialTheme.typography.labelMedium,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = headerBg
                                                )
                                            }
                                            Spacer(Modifier.width(8.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Text(
                                                        text = seller.businessName,
                                                        style = MaterialTheme.typography.labelLarge,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color.White,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis,
                                                        modifier = Modifier.weight(1f, fill = false)
                                                    )
                                                    if (seller.verified) {
                                                        Spacer(Modifier.width(3.dp))
                                                        Icon(
                                                            imageVector = Icons.Default.Verified,
                                                            contentDescription = "Verified",
                                                            tint = Color.White,
                                                            modifier = Modifier.size(12.dp)
                                                        )
                                                    }
                                                }
                                                Text(
                                                    text = seller.tagline.ifBlank { "${seller.stateLocation} storefront" },
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Color.White.copy(alpha = 0.88f),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }

                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(8.dp)
                                        ) {
                                            sellerThumbs.forEach { key ->
                                                MarketplaceImage(
                                                    imageUrlOrKey = key,
                                                    contentDescription = seller.businessName,
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .height(62.dp)
                                                        .clip(RoundedCornerShape(10.dp))
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 6. "Popular products" Carousel (-20% orange discount pill + heart overlay)
        if (popularProducts.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Popular products",
                    actionLabel = "See all →",
                    onAction = onTriggerSearch
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(popularProducts, key = { "pop_${it.id}" }) { product ->
                        val discountPct = if (product.originalPriceNaira > product.priceNaira) {
                            (((product.originalPriceNaira - product.priceNaira) * 100) / product.originalPriceNaira)
                                .toInt().coerceIn(5, 80)
                        } else 0
                        val isSaved = wishlistProductIds.contains(product.id)

                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, BrandBorder),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                            modifier = Modifier
                                .width(150.dp)
                                .clickable { onOpenProduct(product) }
                        ) {
                            Column {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(106.dp)
                                ) {
                                    MarketplaceImage(
                                        imageUrlOrKey = product.imageKey,
                                        contentDescription = product.title,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                    if (discountPct > 0) {
                                        Surface(
                                            color = BrandOrange,
                                            shape = RoundedCornerShape(50),
                                            modifier = Modifier
                                                .align(Alignment.TopStart)
                                                .padding(6.dp)
                                        ) {
                                            Text(
                                                text = "-$discountPct%",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Surface(
                                        shape = CircleShape,
                                        color = Color.White.copy(alpha = 0.92f),
                                        shadowElevation = 2.dp,
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .padding(6.dp)
                                            .size(28.dp)
                                            .clickable { onToggleWishlist(product) }
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = if (isSaved) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                                contentDescription = "Save product",
                                                tint = if (isSaved) LiveCrimson else BrandSlate,
                                                modifier = Modifier.size(15.dp)
                                            )
                                        }
                                    }
                                }
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(
                                        text = product.title,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = BrandSlate,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(Modifier.height(3.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = formatNaira(product.priceNaira),
                                            style = MaterialTheme.typography.labelLarge,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = BrandEmerald
                                        )
                                        if (product.originalPriceNaira > product.priceNaira) {
                                            Spacer(Modifier.width(4.dp))
                                            Text(
                                                text = formatNaira(product.originalPriceNaira),
                                                style = MaterialTheme.typography.labelSmall,
                                                color = BrandMuted,
                                                textDecoration = TextDecoration.LineThrough,
                                                maxLines = 1
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 7. "Live shopping" Immersive Deep-Green Cards (matches bottom banner of mockup)
        if (livestreams.isNotEmpty()) {
            item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = 14.dp, top = 18.dp, bottom = 8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Sensors,
                            contentDescription = "Live shopping",
                            tint = LiveCrimson,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "Live shopping",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = BrandSlate
                        )
                    }
                    Text(
                        text = "View all live →",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = BrandEmerald,
                        modifier = Modifier.clickable(onClick = onOpenLiveHub)
                    )
                }

                LazyRow(
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(livestreams, key = { it.id }) { stream ->
                        val sellerInitials = remember(stream.sellerName) {
                            stream.sellerName.split(" ")
                                .filter { it.isNotBlank() }
                                .take(2)
                                .joinToString("") { it.first().uppercaseChar().toString() }
                                .ifBlank { "LV" }
                        }

                        Box(
                            modifier = Modifier
                                .width(326.dp)
                                .height(142.dp)
                                .clip(RoundedCornerShape(18.dp))
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(BrandEmeraldDark, BrandEmerald)
                                    )
                                )
                                .clickable { onOpenLivestream(stream.id) }
                                .testTag("livestream_card_${stream.id}")
                        ) {
                            MarketplaceImage(
                                imageUrlOrKey = stream.coverKey,
                                contentDescription = stream.title,
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .width(150.dp)
                                    .align(Alignment.CenterEnd)
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.horizontalGradient(
                                            0.0f to BrandEmeraldDark,
                                            0.55f to BrandEmerald.copy(alpha = 0.92f),
                                            1.0f to Color.Transparent
                                        )
                                    )
                            )
                            Column(
                                verticalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(14.dp)
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    AnimatedLiveBadge(text = if (stream.status == "live") "LIVE" else "SOON")
                                    Surface(
                                        color = Color.Black.copy(alpha = 0.55f),
                                        shape = RoundedCornerShape(50)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Visibility,
                                                contentDescription = "Viewers",
                                                tint = Color.White,
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Spacer(Modifier.width(4.dp))
                                            Text(
                                                text = formatCompactCount(stream.viewerCount),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }

                                Text(
                                    text = stream.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.fillMaxWidth(0.74f)
                                )

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFFDE047))
                                    ) {
                                        Text(
                                            text = sellerInitials,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = BrandSlate
                                        )
                                    }
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        text = stream.sellerName,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else if (livestreamsState is UiState.Success) {
            item {
                SectionHeader(
                    title = "Live shopping",
                    actionLabel = "Live Hub →",
                    onAction = onOpenLiveHub
                )
                HomeSectionMessageBanner(
                    message = "No one is live right now.",
                    isError = false,
                    testTag = "home_livestreams_empty"
                )
            }
        } else if (livestreamsState is UiState.Error) {
            item {
                SectionHeader(
                    title = "Live shopping",
                    actionLabel = "Retry",
                    onAction = onRetryHome
                )
                HomeSectionMessageBanner(
                    message = livestreamsState.message,
                    isError = true,
                    onRetry = onRetryHome
                )
            }
        }

        // 7b. Live Auctions with real-time highest-bid & countdown sync
        if (liveAuctions.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Live Auctions",
                    actionLabel = "All Auctions →",
                    onAction = onOpenLiveHub
                )
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(horizontal = 14.dp)
                ) {
                    liveAuctions.take(2).forEach { auction ->
                        LiveAuctionCard(
                            auctionId = auction.id,
                            currentUserId = currentUserId,
                            onInspect = { onOpenLiveHub() },
                            onQuickBid = { liveAuc, nextBid -> onPlaceAuctionBid(liveAuc, nextBid) },
                            onClaimWin = { liveAuc -> onClaimAuctionWin(liveAuc) }
                        )
                    }
                }
            }
        }

        // 8. Short-Form Shoppable Video Feed Preview
        if (videos.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Shoppable Reels",
                    actionLabel = "Watch Feed →",
                    onAction = onOpenVideoFeed
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(videos, key = { it.id }) { vid ->
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            modifier = Modifier
                                .width(152.dp)
                                .height(206.dp)
                                .clickable(onClick = onOpenVideoFeed)
                        ) {
                            Box(modifier = Modifier.fillMaxSize()) {
                                MarketplaceImage(
                                    imageUrlOrKey = vid.coverKey.ifBlank { vid.productImageUrl },
                                    contentDescription = vid.title,
                                    modifier = Modifier.fillMaxSize()
                                )
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                                            )
                                        )
                                )
                                Icon(
                                    imageVector = Icons.Default.PlayCircle,
                                    contentDescription = "Play short video",
                                    tint = Color.White.copy(alpha = 0.92f),
                                    modifier = Modifier
                                        .align(Alignment.Center)
                                        .size(38.dp)
                                )
                                Column(
                                    modifier = Modifier
                                        .align(Alignment.BottomStart)
                                        .padding(10.dp)
                                ) {
                                    Text(
                                        text = vid.title,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Color.White,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = formatNaira(vid.productPriceNaira),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFFED7AA)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else if (shortVideosState is UiState.Success) {
            item {
                SectionHeader(
                    title = "Shoppable Reels",
                    actionLabel = "Open For You →",
                    onAction = onOpenVideoFeed
                )
                HomeSectionMessageBanner(
                    message = "No videos have been posted yet.",
                    isError = false,
                    testTag = "home_videos_empty"
                )
            }
        } else if (shortVideosState is UiState.Error) {
            item {
                SectionHeader(
                    title = "Shoppable Reels",
                    actionLabel = "Retry",
                    onAction = onRetryHome
                )
                HomeSectionMessageBanner(
                    message = shortVideosState.message,
                    isError = true,
                    onRetry = onRetryHome
                )
            }
        }

        // 9. Recently Viewed Products
        if (recentlyViewed.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Recently Viewed",
                    actionLabel = "Discover →",
                    onAction = onTriggerSearch
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(recentlyViewed, key = { "recent_${it.id}" }) { product ->
                        ProductCard(
                            product = product,
                            isWishlisted = wishlistProductIds.contains(product.id),
                            isCompared = compareProductIds.contains(product.id),
                            onClick = { onOpenProduct(product) },
                            onAddToCart = { onAddToCart(product) },
                            onToggleWishlist = { onToggleWishlist(product) },
                            onToggleCompare = { onToggleCompare(product) },
                            onWatchLive = onOpenLivestream,
                            modifier = Modifier.width(174.dp)
                        )
                    }
                }
            }
        }

        // 10. All Trending & Filtered Marketplace Picks
        item {
            SectionHeader(
                title = if (selectedCategory == "All") "Trending & Best-Selling" else "$selectedCategory Picks",
                actionLabel = "Filter & Compare →",
                onAction = onTriggerSearch
            )
        }

        when (productsState) {
            is UiState.Loading -> {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = BrandEmerald)
                    }
                }
            }
            is UiState.Error -> {
                item {
                    HomeSectionMessageBanner(
                        message = productsState.message,
                        isError = true,
                        onRetry = onRetryHome,
                        testTag = "home_products_error"
                    )
                }
            }
            is UiState.Success -> {
                if (allProducts.isEmpty()) {
                    item {
                        HomeSectionMessageBanner(
                            message = "No products available yet. Check back soon for new arrivals.",
                            isError = false,
                            testTag = "home_products_empty"
                        )
                    }
                } else if (filteredProducts.isEmpty()) {
                    item {
                        HomeSectionMessageBanner(
                            message = "No products match \"$searchQuery\" in $selectedCategory.",
                            isError = false,
                            actionLabel = "Show All",
                            onRetry = {
                                onSelectCategory("All")
                                onSearchChange("")
                            }
                        )
                    }
                } else {
                    val rows = filteredProducts.chunked(2)
                    items(rows) { rowItems ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            rowItems.forEach { product ->
                                ProductCard(
                                    product = product,
                                    isWishlisted = wishlistProductIds.contains(product.id),
                                    isCompared = compareProductIds.contains(product.id),
                                    onClick = { onOpenProduct(product) },
                                    onAddToCart = { onAddToCart(product) },
                                    onToggleWishlist = { onToggleWishlist(product) },
                                    onToggleCompare = { onToggleCompare(product) },
                                    onWatchLive = onOpenLivestream,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            if (rowItems.size == 1) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }
    }

    if (showStateSheet) {
        NigerianStateSelectorSheet(
            selectedState = selectedState,
            onSelectState = onUpdateNigerianState,
            onDismiss = { showStateSheet = false }
        )
    }

    if (showQuickMenu) {
        ModalBottomSheet(
            onDismissRequest = { showQuickMenu = false },
            containerColor = Color.White
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.logo_cashncarry_wordmark),
                    contentDescription = "Cash N Carry",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .height(36.dp)
                        .width(172.dp)
                )
                Spacer(Modifier.height(4.dp))
                QuickMenuActionRow(
                    icon = Icons.Default.LocationOn,
                    title = "Delivery Location: $selectedState",
                    subtitle = "Tap to switch Nigerian state",
                    tint = BrandOrange
                ) {
                    showQuickMenu = false
                    showStateSheet = true
                }
                QuickMenuActionRow(
                    icon = Icons.Default.Person,
                    title = if (isAuthenticated) "My Profile & Account" else "Sign In / Buyer Account",
                    subtitle = if (isApprovedSeller) "Edit profile & manage uploaded videos" else "Manage profile, saved items & seller status",
                    tint = BrandEmerald
                ) {
                    showQuickMenu = false
                    onOpenProfile()
                }
                when {
                    isApprovedSeller -> {
                        QuickMenuActionRow(
                            icon = Icons.Default.Storefront,
                            title = "Seller Centre",
                            subtitle = "Manage your storefront, products & auctions",
                            tint = BrandEmeraldDark
                        ) {
                            showQuickMenu = false
                            onOpenSellerCentre()
                        }
                    }
                    isPendingSeller -> {
                        QuickMenuActionRow(
                            icon = Icons.Default.Storefront,
                            title = "Seller Verification Pending",
                            subtitle = "Your seller account is awaiting approval.",
                            tint = BrandOrange
                        ) {
                            showQuickMenu = false
                            onOpenSellerOnboarding()
                        }
                    }
                    else -> {
                        QuickMenuActionRow(
                            icon = Icons.Default.Storefront,
                            title = "Become a Seller",
                            subtitle = "Start Selling on Cash N Carry Nigeria",
                            tint = BrandEmeraldDark
                        ) {
                            showQuickMenu = false
                            onOpenSellerOnboarding()
                        }
                    }
                }
                QuickMenuActionRow(
                    icon = Icons.Default.AccountBalanceWallet,
                    title = "Cash Coin Wallet (${wallet.purchasedCoins + wallet.promoTestCoins} Coins)",
                    subtitle = "View coin balance, gifts & transaction ledger",
                    tint = GoldCoin
                ) {
                    showQuickMenu = false
                    onOpenWallet()
                }
                QuickMenuActionRow(
                    icon = Icons.Default.Sensors,
                    title = "Live Hub & Real-Time Auctions",
                    subtitle = "Browse live sellers & place Naira bids",
                    tint = LiveCrimson
                ) {
                    showQuickMenu = false
                    onOpenLiveHub()
                }
                if (isAdmin) {
                    QuickMenuActionRow(
                        icon = Icons.Default.AdminPanelSettings,
                        title = "Admin Console",
                        subtitle = "Verify sellers, manage gifts & disputes",
                        tint = BrandSlate
                    ) {
                        showQuickMenu = false
                        onOpenAdminConsole()
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun QuickMenuActionRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    tint: Color,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = SurfaceSoft,
        border = BorderStroke(1.dp, BrandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
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
private fun NigerianMiniFlag() {
    Row(
        modifier = Modifier
            .size(width = 18.dp, height = 12.dp)
            .clip(RoundedCornerShape(2.dp))
    ) {
        Box(modifier = Modifier.weight(1f).fillMaxHeight().background(Color(0xFF008751)))
        Box(modifier = Modifier.weight(1f).fillMaxHeight().background(Color.White))
        Box(modifier = Modifier.weight(1f).fillMaxHeight().background(Color(0xFF008751)))
    }
}

@Composable
private fun NigerianFlagBadge() {
    Surface(
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(1.dp, BrandBorder),
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .size(width = 48.dp, height = 34.dp)
        ) {
            Box(modifier = Modifier.weight(1f).fillMaxHeight().background(Color(0xFF008751)))
            Box(modifier = Modifier.weight(1f).fillMaxHeight().background(Color.White))
            Box(modifier = Modifier.weight(1f).fillMaxHeight().background(Color(0xFF008751)))
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 14.dp, end = 14.dp, top = 16.dp, bottom = 8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.ExtraBold,
            color = BrandSlate
        )
        Text(
            text = actionLabel,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = BrandEmerald,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onAction)
                .padding(horizontal = 4.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun HomeSectionMessageBanner(
    message: String,
    isError: Boolean,
    onRetry: (() -> Unit)? = null,
    actionLabel: String = "Retry",
    testTag: String? = null
) {
    Surface(
        color = if (isError) LiveCrimson.copy(alpha = 0.08f) else SurfaceSoft,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, if (isError) LiveCrimson.copy(alpha = 0.3f) else BrandBorder),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp)
            .let { if (testTag != null) it.testTag(testTag) else it }
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = if (isError) LiveCrimson else BrandMuted,
                modifier = Modifier.weight(1f)
            )
            if (onRetry != null) {
                Spacer(Modifier.width(10.dp))
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    modifier = Modifier.height(36.dp)
                ) {
                    Text(actionLabel, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
