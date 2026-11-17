package com.example.ui.screens

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.PictureInPictureAlt
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.core.formatCompactCount
import com.example.core.formatCountdown
import com.example.core.formatNaira
import com.example.data.model.Auction
import com.example.data.model.Livestream
import com.example.data.model.Product
import com.example.data.model.StreamMessage
import com.example.data.model.TopGifterEntry
import com.example.data.model.VirtualGift
import com.example.data.model.WalletBalance
import android.net.Uri
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.VideoView
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.components.AnimatedLiveBadge
import com.example.ui.components.MarketplaceImage
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.GoldCoin
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.PromoViolet
import com.example.ui.viewmodel.GiftAnimationBanner
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LivePlayerScreen(
    stream: Livestream,
    streamProducts: List<Product>,
    activeAuction: Auction?,
    messages: List<StreamMessage>,
    topGifters: List<TopGifterEntry>,
    virtualGifts: List<VirtualGift>,
    wallet: WalletBalance,
    usePromoCoins: Boolean,
    giftBanner: GiftAnimationBanner?,
    isFollowingSeller: Boolean,
    currentUserId: String,
    isAdmin: Boolean,
    coinsPurchasesEnabled: Boolean = false,
    onBack: () -> Unit,
    onMinimizePiP: () -> Unit,
    onToggleFollowSeller: () -> Unit,
    onSendLike: () -> Unit,
    onSendChat: (String) -> Unit,
    onModerateDeleteMessage: (String) -> Unit,
    onTogglePromoCoins: (Boolean) -> Unit,
    onSendGift: (VirtualGift) -> Unit,
    onClearGiftBanner: () -> Unit,
    onClaimPromoCoins: () -> Unit,
    onOpenWalletTopUp: () -> Unit,
    onAddToCart: (Product) -> Unit,
    onBuyNow: (Product) -> Unit,
    onOpenProductDetail: (Product) -> Unit,
    onPlaceAuctionBid: (Auction, Long) -> Unit,
    onReportStream: (String) -> Unit
) {
    BackHandler { onBack() }

    val context = LocalContext.current
    var chatInput by remember { mutableStateOf("") }
    var showGiftSheet by remember { mutableStateOf(false) }
    var showProductsSheet by remember { mutableStateOf(false) }
    var showLeaderboardSheet by remember { mutableStateOf(false) }
    var showReportDialog by remember { mutableStateOf(false) }
    var reportReason by remember { mutableStateOf("") }
    var heartPulseCount by remember { mutableLongStateOf(0L) }

    val pinnedProduct = remember(streamProducts, stream.pinnedProductId) {
        streamProducts.find { it.id == stream.pinnedProductId } ?: streamProducts.firstOrNull()
    }

    var flashRemainingMs by remember(stream.flashDealEndEpochMs) {
        mutableLongStateOf((stream.flashDealEndEpochMs - System.currentTimeMillis()).coerceAtLeast(0L))
    }
    LaunchedEffect(stream.flashDealEndEpochMs) {
        while (stream.flashDealEndEpochMs > System.currentTimeMillis()) {
            flashRemainingMs = (stream.flashDealEndEpochMs - System.currentTimeMillis()).coerceAtLeast(0L)
            delay(1000L)
        }
        flashRemainingMs = 0L
    }

    LaunchedEffect(giftBanner?.id) {
        if (giftBanner != null) {
            delay(2800L)
            onClearGiftBanner()
        }
    }

    val isHostOrAdmin = stream.sellerId == currentUserId || isAdmin

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        val isTabletWide = maxWidth >= 680.dp

        Row(modifier = Modifier.fillMaxSize()) {
            // Video Stage (9:16 mobile full screen, or left 60% stage on tablet)
            Box(
                modifier = Modifier
                    .weight(if (isTabletWide) 0.6f else 1f)
                    .fillMaxHeight()
            ) {
                MarketplaceImage(
                    imageUrlOrKey = stream.coverKey,
                    contentDescription = stream.title,
                    modifier = Modifier.fillMaxSize()
                )
                if (stream.streamUrl.isNotBlank()) {
                    var streamView by remember(stream.id, stream.streamUrl) { mutableStateOf<VideoView?>(null) }
                    DisposableEffect(stream.id, stream.streamUrl) {
                        onDispose { runCatching { streamView?.stopPlayback() } }
                    }
                    AndroidView(
                        factory = { ctx ->
                            FrameLayout(ctx).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                val vv = VideoView(ctx).apply {
                                    layoutParams = FrameLayout.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        Gravity.CENTER
                                    )
                                    setOnPreparedListener { mp ->
                                        mp.isLooping = true
                                        start()
                                    }
                                    setOnErrorListener { _, _, _ -> true }
                                    setVideoURI(Uri.parse(stream.streamUrl))
                                }
                                streamView = vv
                                addView(vv)
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.Black.copy(alpha = 0.55f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.78f)
                                )
                            )
                        )
                )

                // Top Header Controls
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.52f),
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f, fill = false)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            AnimatedLiveBadge()
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f, fill = false)) {
                                Text(
                                    text = stream.sellerName,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = Color.White,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${formatCompactCount(stream.viewerCount)} watching • ${formatCompactCount(stream.likesCount + heartPulseCount)} likes",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White.copy(alpha = 0.8f),
                                    maxLines = 1
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Surface(
                                color = if (isFollowingSeller) Color.White.copy(alpha = 0.22f) else BrandEmerald,
                                shape = RoundedCornerShape(50),
                                modifier = Modifier.clickable(onClick = onToggleFollowSeller)
                            ) {
                                Text(
                                    text = if (isFollowingSeller) "Following" else "Follow",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }

                    Spacer(Modifier.width(6.dp))

                    IconButton(
                        onClick = { showLeaderboardSheet = true },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.45f))
                    ) {
                        Icon(Icons.Default.Leaderboard, contentDescription = "Top Gifters", tint = GoldCoin)
                    }

                    Spacer(Modifier.width(4.dp))

                    IconButton(
                        onClick = onMinimizePiP,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.45f))
                            .testTag("pip_minimize_button")
                    ) {
                        Icon(Icons.Default.PictureInPictureAlt, contentDescription = "Minimize PiP", tint = Color.White)
                    }

                    Spacer(Modifier.width(4.dp))

                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.45f))
                            .testTag("close_player_button")
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Exit Stream", tint = Color.White)
                    }
                }

                // Gift Animation Banner Overlay
                androidx.compose.animation.AnimatedVisibility(
                    visible = giftBanner != null,
                    enter = fadeIn() + scaleIn(),
                    exit = fadeOut(),
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 24.dp)
                ) {
                    giftBanner?.let { banner ->
                        Surface(
                            color = BrandNavy.copy(alpha = 0.92f),
                            shape = RoundedCornerShape(22.dp),
                            border = BorderStroke(2.dp, GoldCoin)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)
                            ) {
                                Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = GoldCoin, modifier = Modifier.size(34.dp))
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = "${banner.senderName} sent ${banner.giftName}!",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${banner.coinCost} Coins • COMBO x${banner.comboCount}",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = GoldCoin
                                    )
                                }
                            }
                        }
                    }
                }

                // Flash Deal / Auction Banner
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .statusBarsPadding()
                        .padding(start = 12.dp, top = 72.dp, end = 72.dp)
                ) {
                    if (flashRemainingMs > 0L && stream.flashDealDiscountPercent > 0L) {
                        Surface(
                            color = FlashAmber,
                            shape = RoundedCornerShape(50)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                            ) {
                                Icon(Icons.Default.FlashOn, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    text = "${stream.flashDealDiscountPercent}% OFF FLASH DEAL • ${formatCountdown(flashRemainingMs)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    if (activeAuction != null && activeAuction.status == "live") {
                        val nextBid = activeAuction.currentBidNaira + activeAuction.minIncrementNaira
                        Surface(
                            color = BrandNavy.copy(alpha = 0.85f),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, BrandEmerald)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Default.Gavel, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Column(modifier = Modifier.weight(1f, fill = false)) {
                                    Text(
                                        text = "Live Auction: ${formatNaira(activeAuction.currentBidNaira)}",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = Color.White
                                    )
                                    Text(
                                        text = activeAuction.productTitle,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color(0xFFA7F3D0),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Spacer(Modifier.width(8.dp))
                                Button(
                                    onClick = { onPlaceAuctionBid(activeAuction, nextBid) },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                    shape = RoundedCornerShape(50),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.height(32.dp)
                                ) {
                                    Text("Bid ${formatNaira(nextBid)}", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                }

                // Right-Side TikTok Action Rail
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .navigationBarsPadding()
                        .padding(end = 12.dp, bottom = 140.dp)
                ) {
                    StreamActionCircle(
                        icon = Icons.Default.Favorite,
                        tint = LiveCrimson,
                        label = formatCompactCount(stream.likesCount + heartPulseCount),
                        tag = "stream_like_button",
                        onClick = {
                            heartPulseCount += 1L
                            onSendLike()
                        }
                    )
                    StreamActionCircle(
                        icon = Icons.Default.CardGiftcard,
                        tint = GoldCoin,
                        label = "Gift",
                        tag = "stream_gift_button",
                        onClick = { showGiftSheet = true }
                    )
                    StreamActionCircle(
                        icon = Icons.Default.ShoppingBag,
                        tint = BrandEmerald,
                        label = "${streamProducts.size}",
                        tag = "stream_bag_button",
                        onClick = { showProductsSheet = true }
                    )
                    StreamActionCircle(
                        icon = Icons.Default.Share,
                        tint = Color.White,
                        label = "Share",
                        tag = "stream_share_button",
                        onClick = {
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "Watch ${stream.sellerName} LIVE on Cash N Carry: https://www.cashncarryng.com/live/${stream.id}"
                                )
                            }
                            context.startActivity(Intent.createChooser(intent, "Share Livestream"))
                        }
                    )
                    StreamActionCircle(
                        icon = Icons.Default.Flag,
                        tint = Color.White.copy(alpha = 0.85f),
                        label = "Report",
                        tag = "stream_report_button",
                        onClick = { showReportDialog = true }
                    )
                }

                // Bottom Overlay: Chat + Pinned Product + Input (on phone)
                if (!isTabletWide) {
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(start = 12.dp, end = 12.dp, bottom = 10.dp)
                    ) {
                        LiveChatFeedList(
                            messages = messages,
                            canModerate = isHostOrAdmin,
                            onDeleteMessage = onModerateDeleteMessage,
                            modifier = Modifier
                                .fillMaxWidth(0.78f)
                                .height(160.dp)
                        )
                        Spacer(Modifier.height(8.dp))
                        if (pinnedProduct != null) {
                            PinnedStreamProductCard(
                                product = pinnedProduct,
                                onOpenDetail = { onOpenProductDetail(pinnedProduct) },
                                onAddToCart = { onAddToCart(pinnedProduct) },
                                onBuyNow = { onBuyNow(pinnedProduct) }
                            )
                            Spacer(Modifier.height(8.dp))
                        }
                        ChatComposerBar(
                            value = chatInput,
                            onValueChange = { chatInput = it },
                            onSend = {
                                if (chatInput.isNotBlank()) {
                                    onSendChat(chatInput)
                                    chatInput = ""
                                }
                            }
                        )
                    }
                }
            }

            // Dedicated Product + Chat Side Panel on Desktop / Wide Tablets
            if (isTabletWide) {
                Column(
                    modifier = Modifier
                        .weight(0.4f)
                        .fillMaxHeight()
                        .background(BrandNavy)
                        .padding(14.dp)
                ) {
                    Text(
                        text = "Live Shopping & Chat",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White
                    )
                    Spacer(Modifier.height(8.dp))
                    if (pinnedProduct != null) {
                        PinnedStreamProductCard(
                            product = pinnedProduct,
                            onOpenDetail = { onOpenProductDetail(pinnedProduct) },
                            onAddToCart = { onAddToCart(pinnedProduct) },
                            onBuyNow = { onBuyNow(pinnedProduct) }
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    LiveChatFeedList(
                        messages = messages,
                        canModerate = isHostOrAdmin,
                        onDeleteMessage = onModerateDeleteMessage,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    )
                    Spacer(Modifier.height(8.dp))
                    ChatComposerBar(
                        value = chatInput,
                        onValueChange = { chatInput = it },
                        onSend = {
                            if (chatInput.isNotBlank()) {
                                onSendChat(chatInput)
                                chatInput = ""
                            }
                        }
                    )
                }
            }
        }
    }

    if (showGiftSheet) {
        ModalBottomSheet(
            onDismissRequest = { showGiftSheet = false },
            containerColor = BrandNavy
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column {
                        Text("Send Virtual Gift", style = MaterialTheme.typography.titleLarge, color = Color.White)
                        Text(
                            text = "Purchased: ${wallet.purchasedCoins} • Promo Test: ${wallet.promoTestCoins}",
                            style = MaterialTheme.typography.bodySmall,
                            color = GoldCoin
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        if (coinsPurchasesEnabled) {
                            OutlinedButton(onClick = onClaimPromoCoins) {
                                Text("+250 Promo", color = PromoViolet)
                            }
                        }
                        Button(
                            onClick = {
                                showGiftSheet = false
                                onOpenWalletTopUp()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                        ) {
                            Text(if (coinsPurchasesEnabled) "Top Up" else "Wallet")
                        }
                    }
                }

                Spacer(Modifier.height(10.dp))
                Surface(
                    color = Color.White.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (usePromoCoins) "Using Promotional Test Coins" else "Using Purchased Cash Coins",
                                style = MaterialTheme.typography.titleSmall,
                                color = Color.White
                            )
                            Text(
                                text = if (usePromoCoins) "Non-redeemable test balance" else "Purchased Cash Coin balance (credits seller)",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                        Switch(checked = usePromoCoins, onCheckedChange = onTogglePromoCoins)
                    }
                }

                Spacer(Modifier.height(14.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(virtualGifts, key = { it.id }) { gift ->
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.1f)),
                            border = BorderStroke(1.dp, GoldCoin.copy(alpha = 0.45f)),
                            modifier = Modifier
                                .width(116.dp)
                                .clickable { onSendGift(gift) }
                                .testTag("send_gift_${gift.id}")
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.padding(12.dp)
                            ) {
                                Icon(Icons.Default.CardGiftcard, contentDescription = gift.name, tint = GoldCoin, modifier = Modifier.size(28.dp))
                                Spacer(Modifier.height(6.dp))
                                Text(gift.name, style = MaterialTheme.typography.labelLarge, color = Color.White, maxLines = 1)
                                Text("${gift.coinCost} Coins", style = MaterialTheme.typography.labelSmall, color = GoldCoin)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (showProductsSheet) {
        ModalBottomSheet(
            onDismissRequest = { showProductsSheet = false },
            containerColor = Color.White
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Stream Product Bag", style = MaterialTheme.typography.titleLarge, color = BrandSlate)
                Spacer(Modifier.height(10.dp))
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.height(340.dp)
                ) {
                    items(streamProducts, key = { it.id }) { prod ->
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, BrandBorder),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            modifier = Modifier.clickable {
                                showProductsSheet = false
                                onOpenProductDetail(prod)
                            }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(10.dp)
                            ) {
                                MarketplaceImage(
                                    imageUrlOrKey = prod.imageKey,
                                    contentDescription = prod.title,
                                    modifier = Modifier
                                        .size(60.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                )
                                Spacer(Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(prod.title, style = MaterialTheme.typography.titleSmall, maxLines = 1)
                                    Text(formatNaira(prod.priceNaira), style = MaterialTheme.typography.titleMedium, color = BrandEmerald, fontWeight = FontWeight.Bold)
                                }
                                Button(
                                    onClick = { onAddToCart(prod) },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                                ) {
                                    Text("Add")
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    if (showLeaderboardSheet) {
        ModalBottomSheet(
            onDismissRequest = { showLeaderboardSheet = false },
            containerColor = Color.White
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Top Gifter Leaderboard", style = MaterialTheme.typography.titleLarge, color = BrandSlate)
                Spacer(Modifier.height(10.dp))
                if (topGifters.isEmpty()) {
                    Text("No gifts sent yet in this stream. Be #1 on the leaderboard!", style = MaterialTheme.typography.bodyMedium, color = BrandMuted)
                } else {
                    topGifters.take(10).forEachIndexed { idx, entry ->
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp)
                        ) {
                            Text("#${idx + 1} ${entry.userName}", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                            Text("${entry.totalCoins} coins (${entry.giftCount})", style = MaterialTheme.typography.labelLarge, color = GoldCoin)
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (showReportDialog) {
        AlertDialog(
            onDismissRequest = { showReportDialog = false },
            title = { Text("Report Livestream") },
            text = {
                OutlinedTextField(
                    value = reportReason,
                    onValueChange = { reportReason = it },
                    label = { Text("Reason (counterfeit, spam, abuse)") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (reportReason.isNotBlank()) {
                            onReportStream(reportReason)
                            reportReason = ""
                            showReportDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LiveCrimson)
                ) {
                    Text("Submit Report")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReportDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun StreamActionCircle(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    label: String,
    tag: String,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.52f))
                .testTag(tag)
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = tint)
        }
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = Color.White)
    }
}

@Composable
private fun LiveChatFeedList(
    messages: List<StreamMessage>,
    canModerate: Boolean,
    onDeleteMessage: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(5.dp),
        modifier = modifier
    ) {
        items(messages, key = { it.id }) { msg ->
            Surface(
                color = if (msg.isSystem) BrandEmerald.copy(alpha = 0.35f) else Color.Black.copy(alpha = 0.45f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "${msg.userName}: ${msg.text}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (canModerate) {
                        Spacer(Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.DeleteOutline,
                            contentDescription = "Remove comment",
                            tint = Color.White.copy(alpha = 0.8f),
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { onDeleteMessage(msg.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PinnedStreamProductCard(
    product: Product,
    onOpenDetail: () -> Unit,
    onAddToCart: () -> Unit,
    onBuyNow: () -> Unit
) {
    Surface(
        color = Color.White.copy(alpha = 0.94f),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenDetail)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(10.dp)
        ) {
            MarketplaceImage(
                imageUrlOrKey = product.imageKey,
                contentDescription = product.title,
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(10.dp))
            )
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("PINNED ITEM", style = MaterialTheme.typography.labelSmall, color = LiveCrimson, fontWeight = FontWeight.Bold)
                Text(product.title, style = MaterialTheme.typography.titleSmall, color = BrandSlate, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(formatNaira(product.priceNaira), style = MaterialTheme.typography.labelLarge, color = BrandEmerald, fontWeight = FontWeight.Bold)
            }
            IconButton(onClick = onAddToCart) {
                Icon(Icons.Default.AddShoppingCart, contentDescription = "Add pinned item to cart", tint = BrandEmerald)
            }
            Button(
                onClick = onBuyNow,
                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                modifier = Modifier.height(36.dp)
            ) {
                Text("Buy", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun ChatComposerBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text("Say something...", color = Color.White.copy(alpha = 0.7f)) },
            singleLine = true,
            shape = RoundedCornerShape(50),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedContainerColor = Color.Black.copy(alpha = 0.55f),
                unfocusedContainerColor = Color.Black.copy(alpha = 0.55f),
                focusedBorderColor = BrandEmerald,
                unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
            ),
            modifier = Modifier
                .weight(1f)
                .testTag("stream_chat_input")
        )
        IconButton(
            onClick = onSend,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(BrandEmerald)
                .testTag("stream_chat_send")
        ) {
            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send chat", tint = Color.White)
        }
    }
}
