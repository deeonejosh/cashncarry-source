package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.core.MARKETPLACE_CATEGORIES
import com.example.core.formatNaira
import com.example.data.model.Product
import com.example.data.model.SellerStorefront
import com.example.data.model.UiState
import com.example.data.repository.AiSearchAdvice
import com.example.ui.components.ProductCard
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft
import com.example.ui.viewmodel.ProductSortOption

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    products: List<Product>,
    sellers: List<SellerStorefront>,
    selectedState: String,
    searchQuery: String,
    selectedCategory: String,
    selectedBrand: String,
    selectedSellerId: String?,
    sortOption: ProductSortOption,
    inStockOnly: Boolean,
    deliveryStateFilterEnabled: Boolean,
    wishlistIds: Set<String>,
    compareIds: List<String>,
    aiAdviceState: UiState<AiSearchAdvice>?,
    productsError: String? = null,
    onRetryProducts: () -> Unit = {},
    onSearchChange: (String) -> Unit,
    onRunAiSearch: (String?) -> Unit,
    onSelectCategory: (String) -> Unit,
    onSelectBrand: (String) -> Unit,
    onSelectSeller: (String?) -> Unit,
    onSelectSort: (ProductSortOption) -> Unit,
    onToggleInStock: () -> Unit,
    onToggleDeliveryState: () -> Unit,
    onOpenProduct: (Product) -> Unit,
    onAddToCart: (Product) -> Unit,
    onToggleWishlist: (Product) -> Unit,
    onToggleCompare: (Product) -> Unit,
    onOpenLivestream: (String) -> Unit
) {
    var showSortMenu by remember { mutableStateOf(false) }
    var showCompareSheet by remember { mutableStateOf(false) }

    val brands = remember(products) {
        listOf("All") + products.map { it.brand }.filter { it.isNotBlank() }.distinct()
    }

    val filtered = remember(
        products,
        searchQuery,
        selectedCategory,
        selectedBrand,
        selectedSellerId,
        sortOption,
        inStockOnly,
        deliveryStateFilterEnabled,
        selectedState
    ) {
        val base = products.filter { p ->
            val qOk = searchQuery.isBlank() ||
                p.title.contains(searchQuery, ignoreCase = true) ||
                p.description.contains(searchQuery, ignoreCase = true) ||
                p.brand.contains(searchQuery, ignoreCase = true)
            val catOk = selectedCategory == "All" || p.category.equals(selectedCategory, ignoreCase = true)
            val brandOk = selectedBrand == "All" || p.brand.equals(selectedBrand, ignoreCase = true)
            val sellerOk = selectedSellerId == null || p.sellerId == selectedSellerId
            val stockOk = !inStockOnly || p.stockCount > 0L
            val stateOk = !deliveryStateFilterEnabled || p.deliveryStates.contains(selectedState)
            qOk && catOk && brandOk && sellerOk && stockOk && stateOk
        }
        when (sortOption) {
            ProductSortOption.RECOMMENDED -> base
            ProductSortOption.PRICE_LOW_HIGH -> base.sortedBy { it.priceNaira }
            ProductSortOption.PRICE_HIGH_LOW -> base.sortedByDescending { it.priceNaira }
            ProductSortOption.TOP_RATED -> base.sortedByDescending { it.rating }
            ProductSortOption.BEST_SELLING -> base.sortedByDescending { it.reviewCount }
        }
    }

    val compareProducts = remember(products, compareIds) {
        compareIds.mapNotNull { id -> products.find { it.id == id } }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Discover Marketplace",
                    style = MaterialTheme.typography.headlineSmall,
                    color = BrandSlate
                )
                Box {
                    TextButton(onClick = { showSortMenu = true }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Sort,
                            contentDescription = "Sort",
                            tint = BrandEmerald,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(sortOption.label, color = BrandEmerald)
                    }
                    DropdownMenu(
                        expanded = showSortMenu,
                        onDismissRequest = { showSortMenu = false }
                    ) {
                        ProductSortOption.entries.forEach { opt ->
                            DropdownMenuItem(
                                text = { Text(opt.label) },
                                onClick = {
                                    onSelectSort(opt)
                                    showSortMenu = false
                                }
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchChange,
                    placeholder = { Text("Search or ask AI...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("discover_search_field")
                )
                Button(
                    onClick = { onRunAiSearch(null) },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                    modifier = Modifier
                        .height(54.dp)
                        .testTag("discover_ai_button")
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = "AI Search", modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("AI")
                }
            }
        }

        // AI Recommendation Card (Catalog Recommendation Engine)
        when (aiAdviceState) {
            is UiState.Loading -> {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = BrandEmerald)
                    Spacer(Modifier.width(10.dp))
                    Text("Gemini AI finding best matches for $selectedState...", style = MaterialTheme.typography.bodySmall)
                }
            }
            is UiState.Success -> {
                val advice = aiAdviceState.data
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = BrandEmeraldSoft),
                    border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.35f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("AI Shopping Recommendation", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(advice.summary, style = MaterialTheme.typography.bodySmall, color = BrandSlate)
                        if (advice.suggestedQueries.isNotEmpty()) {
                            Spacer(Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(advice.suggestedQueries) { suggestion ->
                                    Surface(
                                        color = Color.White,
                                        shape = RoundedCornerShape(50),
                                        border = BorderStroke(1.dp, BrandEmerald),
                                        modifier = Modifier.clickable {
                                            onSearchChange(suggestion)
                                            onRunAiSearch(suggestion)
                                        }
                                    ) {
                                        Text(
                                            text = suggestion,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = BrandEmerald,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
            is UiState.Error -> {
                Text(
                    text = aiAdviceState.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = LiveCrimson,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }
            null -> Unit
        }

        // Category, Brand, Seller, Stock, Delivery State Filters
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(vertical = 6.dp)
        ) {
            item {
                FilterChip(
                    selected = inStockOnly,
                    onClick = onToggleInStock,
                    label = { Text("In Stock") }
                )
            }
            item {
                FilterChip(
                    selected = deliveryStateFilterEnabled,
                    onClick = onToggleDeliveryState,
                    label = { Text("Ships to $selectedState") }
                )
            }
            items(MARKETPLACE_CATEGORIES) { cat ->
                FilterChip(
                    selected = selectedCategory == cat,
                    onClick = { onSelectCategory(cat) },
                    label = { Text(cat) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandEmerald,
                        selectedLabelColor = Color.White
                    )
                )
            }
            items(brands) { brand ->
                if (brand != "All") {
                    FilterChip(
                        selected = selectedBrand == brand,
                        onClick = { onSelectBrand(if (selectedBrand == brand) "All" else brand) },
                        label = { Text("Brand: $brand") }
                    )
                }
            }
            items(sellers) { seller ->
                FilterChip(
                    selected = selectedSellerId == seller.ownerId,
                    onClick = { onSelectSeller(if (selectedSellerId == seller.ownerId) null else seller.ownerId) },
                    label = { Text(seller.businessName) }
                )
            }
        }

        // Compare Tray Bar
        if (compareProducts.isNotEmpty()) {
            Surface(
                color = BrandNavy,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .clickable { showCompareSheet = true }
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.AutoMirrored.Filled.CompareArrows, contentDescription = null, tint = BrandEmerald)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "Compare (${compareProducts.size}/3 selected)",
                            style = MaterialTheme.typography.titleSmall,
                            color = Color.White
                        )
                    }
                    Text(
                        text = "View Matrix",
                        style = MaterialTheme.typography.labelLarge,
                        color = BrandEmerald
                    )
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            if (productsError != null && products.isEmpty()) {
                item {
                    Surface(
                        color = LiveCrimson.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("discover_error_state")
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(24.dp)
                        ) {
                            Text("Could not load products", style = MaterialTheme.typography.titleMedium, color = LiveCrimson)
                            Spacer(Modifier.height(6.dp))
                            Text(productsError, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = onRetryProducts,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                modifier = Modifier.testTag("discover_retry_button")
                            ) {
                                Text("Retry")
                            }
                        }
                    }
                }
            } else if (products.isEmpty()) {
                item {
                    Surface(
                        color = SurfaceSoft,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("discover_empty_state")
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(28.dp)
                        ) {
                            Text(
                                "No products available yet. Check back soon for new arrivals.",
                                style = MaterialTheme.typography.titleMedium,
                                color = BrandSlate
                            )
                        }
                    }
                }
            } else if (filtered.isEmpty()) {
                item {
                    Surface(
                        color = SurfaceSoft,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(28.dp)
                        ) {
                            Text("No products match your filters", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                            Spacer(Modifier.height(6.dp))
                            Text("Try clearing a brand or state filter, or ask AI for recommendations.", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                        }
                    }
                }
            } else {
                val rows = filtered.chunked(2)
                items(rows) { row ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        row.forEach { product ->
                            ProductCard(
                                product = product,
                                isWishlisted = wishlistIds.contains(product.id),
                                isCompared = compareIds.contains(product.id),
                                onClick = { onOpenProduct(product) },
                                onAddToCart = { onAddToCart(product) },
                                onToggleWishlist = { onToggleWishlist(product) },
                                onToggleCompare = { onToggleCompare(product) },
                                onWatchLive = onOpenLivestream,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }

    if (showCompareSheet && compareProducts.isNotEmpty()) {
        ModalBottomSheet(
            onDismissRequest = { showCompareSheet = false },
            containerColor = Color.White
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Product Comparison", style = MaterialTheme.typography.headlineSmall, color = BrandSlate)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    compareProducts.forEach { item ->
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                            border = BorderStroke(1.dp, BrandBorder),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(item.title, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                                Spacer(Modifier.height(6.dp))
                                Text(formatNaira(item.priceNaira), fontWeight = FontWeight.Bold, color = BrandEmerald)
                                Spacer(Modifier.height(4.dp))
                                Text("Brand: ${item.brand}", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    if (item.rating > 0.0) "Rating: ★ ${item.rating}" else "Rating: No reviews yet",
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Text("Stock: ${item.stockCount}", style = MaterialTheme.typography.bodySmall)
                                Text("Seller: ${item.sellerName}", style = MaterialTheme.typography.bodySmall, maxLines = 1)
                                Spacer(Modifier.height(8.dp))
                                TextButton(onClick = { onToggleCompare(item) }) {
                                    Text("Remove", color = LiveCrimson)
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}
