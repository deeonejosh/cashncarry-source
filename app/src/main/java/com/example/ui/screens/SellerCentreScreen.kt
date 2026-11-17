package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.example.core.NIGERIAN_STATES
import com.example.core.formatNaira
import com.example.data.model.GiftTransaction
import com.example.data.model.MarketplaceOrder
import com.example.data.model.Product
import com.example.data.model.SellerStorefront
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.GoldCoin
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SellerCentreScreen(
    sellerStorefront: SellerStorefront?,
    sellerProducts: List<Product>,
    sellerOrders: List<MarketplaceOrder>,
    giftTransactions: List<GiftTransaction>,
    defaultSellerName: String,
    onBack: () -> Unit,
    onOpenBroadcastStudio: () -> Unit,
    onSaveStorefront: (String, String, String, String, String) -> Unit,
    onAddProduct: (String, String, String, String, String, Long, Long, Boolean) -> Unit,
    onUpdateProduct: (Product, Long, Long, Boolean) -> Unit,
    onFulfilOrder: (String, String) -> Unit,
    onLaunchAuction: (String, Product, Long, Long, Long) -> Unit,
    onOpenVideoUpload: () -> Unit,
    onSubmitForReview: (Product) -> Unit
) {
    BackHandler { onBack() }

    var selectedTab by remember { mutableIntStateOf(0) }
    var showAddProductDialog by remember { mutableStateOf(false) }
    var auctionTargetProduct by remember { mutableStateOf<Product?>(null) }

    val totalRevenueNaira = remember(sellerOrders) {
        sellerOrders.filter { it.paymentStatus == "paid" }.sumOf { it.totalNaira }
    }
    val realGiftCoins = remember(giftTransactions) {
        giftTransactions.filter { it.coinSource == "purchased" }.sumOf { it.coinCost }
    }

    Scaffold(
        containerColor = Color.White,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Seller Centre", style = MaterialTheme.typography.titleLarge)
                        Text(
                            text = sellerStorefront?.businessName ?: "$defaultSellerName Store",
                            style = MaterialTheme.typography.bodySmall,
                            color = BrandMuted
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Button(
                        onClick = onOpenBroadcastStudio,
                        colors = ButtonDefaults.buttonColors(containerColor = LiveCrimson),
                        shape = RoundedCornerShape(50),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .testTag("seller_go_live_btn")
                    ) {
                        Icon(Icons.Default.Videocam, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Go Live", style = MaterialTheme.typography.labelMedium)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            TabRow(selectedTabIndex = selectedTab, containerColor = Color.White, contentColor = BrandEmerald) {
                listOf("Overview", "Catalog", "Orders", "Storefront").forEachIndexed { idx, label ->
                    Tab(selected = selectedTab == idx, onClick = { selectedTab = idx }, text = { Text(label) })
                }
            }

            when (selectedTab) {
                0 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                MetricCard("Sales Revenue", formatNaira(totalRevenueNaira), BrandEmerald, Modifier.weight(1f))
                                MetricCard("Active Orders", "${sellerOrders.size}", BrandNavy, Modifier.weight(1f))
                            }
                        }
                        item {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                MetricCard("Products", "${sellerProducts.size}", BrandSlate, Modifier.weight(1f))
                                MetricCard("Gift Earnings", "$realGiftCoins Coins", GoldCoin, Modifier.weight(1f))
                            }
                        }
                        item {
                            Surface(
                                color = if (sellerStorefront?.verified == true) BrandEmeraldSoft else SurfaceSoft,
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(14.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Verified,
                                        contentDescription = null,
                                        tint = if (sellerStorefront?.verified == true) BrandEmerald else BrandMuted
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = if (sellerStorefront?.verified == true) "Verified Cash N Carry Seller" else "Pending Verification Badge",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = BrandSlate
                                        )
                                        Text(
                                            text = "Only verified purchased-coin gifts credit seller gift earnings. Promo test coins do not credit payout balances.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandMuted
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                1 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item {
                            Button(
                                onClick = { showAddProductDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .testTag("seller_add_product_btn")
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text("Add New Product Listing", fontWeight = FontWeight.Bold)
                            }
                        }
                        items(sellerProducts, key = { it.id }) { prod ->
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                border = BorderStroke(1.dp, BrandBorder)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(prod.title, style = MaterialTheme.typography.titleSmall, color = BrandSlate, modifier = Modifier.weight(1f))
                                        Text(formatNaira(prod.priceNaira), style = MaterialTheme.typography.titleSmall, color = BrandEmerald, fontWeight = FontWeight.Bold)
                                    }
                                    Text("Stock: ${prod.stockCount} • ${prod.category} • Status: ${prod.status}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                    Spacer(Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (prod.status.equals("draft", ignoreCase = true) || prod.status.equals("rejected", ignoreCase = true)) {
                                            Button(
                                                onClick = { onSubmitForReview(prod) },
                                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                                            ) {
                                                Text("Submit for Review")
                                            }
                                        }
                                        OutlinedButton(onClick = {
                                            onUpdateProduct(prod, prod.priceNaira, prod.stockCount + 10L, !prod.isFlashDeal)
                                        }) {
                                            Text(if (prod.isFlashDeal) "Flash ON (+10 Stock)" else "Enable Flash")
                                        }
                                        OutlinedButton(onClick = { auctionTargetProduct = prod }) {
                                            Icon(Icons.Default.Gavel, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(4.dp))
                                            Text("Auction")
                                        }
                                        OutlinedButton(onClick = onOpenVideoUpload) {
                                            Text("Upload Video")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                2 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (sellerOrders.isEmpty()) {
                            item {
                                Text("No customer orders for your store yet.", color = BrandMuted)
                            }
                        } else {
                            items(sellerOrders, key = { it.id }) { order ->
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(order.itemsSummary, style = MaterialTheme.typography.titleSmall, color = BrandSlate, modifier = Modifier.weight(1f))
                                            Text(formatNaira(order.totalNaira), style = MaterialTheme.typography.titleSmall, color = BrandEmerald)
                                        }
                                        Text(
                                            text = "${order.deliveryState} • Pay: ${order.paymentStatus} • Status: ${order.orderStatus}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandMuted
                                        )
                                        Spacer(Modifier.height(8.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf("processing", "shipped", "delivered").forEach { next ->
                                                FilterChip(
                                                    selected = order.orderStatus == next,
                                                    onClick = { onFulfilOrder(order.id, next) },
                                                    label = { Text(next.replaceFirstChar { it.uppercase() }) }
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                3 -> {
                    var bizName by remember(sellerStorefront) {
                        mutableStateOf(sellerStorefront?.businessName ?: "$defaultSellerName Store")
                    }
                    var tagline by remember(sellerStorefront) {
                        mutableStateOf(sellerStorefront?.tagline ?: "Authentic Nigerian Commerce & Live Deals")
                    }
                    var stateLoc by remember(sellerStorefront) {
                        mutableStateOf(sellerStorefront?.stateLocation ?: "Lagos")
                    }
                    var themeId by remember(sellerStorefront) {
                        mutableStateOf(sellerStorefront?.themeId ?: "emerald")
                    }
                    var policies by remember(sellerStorefront) {
                        mutableStateOf(sellerStorefront?.policies ?: "24-48h Lagos dispatch, 3-5 days nationwide.")
                    }

                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item {
                            OutlinedTextField(
                                value = bizName,
                                onValueChange = { bizName = it },
                                label = { Text("Store Business Name") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        item {
                            OutlinedTextField(
                                value = tagline,
                                onValueChange = { tagline = it },
                                label = { Text("Storefront Tagline") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        item {
                            Text("Storefront Theme Color", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(listOf("emerald", "navy", "amber", "crimson")) { theme ->
                                    FilterChip(
                                        selected = themeId == theme,
                                        onClick = { themeId = theme },
                                        label = { Text(theme.uppercase()) }
                                    )
                                }
                            }
                        }
                        item {
                            Text("Origin State", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(NIGERIAN_STATES.take(8)) { st ->
                                    FilterChip(selected = stateLoc == st, onClick = { stateLoc = st }, label = { Text(st) })
                                }
                            }
                        }
                        item {
                            OutlinedTextField(
                                value = policies,
                                onValueChange = { policies = it },
                                label = { Text("Return & Shipping Policy") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        item {
                            Button(
                                onClick = { onSaveStorefront(bizName, tagline, stateLoc, themeId, policies) },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp)
                                    .testTag("save_storefront_btn")
                            ) {
                                Icon(Icons.Default.Storefront, contentDescription = null)
                                Spacer(Modifier.width(8.dp))
                                Text("Save Storefront Configuration", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddProductDialog) {
        var title by remember { mutableStateOf("") }
        var desc by remember { mutableStateOf("") }
        var cat by remember { mutableStateOf("Electronics") }
        var brand by remember { mutableStateOf("CashNCarry") }
        var price by remember { mutableStateOf("45000") }
        var stock by remember { mutableStateOf("20") }
        var isFlash by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showAddProductDialog = false },
            title = { Text("Create Marketplace Product") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Product Title") })
                    OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Description") })
                    OutlinedTextField(value = brand, onValueChange = { brand = it }, label = { Text("Brand") })
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(MARKETPLACE_CATEGORIES.drop(1)) { c ->
                            FilterChip(selected = cat == c, onClick = { cat = c }, label = { Text(c) })
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = price,
                            onValueChange = { price = it.filter(Char::isDigit) },
                            label = { Text("Price (₦)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = stock,
                            onValueChange = { stock = it.filter(Char::isDigit) },
                            label = { Text("Stock") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Flash Deal", modifier = Modifier.weight(1f))
                        Switch(checked = isFlash, onCheckedChange = { isFlash = it })
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotBlank()) {
                            onAddProduct(
                                sellerStorefront?.businessName ?: defaultSellerName,
                                title,
                                desc,
                                cat,
                                brand,
                                price.toLongOrNull() ?: 10000L,
                                stock.toLongOrNull() ?: 10L,
                                isFlash
                            )
                            showAddProductDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                ) {
                    Text("Publish")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddProductDialog = false }) { Text("Cancel") }
            }
        )
    }

    if (auctionTargetProduct != null) {
        val prod = auctionTargetProduct!!
        var startBid by remember { mutableStateOf((prod.priceNaira / 2).coerceAtLeast(1000L).toString()) }
        var minInc by remember { mutableStateOf("500") }
        AlertDialog(
            onDismissRequest = { auctionTargetProduct = null },
            title = { Text("Launch Live Auction") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(prod.title, style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(value = startBid, onValueChange = { startBid = it.filter(Char::isDigit) }, label = { Text("Starting Bid (₦)") })
                    OutlinedTextField(value = minInc, onValueChange = { minInc = it.filter(Char::isDigit) }, label = { Text("Min Bid Increment (₦)") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onLaunchAuction(
                            sellerStorefront?.businessName ?: defaultSellerName,
                            prod,
                            startBid.toLongOrNull() ?: 1000L,
                            minInc.toLongOrNull() ?: 500L,
                            15L
                        )
                        auctionTargetProduct = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                ) {
                    Text("Go Live (15m)")
                }
            },
            dismissButton = {
                TextButton(onClick = { auctionTargetProduct = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun MetricCard(
    label: String,
    value: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = SurfaceSoft,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, BrandBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = BrandMuted)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, color = accent, fontWeight = FontWeight.Bold)
        }
    }
}
