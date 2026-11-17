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
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Remove
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.core.NIGERIAN_STATES
import com.example.core.formatNaira
import com.example.data.model.CartItem
import com.example.data.model.MarketplaceOrder
import com.example.data.model.UserPrivateInfo
import com.example.data.model.WalletBalance
import com.example.data.model.WalletLedgerEntry
import com.example.data.model.WishlistItem
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
import com.example.ui.theme.SurfaceSoft

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartCheckoutOrdersScreen(
    initialTab: Int,
    cartItems: List<CartItem>,
    orders: List<MarketplaceOrder>,
    wishlistItems: List<WishlistItem>,
    wallet: WalletBalance,
    walletLedger: List<WalletLedgerEntry>,
    privateInfo: UserPrivateInfo?,
    selectedState: String,
    userName: String,
    userEmail: String,
    isAuthenticated: Boolean = true,
    paymentsEnabled: Boolean = false,
    coinsPurchasesEnabled: Boolean = false,
    onBack: (() -> Unit)? = null,
    onRequireSignIn: () -> Unit = {},
    onUpdateCartQty: (String, Long) -> Unit,
    onCheckoutCart: (String, String, String) -> Unit,
    onPayExistingOrder: (String, String) -> Unit,
    onSaveShippingSetup: (String, String, String) -> Unit,
    onBuyCoins: (Long, Long) -> Unit,
    onSignOut: () -> Unit
) {
    if (onBack != null) {
        BackHandler { onBack() }
    }

    var selectedTab by remember(initialTab) { mutableIntStateOf(initialTab) }
    var paymentMethod by remember { mutableStateOf("card_online") }
    var showShippingDialog by remember { mutableStateOf(false) }

    val cartSubtotal = remember(cartItems) {
        cartItems.sumOf { it.unitPriceNaira * it.quantity }
    }

    Scaffold(
        containerColor = Color.White,
        topBar = {
            TopAppBar(
                title = { Text("Cart, Orders & Wallet", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                actions = {
                    if (isAuthenticated) {
                        IconButton(onClick = onSignOut, modifier = Modifier.testTag("sign_out_button")) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out", tint = LiveCrimson)
                        }
                    } else {
                        TextButton(onClick = onRequireSignIn, modifier = Modifier.testTag("orders_sign_in_button")) {
                            Text("Sign In", color = BrandEmerald, fontWeight = FontWeight.Bold)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner)
        ) {
            TabRow(selectedTabIndex = selectedTab, containerColor = Color.White, contentColor = BrandEmerald) {
                listOf("Cart (${cartItems.size})", "Orders (${orders.size})", "Wallet", "Saved").forEachIndexed { idx, title ->
                    Tab(selected = selectedTab == idx, onClick = { selectedTab = idx }, text = { Text(title, maxLines = 1) })
                }
            }

            when (selectedTab) {
                // Tab 0: Multi-seller Cart & Flutterwave Checkout
                0 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        item {
                            Surface(
                                color = SurfaceSoft,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { showShippingDialog = true }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Delivery & Auction Bid Address", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                        Text(
                                            text = privateInfo?.shippingAddress?.ifBlank { null }
                                                ?: "Tap to set Nigerian delivery address ($selectedState)",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandMuted
                                        )
                                    }
                                    Text("Edit", color = BrandEmerald, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        if (!isAuthenticated) {
                            item {
                                Surface(
                                    color = BrandEmeraldSoft,
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.35f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Text(
                                            text = "Sign in to sync your cart and place orders.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandSlate,
                                            modifier = Modifier.weight(1f)
                                        )
                                        TextButton(onClick = onRequireSignIn) {
                                            Text("Sign In", color = BrandEmerald, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        if (cartItems.isEmpty()) {
                            item {
                                Text("Your shopping cart is empty. Add items from the Marketplace or Live Streams.", color = BrandMuted)
                            }
                        } else {
                            items(cartItems, key = { it.id }) { item ->
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(10.dp)
                                    ) {
                                        MarketplaceImage(
                                            imageUrlOrKey = item.imageKey,
                                            contentDescription = item.productTitle,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(64.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                        )
                                        Spacer(Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.productTitle, style = MaterialTheme.typography.titleSmall, color = BrandSlate, maxLines = 1)
                                            Text("${item.sellerName} • ${item.variantLabel}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                            Text(formatNaira(item.unitPriceNaira), style = MaterialTheme.typography.titleSmall, color = BrandEmerald, fontWeight = FontWeight.Bold)
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(onClick = { onUpdateCartQty(item.id, item.quantity - 1L) }) {
                                                Icon(
                                                    imageVector = if (item.quantity <= 1L) Icons.Default.DeleteOutline else Icons.Default.Remove,
                                                    contentDescription = "Decrease quantity"
                                                )
                                            }
                                            Text("${item.quantity}", style = MaterialTheme.typography.titleSmall)
                                            IconButton(onClick = { onUpdateCartQty(item.id, item.quantity + 1L) }) {
                                                Icon(Icons.Default.Add, contentDescription = "Increase quantity")
                                            }
                                        }
                                    }
                                }
                            }

                            item {
                                Text("Order & Checkout Channel", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    items(
                                        listOf(
                                            "card_online" to "Online Checkout",
                                            "bank_transfer" to "Bank Transfer",
                                            "pay_on_delivery" to "Pay on Delivery"
                                        )
                                    ) { (id, label) ->
                                        FilterChip(
                                            selected = paymentMethod == id,
                                            onClick = { paymentMethod = id },
                                            label = { Text(label) }
                                        )
                                    }
                                }
                                if (!paymentsEnabled) {
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        text = "Online card/bank payment activation is pending. Submitting creates a reserved order awaiting payment.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted
                                    )
                                }
                            }

                            item {
                                Button(
                                    onClick = {
                                        val address = privateInfo?.shippingAddress?.ifBlank { "Victoria Island, $selectedState" }
                                            ?: "Victoria Island, $selectedState"
                                        onCheckoutCart(selectedState, address, paymentMethod)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(52.dp)
                                        .testTag("checkout_submit_button")
                                ) {
                                    Icon(Icons.Default.CreditCard, contentDescription = null)
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        text = if (paymentsEnabled) {
                                            "Pay ${formatNaira(cartSubtotal)}"
                                        } else {
                                            "Place Order Reservation (${formatNaira(cartSubtotal)})"
                                        },
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                // Tab 1: Orders & Won Auction Checkout
                1 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        if (orders.isEmpty()) {
                            item { Text("No orders placed yet.", color = BrandMuted) }
                        } else {
                            items(orders, key = { it.id }) { order ->
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Row(
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(order.itemsSummary, style = MaterialTheme.typography.titleSmall, color = BrandSlate, modifier = Modifier.weight(1f))
                                            Text(formatNaira(order.totalNaira), style = MaterialTheme.typography.titleMedium, color = BrandEmerald, fontWeight = FontWeight.Bold)
                                        }
                                        Text(
                                            text = "Seller: ${order.sellerName} • ${order.deliveryState}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandMuted
                                        )
                                        Spacer(Modifier.height(6.dp))
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Surface(
                                                color = if (order.paymentStatus == "paid") BrandEmeraldSoft else FlashAmber.copy(alpha = 0.15f),
                                                shape = RoundedCornerShape(50)
                                            ) {
                                                Text(
                                                    text = "${order.paymentStatus.uppercase()} • ${order.orderStatus.uppercase()}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = if (order.paymentStatus == "paid") BrandEmerald else FlashAmber,
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                                )
                                            }
                                            if (order.paymentStatus != "paid") {
                                                Button(
                                                    onClick = { onPayExistingOrder(order.id, paymentMethod) },
                                                    enabled = paymentsEnabled,
                                                    colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                                                    modifier = Modifier.testTag("pay_order_${order.id}")
                                                ) {
                                                    Text(if (paymentsEnabled) "Pay Now" else "Payment Disabled")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Tab 2: Virtual Coin Wallet (Purchased Coins vs Promo Test Coins)
                2 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        item {
                            Surface(
                                color = BrandNavy,
                                shape = RoundedCornerShape(20.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = GoldCoin)
                                        Spacer(Modifier.width(8.dp))
                                        Text("$userName ($userEmail)", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.8f))
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("Purchased Coins", style = MaterialTheme.typography.labelSmall, color = GoldCoin)
                                            Text("${wallet.purchasedCoins}", style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.Bold)
                                            Text("Credits live sellers", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.65f))
                                        }
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("Promo Test Coins", style = MaterialTheme.typography.labelSmall, color = Color(0xFFC4B5FD))
                                            Text("${wallet.promoTestCoins}", style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.Bold)
                                            Text("Non-redeemable test balance", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.65f))
                                        }
                                    }
                                }
                            }
                        }

                        item {
                            if (coinsPurchasesEnabled) {
                                Text("Top Up Cash Coins", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                                Spacer(Modifier.height(6.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                    listOf(100L to 1000L, 500L to 4500L, 1200L to 10000L).forEach { (coins, naira) ->
                                        Button(
                                            onClick = { onBuyCoins(coins, naira) },
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                            shape = RoundedCornerShape(14.dp),
                                            contentPadding = PaddingValues(8.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Text("$coins Coins", fontWeight = FontWeight.Bold)
                                                Text(formatNaira(naira), style = MaterialTheme.typography.labelSmall)
                                            }
                                        }
                                    }
                                }
                            } else {
                                Surface(
                                    color = SurfaceSoft,
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, BrandBorder),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text("Cash Coin Top-Ups Unavailable", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            text = "Cash Coin top-ups are currently disabled until live payment processing is activated.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandMuted
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            Text("Wallet Ledger", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                        }
                        if (walletLedger.isEmpty()) {
                            item {
                                Text("No wallet transactions yet.", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                            }
                        } else {
                            items(walletLedger, key = { it.id }) { entry ->
                                Surface(
                                    color = SurfaceSoft,
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, BrandBorder),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(entry.description, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                            Text("Bucket: ${entry.coinBucket.uppercase()}", style = MaterialTheme.typography.labelSmall, color = BrandMuted)
                                        }
                                        Text(
                                            text = if (entry.coinDelta >= 0) "+${entry.coinDelta}" else "${entry.coinDelta}",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = if (entry.coinDelta >= 0) BrandEmerald else LiveCrimson,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Tab 3: Wishlist
                3 -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        if (wishlistItems.isEmpty()) {
                            item { Text("No wishlist items saved yet.", color = BrandMuted) }
                        } else {
                            items(wishlistItems, key = { it.id }) { item ->
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
                                        MarketplaceImage(
                                            imageUrlOrKey = item.imageKey,
                                            contentDescription = item.productTitle,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier
                                                .size(54.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                        )
                                        Spacer(Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.productTitle, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                            Text(item.sellerName, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                        }
                                        Text(formatNaira(item.priceNaira), style = MaterialTheme.typography.titleSmall, color = BrandEmerald, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showShippingDialog) {
        var phone by remember(privateInfo) { mutableStateOf(privateInfo?.phone ?: "+234 800 000 0000") }
        var address by remember(privateInfo) { mutableStateOf(privateInfo?.shippingAddress ?: "") }
        var state by remember(privateInfo, selectedState) { mutableStateOf(privateInfo?.shippingState ?: selectedState) }

        AlertDialog(
            onDismissRequest = { showShippingDialog = false },
            title = { Text("Saved Shipping & Bid Details") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone Number") })
                    OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Street Address") })
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(NIGERIAN_STATES.take(10)) { st ->
                            FilterChip(selected = state == st, onClick = { state = st }, label = { Text(st) })
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (address.isNotBlank()) {
                            onSaveShippingSetup(phone, address, state)
                            showShippingDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                ) { Text("Save Details") }
            },
            dismissButton = {
                TextButton(onClick = { showShippingDialog = false }) { Text("Cancel") }
            }
        )
    }
}
