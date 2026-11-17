package com.example.ui.components

import androidx.compose.animation.animateColor
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.core.NIGERIAN_STATES
import com.example.core.formatCompactCount
import com.example.core.formatCountdown
import com.example.core.formatNaira
import com.example.data.model.Livestream
import com.example.data.model.Product
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft
import kotlinx.coroutines.delay
import coil.compose.AsyncImage

fun resolveDrawableRes(key: String): Int? {
    return when (key) {
        "live_fashion" -> R.drawable.img_live_fashion
        "live_tech" -> R.drawable.img_live_tech
        "seller_banner" -> R.drawable.img_seller_banner
        "hero_marketplace" -> R.drawable.img_hero_marketplace
        else -> null
    }
}

@Composable
fun MarketplaceImage(
    imageUrlOrKey: String,
    contentDescription: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    placeholderIcon: ImageVector = Icons.Default.Image
) {
    val trimmed = imageUrlOrKey.trim()
    val localRes = resolveDrawableRes(trimmed)
    when {
        trimmed.startsWith("https://") || trimmed.startsWith("http://") -> {
            AsyncImage(
                model = trimmed,
                contentDescription = contentDescription,
                contentScale = contentScale,
                modifier = modifier
            )
        }
        localRes != null -> {
            Image(
                painter = painterResource(id = localRes),
                contentDescription = contentDescription,
                contentScale = contentScale,
                modifier = modifier
            )
        }
        else -> {
            Box(
                contentAlignment = Alignment.Center,
                modifier = modifier.background(SurfaceSoft)
            ) {
                Icon(
                    imageVector = placeholderIcon,
                    contentDescription = contentDescription,
                    tint = BrandMuted.copy(alpha = 0.6f),
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
fun AnimatedLiveBadge(
    modifier: Modifier = Modifier,
    text: String = "LIVE"
) {
    val transition = rememberInfiniteTransition(label = "live_pulse")
    val badgeColor by transition.animateColor(
        initialValue = LiveCrimson,
        targetValue = Color(0xFFBE123C),
        animationSpec = infiniteRepeatable(
            animation = tween(750),
            repeatMode = RepeatMode.Reverse
        ),
        label = "live_color"
    )
    Surface(
        color = badgeColor,
        shape = RoundedCornerShape(50),
        modifier = modifier
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(Color.White)
            )
            Spacer(Modifier.width(4.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun ProductCard(
    product: Product,
    isWishlisted: Boolean,
    isCompared: Boolean,
    onClick: () -> Unit,
    onAddToCart: () -> Unit,
    onToggleWishlist: () -> Unit,
    onToggleCompare: () -> Unit,
    onWatchLive: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var remainingMs by remember(product.flashDealEndEpochMs) {
        mutableLongStateOf((product.flashDealEndEpochMs - System.currentTimeMillis()).coerceAtLeast(0L))
    }
    LaunchedEffect(product.isFlashDeal, product.flashDealEndEpochMs) {
        while (product.isFlashDeal && product.flashDealEndEpochMs > System.currentTimeMillis()) {
            remainingMs = (product.flashDealEndEpochMs - System.currentTimeMillis()).coerceAtLeast(0L)
            delay(1000L)
        }
    }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, BrandBorder),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag("product_card_${product.id}")
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(145.dp)
            ) {
                MarketplaceImage(
                    imageUrlOrKey = product.imageKey,
                    contentDescription = product.title,
                    modifier = Modifier.fillMaxSize()
                )
                if (product.liveStreamId.isNotBlank()) {
                    AnimatedLiveBadge(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                            .clickable { onWatchLive(product.liveStreamId) }
                    )
                } else if (product.isFlashDeal && remainingMs > 0L) {
                    Surface(
                        color = FlashAmber,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.FlashOn,
                                contentDescription = "Flash Deal",
                                tint = Color.White,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(Modifier.width(2.dp))
                            Text(
                                text = formatCountdown(remainingMs),
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White
                            )
                        }
                    }
                }

                IconButton(
                    onClick = onToggleWishlist,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.9f))
                ) {
                    Icon(
                        imageVector = if (isWishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Save to wishlist",
                        tint = if (isWishlisted) LiveCrimson else BrandSlate,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = product.brand.ifBlank { product.category }.ifBlank { "Marketplace" }.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = BrandEmerald,
                    maxLines = 1
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = product.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = BrandSlate,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    minLines = 2
                )
                Spacer(Modifier.height(6.dp))
                if (product.reviewCount > 0L && product.rating > 0.0) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = "Rating",
                            tint = FlashAmber,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(3.dp))
                        Text(
                            text = "${product.rating} (${product.reviewCount})",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandMuted
                        )
                    }
                } else {
                    Text(
                        text = if (product.sellerName.isNotBlank()) product.sellerName else "Verified catalog",
                        style = MaterialTheme.typography.labelSmall,
                        color = BrandMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    text = formatNaira(product.priceNaira),
                    style = MaterialTheme.typography.titleMedium,
                    color = BrandSlate,
                    fontWeight = FontWeight.Bold
                )
                if (product.originalPriceNaira > product.priceNaira) {
                    Text(
                        text = formatNaira(product.originalPriceNaira),
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandMuted,
                        textDecoration = TextDecoration.LineThrough
                    )
                }
                Spacer(Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Button(
                        onClick = onAddToCart,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        modifier = Modifier
                            .weight(1f)
                            .height(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AddShoppingCart,
                            contentDescription = "Add to Cart",
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("Add", style = MaterialTheme.typography.labelMedium)
                    }
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isCompared) BrandEmeraldSoft else Color(0xFFF1F5F9),
                        border = BorderStroke(1.dp, if (isCompared) BrandEmerald else BrandBorder),
                        modifier = Modifier
                            .size(36.dp)
                            .clickable(onClick = onToggleCompare)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.CompareArrows,
                                contentDescription = "Compare product",
                                tint = if (isCompared) BrandEmerald else BrandMuted,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LivestreamCard(
    stream: Livestream,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        modifier = modifier
            .width(196.dp)
            .height(265.dp)
            .clickable(onClick = onClick)
            .testTag("livestream_card_${stream.id}")
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            MarketplaceImage(
                imageUrlOrKey = stream.coverKey,
                contentDescription = stream.title,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.Black.copy(alpha = 0.25f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.85f)
                            )
                        )
                    )
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(10.dp)
            ) {
                AnimatedLiveBadge(text = if (stream.status == "live") "LIVE" else "UPCOMING")
                Surface(
                    color = Color.Black.copy(alpha = 0.55f),
                    shape = RoundedCornerShape(50)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Visibility,
                            contentDescription = "Viewers",
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(Modifier.width(3.dp))
                        Text(
                            text = formatCompactCount(stream.viewerCount),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(12.dp)
            ) {
                Text(
                    text = stream.sellerName,
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFFA7F3D0),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = stream.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (stream.pinnedProductTitle.isNotBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Surface(
                        color = Color.White.copy(alpha = 0.18f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(
                            text = "${formatNaira(stream.pinnedProductPriceNaira)} • ${stream.pinnedProductTitle}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MiniPiPStreamBar(
    stream: Livestream,
    onExpand: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = BrandNavy,
        shadowElevation = 8.dp,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .clickable(onClick = onExpand)
            .testTag("pip_mini_player")
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(width = 48.dp, height = 56.dp)
                    .clip(RoundedCornerShape(10.dp))
            ) {
                MarketplaceImage(
                    imageUrlOrKey = stream.coverKey,
                    contentDescription = stream.title,
                    modifier = Modifier.fillMaxSize()
                )
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Resume stream",
                    tint = Color.White,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(22.dp)
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AnimatedLiveBadge()
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = stream.sellerName,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color(0xFF6EE7B7),
                        maxLines = 1
                    )
                }
                Spacer(Modifier.height(3.dp))
                Text(
                    text = stream.title,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            IconButton(onClick = onClose) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Dismiss PiP stream",
                    tint = Color.White
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NigerianStateSelectorSheet(
    selectedState: String,
    onSelectState: (String) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Text(
                text = "Select Nigerian Delivery State",
                style = MaterialTheme.typography.titleLarge,
                color = BrandSlate
            )
            Text(
                text = "Prices in ₦ and delivery timelines adapt to your state.",
                style = MaterialTheme.typography.bodySmall,
                color = BrandMuted
            )
            Spacer(Modifier.height(12.dp))
            LazyColumn(
                modifier = Modifier.height(380.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(NIGERIAN_STATES) { state ->
                    val isSelected = state == selectedState
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) BrandEmeraldSoft else Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, if (isSelected) BrandEmerald else BrandBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onSelectState(state)
                                onDismiss()
                            }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = state,
                                tint = if (isSelected) BrandEmerald else BrandMuted,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(10.dp))
                            Text(
                                text = state,
                                style = MaterialTheme.typography.titleSmall,
                                color = BrandSlate,
                                modifier = Modifier.weight(1f)
                            )
                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Selected",
                                    tint = BrandEmerald,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}
