package com.example.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
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
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.example.core.formatNaira
import com.example.data.model.Product
import com.example.data.model.ProductReview
import com.example.data.model.SellerStorefront
import com.example.ui.components.AnimatedLiveBadge
import com.example.ui.components.MarketplaceImage
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft

@Composable
fun ProductDetailScreen(
    product: Product,
    seller: SellerStorefront?,
    reviews: List<ProductReview>,
    relatedProducts: List<Product>,
    selectedState: String,
    isWishlisted: Boolean,
    isFollowingSeller: Boolean,
    onBack: () -> Unit,
    onAddToCart: (String) -> Unit,
    onBuyNow: (String) -> Unit,
    onToggleWishlist: () -> Unit,
    onToggleFollowSeller: () -> Unit,
    onWatchLive: (String) -> Unit,
    onOpenStorefront: (String) -> Unit,
    onOpenProduct: (Product) -> Unit,
    onSubmitReview: (Long, String) -> Unit
) {
    val context = LocalContext.current
    var selectedVariant by remember(product.id) {
        mutableStateOf(product.variants.firstOrNull() ?: "Standard")
    }
    var zoomScale by remember { mutableFloatStateOf(1f) }
    var reviewText by remember { mutableStateOf("") }
    var reviewRating by remember { mutableLongStateOf(5L) }

    Scaffold(
        containerColor = Color.White,
        bottomBar = {
            Surface(
                color = Color.White,
                shadowElevation = 8.dp,
                border = BorderStroke(1.dp, BrandBorder),
                modifier = Modifier.navigationBarsPadding()
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    OutlinedButton(
                        onClick = { onAddToCart(selectedVariant) },
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.5.dp, BrandEmerald),
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                            .testTag("detail_add_to_cart")
                    ) {
                        Icon(Icons.Default.AddShoppingCart, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Add to Cart", color = BrandEmerald, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onBuyNow(selectedVariant) },
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp)
                            .testTag("detail_buy_now")
                    ) {
                        Text("Buy Now", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            contentPadding = PaddingValues(bottom = 24.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Zoomable Product Image Gallery + Top Overlay Actions
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(310.dp)
                        .background(SurfaceSoft)
                        .pointerInput(Unit) {
                            detectTransformGestures { _, _, zoom, _ ->
                                zoomScale = (zoomScale * zoom).coerceIn(1f, 3f)
                            }
                        }
                        .clickable { zoomScale = if (zoomScale > 1.2f) 1f else 2f }
                ) {
                    MarketplaceImage(
                        imageUrlOrKey = product.imageKey,
                        contentDescription = product.title,
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer(
                                scaleX = zoomScale,
                                scaleY = zoomScale
                            )
                    )
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp)
                    ) {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.9f))
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = BrandSlate)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            IconButton(
                                onClick = {
                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            "Check out ${product.title} for ${formatNaira(product.priceNaira)} on Cash N Carry: https://www.cashncarryng.com/product/${product.id}"
                                        )
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "Share Product"))
                                },
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.9f))
                            ) {
                                Icon(Icons.Default.Share, contentDescription = "Share Product", tint = BrandSlate)
                            }
                            IconButton(
                                onClick = onToggleWishlist,
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.9f))
                            ) {
                                Icon(
                                    imageVector = if (isWishlisted) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                    contentDescription = "Wishlist",
                                    tint = if (isWishlisted) LiveCrimson else BrandSlate
                                )
                            }
                        }
                    }

                    Surface(
                        color = Color.Black.copy(alpha = 0.55f),
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Icon(Icons.Default.ZoomIn, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = if (zoomScale > 1.1f) "Tap to reset zoom" else "Pinch or tap to zoom",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // Watch Product Live Banner if Seller is Broadcasting
            if (product.liveStreamId.isNotBlank()) {
                item {
                    Surface(
                        color = BrandNavy,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                            .clickable { onWatchLive(product.liveStreamId) }
                            .testTag("watch_product_live_banner")
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(14.dp)
                        ) {
                            AnimatedLiveBadge(text = "LIVE NOW")
                            Spacer(Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${product.sellerName} is demonstrating this item live!",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = Color.White
                                )
                                Text(
                                    text = "Watch live Q&A & grab exclusive stream flash drops",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }
                            Icon(Icons.Default.PlayArrow, contentDescription = "Watch Live", tint = BrandEmerald)
                        }
                    }
                }
            }

            // Pricing, Title, Stock, Variants
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "${product.brand} • ${product.category}",
                            style = MaterialTheme.typography.labelLarge,
                            color = BrandEmerald
                        )
                        Surface(
                            color = if (product.stockCount > 0) BrandEmeraldSoft else LiveCrimson.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(50)
                        ) {
                            Text(
                                text = if (product.stockCount > 0) "${product.stockCount} in stock" else "Out of stock",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (product.stockCount > 0) BrandEmerald else LiveCrimson,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = product.title,
                        style = MaterialTheme.typography.headlineSmall,
                        color = BrandSlate
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = formatNaira(product.priceNaira),
                            style = MaterialTheme.typography.headlineMedium,
                            color = BrandSlate,
                            fontWeight = FontWeight.Bold
                        )
                        if (product.originalPriceNaira > product.priceNaira) {
                            Spacer(Modifier.width(10.dp))
                            Text(
                                text = formatNaira(product.originalPriceNaira),
                                style = MaterialTheme.typography.titleMedium,
                                color = BrandMuted,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    val totalReviews = product.reviewCount + reviews.size
                    if (totalReviews > 0L && product.rating > 0.0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = FlashAmber, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = "${product.rating} • $totalReviews reviews",
                                style = MaterialTheme.typography.bodyMedium,
                                color = BrandSlate
                            )
                        }
                    } else {
                        Text(
                            text = "No buyer reviews yet",
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandMuted
                        )
                    }

                    Spacer(Modifier.height(14.dp))
                    Text("Select Variant", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                    Spacer(Modifier.height(6.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(product.variants.ifEmpty { listOf("Standard") }) { variant ->
                            FilterChip(
                                selected = selectedVariant == variant,
                                onClick = { selectedVariant = variant },
                                label = { Text(variant) }
                            )
                        }
                    }

                    Spacer(Modifier.height(14.dp))
                    Surface(
                        color = SurfaceSoft,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, BrandBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Icon(Icons.Default.LocalShipping, contentDescription = null, tint = BrandEmerald)
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Estimated delivery to $selectedState: 24 – 48 hours",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = BrandSlate
                                )
                                Text(
                                    text = "Verified Nigerian seller dispatch tracking",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BrandMuted
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(16.dp))
                    Text("Product Overview", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = product.description.ifBlank { "Authentic marketplace item verified for Cash N Carry shoppers." },
                        style = MaterialTheme.typography.bodyLarge,
                        color = BrandMuted
                    )
                }
            }

            // Seller Card
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                    border = BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(14.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Storefront,
                            contentDescription = "Seller Storefront",
                            tint = BrandNavy,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                                .padding(8.dp)
                        )
                        Spacer(Modifier.width(10.dp))
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onOpenStorefront(product.sellerId) }
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(product.sellerName, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                if (seller?.verified == true) {
                                    Spacer(Modifier.width(4.dp))
                                    Icon(Icons.Default.Verified, contentDescription = "Verified", tint = BrandEmerald, modifier = Modifier.size(16.dp))
                                }
                            }
                            Text(
                                text = "${seller?.stateLocation ?: "Lagos"} • Tap to visit storefront",
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandMuted
                            )
                        }
                        OutlinedButton(
                            onClick = onToggleFollowSeller,
                            shape = RoundedCornerShape(50),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp)
                        ) {
                            Text(if (isFollowingSeller) "Following" else "Follow")
                        }
                    }
                }
            }

            // Buyer Reviews & Submit Review
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Text("Buyer Reviews", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Rating:", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                        Spacer(Modifier.width(6.dp))
                        (1L..5L).forEach { star ->
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = "$star stars",
                                tint = if (star <= reviewRating) FlashAmber else BrandBorder,
                                modifier = Modifier
                                    .size(26.dp)
                                    .clickable { reviewRating = star }
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = reviewText,
                            onValueChange = { reviewText = it },
                            placeholder = { Text("Share your review...") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        Button(
                            onClick = {
                                if (reviewText.isNotBlank()) {
                                    onSubmitReview(reviewRating, reviewText)
                                    reviewText = ""
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Post")
                        }
                    }
                }
            }

            items(reviews) { rev ->
                Surface(
                    color = SurfaceSoft,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(rev.userName, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                            Spacer(Modifier.width(8.dp))
                            Text("★ ${rev.rating}", style = MaterialTheme.typography.labelMedium, color = FlashAmber)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(rev.comment, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                    }
                }
            }

            // Related Products
            if (relatedProducts.isNotEmpty()) {
                item {
                    Column(modifier = Modifier.padding(top = 12.dp)) {
                        Text(
                            text = "Related Products",
                            style = MaterialTheme.typography.titleMedium,
                            color = BrandSlate,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                        )
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(relatedProducts) { rel ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                    border = BorderStroke(1.dp, BrandBorder),
                                    modifier = Modifier
                                        .width(150.dp)
                                        .clickable { onOpenProduct(rel) }
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        MarketplaceImage(
                                            imageUrlOrKey = rel.imageKey,
                                            contentDescription = rel.title,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(90.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                        )
                                        Spacer(Modifier.height(6.dp))
                                        Text(rel.title, style = MaterialTheme.typography.labelMedium, maxLines = 1)
                                        Text(formatNaira(rel.priceNaira), style = MaterialTheme.typography.labelLarge, color = BrandEmerald)
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
