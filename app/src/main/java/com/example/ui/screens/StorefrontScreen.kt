package com.example.ui.screens

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.Livestream
import com.example.data.model.Product
import com.example.data.model.SellerStorefront
import com.example.data.model.ShortVideo
import com.example.ui.components.LivestreamCard
import com.example.ui.components.MarketplaceImage
import com.example.ui.components.ProductCard
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft

@Composable
fun StorefrontScreen(
    seller: SellerStorefront,
    sellerProducts: List<Product>,
    sellerStreams: List<Livestream>,
    sellerVideos: List<ShortVideo>,
    wishlistIds: Set<String>,
    compareIds: List<String>,
    isFollowing: Boolean,
    onBack: () -> Unit,
    onToggleFollow: () -> Unit,
    onOpenProduct: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit,
    onOpenStream: (String) -> Unit,
    onOpenVideos: () -> Unit
) {
    BackHandler { onBack() }

    var storeSearch by remember { mutableStateOf("") }
    val themeColor = remember(seller.themeId) {
        when (seller.themeId) {
            "navy" -> BrandNavy
            "amber" -> FlashAmber
            "crimson" -> LiveCrimson
            else -> BrandEmerald
        }
    }

    val filteredProducts = remember(sellerProducts, storeSearch) {
        if (storeSearch.isBlank()) sellerProducts
        else sellerProducts.filter { it.title.contains(storeSearch, ignoreCase = true) }
    }

    LazyColumn(
        contentPadding = PaddingValues(bottom = 24.dp),
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
            ) {
                MarketplaceImage(
                    imageUrlOrKey = seller.bannerKey,
                    contentDescription = seller.businessName,
                    modifier = Modifier.fillMaxSize()
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    themeColor.copy(alpha = 0.45f),
                                    BrandNavy.copy(alpha = 0.9f)
                                )
                            )
                        )
                )
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .padding(14.dp)
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.9f))
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = BrandSlate)
                }

                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = seller.businessName,
                            style = MaterialTheme.typography.headlineSmall,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        if (seller.verified) {
                            Spacer(Modifier.width(6.dp))
                            Icon(Icons.Default.Verified, contentDescription = "Verified", tint = Color(0xFF6EE7B7))
                        }
                    }
                    Text(
                        text = seller.tagline.ifBlank { "Official Cash N Carry Vendor Storefront" },
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.88f)
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(color = Color.White.copy(alpha = 0.16f), shape = RoundedCornerShape(50)) {
                            val ratingSegment = if (seller.rating > 0.0) " • ★ ${seller.rating}" else ""
                            Text(
                                text = "${seller.stateLocation}$ratingSegment • ${seller.followersCount} followers",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                        Button(
                            onClick = onToggleFollow,
                            colors = ButtonDefaults.buttonColors(containerColor = themeColor),
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                            modifier = Modifier
                                .height(34.dp)
                                .testTag("storefront_follow_button")
                        ) {
                            Text(if (isFollowing) "Following" else "Follow Store", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }

        item {
            Column(modifier = Modifier.padding(16.dp)) {
                OutlinedTextField(
                    value = storeSearch,
                    onValueChange = { storeSearch = it },
                    placeholder = { Text("Search inside ${seller.businessName}...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                Surface(
                    color = SurfaceSoft,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Store Policies & Delivery", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                        Spacer(Modifier.height(3.dp))
                        Text(seller.policies, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                    }
                }
            }
        }

        if (sellerStreams.isNotEmpty()) {
            item {
                Text(
                    text = "Live & Upcoming Broadcasts",
                    style = MaterialTheme.typography.titleMedium,
                    color = BrandSlate,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(sellerStreams, key = { it.id }) { stream ->
                        LivestreamCard(stream = stream, onClick = { onOpenStream(stream.id) })
                    }
                }
                Spacer(Modifier.height(10.dp))
            }
        }

        if (sellerVideos.isNotEmpty()) {
            item {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Text("Store Shoppable Videos (${sellerVideos.size})", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                    OutlinedButton(onClick = onOpenVideos) { Text("Watch Reels") }
                }
            }
        }

        item {
            Text(
                text = "Store Catalog (${filteredProducts.size})",
                style = MaterialTheme.typography.titleMedium,
                color = BrandSlate,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }

        if (filteredProducts.isEmpty()) {
            item {
                Text(
                    text = "No products available yet. Check back soon for new arrivals.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = BrandMuted,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                )
            }
        } else {
            val rows = filteredProducts.chunked(2)
            items(rows) { row ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    row.forEach { prod ->
                        ProductCard(
                            product = prod,
                            isWishlisted = wishlistIds.contains(prod.id),
                            isCompared = compareIds.contains(prod.id),
                            onClick = { onOpenProduct(prod) },
                            onAddToCart = { onAddToCart(prod) },
                            onToggleWishlist = { onToggleWishlist(prod) },
                            onToggleCompare = { onToggleCompare(prod) },
                            onWatchLive = onOpenStream,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}
