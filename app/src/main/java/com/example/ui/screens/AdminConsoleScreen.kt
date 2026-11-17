package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.core.formatNaira
import com.example.data.model.AuditLog
import com.example.data.model.Dispute
import com.example.data.model.Product
import com.example.data.model.SellerStorefront
import com.example.data.model.VirtualGift
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.GoldCoin
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminConsoleScreen(
    isAdmin: Boolean,
    sellers: List<SellerStorefront>,
    products: List<Product>,
    gifts: List<VirtualGift>,
    disputes: List<Dispute>,
    auditLogs: List<AuditLog>,
    onBack: () -> Unit,
    onVerifySeller: (String, Boolean) -> Unit,
    onModerateProduct: (String, String) -> Unit,
    onSaveGift: (String?, String, String, Long, String) -> Unit,
    onResolveDispute: (String, String, String) -> Unit
) {
    BackHandler { onBack() }

    if (!isAdmin) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Restricted Console") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                )
            }
        ) { inner ->
            Column(
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(inner)
                    .padding(24.dp)
            ) {
                Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = LiveCrimson)
                Spacer(Modifier.height(10.dp))
                Text("Admin privileges required", style = MaterialTheme.typography.headlineSmall)
                Text("Only authorized platform administrators can access the Admin Console.", color = BrandMuted)
            }
        }
        return
    }

    var selectedTab by remember { mutableIntStateOf(0) }
    var showGiftDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = Color.White,
        topBar = {
            TopAppBar(
                title = { Text("Admin RBAC Console", style = MaterialTheme.typography.titleLarge) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
            TabRow(selectedTabIndex = selectedTab, containerColor = Color.White, contentColor = BrandNavy) {
                listOf("Sellers", "Moderation", "Gifts", "Disputes", "Audit").forEachIndexed { idx, label ->
                    Tab(selected = selectedTab == idx, onClick = { selectedTab = idx }, text = { Text(label) })
                }
            }

            when (selectedTab) {
                0 -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (sellers.isEmpty()) {
                            item { Text("No sellers available yet.", color = BrandMuted) }
                        } else {
                            items(sellers, key = { it.id }) { seller ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(seller.businessName, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                                if (seller.verified) {
                                                    Spacer(Modifier.width(4.dp))
                                                    Icon(Icons.Default.Verified, contentDescription = null, tint = BrandEmerald)
                                                }
                                            }
                                            Text("${seller.stateLocation} • Status: ${seller.status}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                        }
                                        Button(
                                            onClick = { onVerifySeller(seller.id, !seller.verified) },
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = if (seller.verified) BrandMuted else BrandEmerald
                                            ),
                                            modifier = Modifier.testTag("verify_seller_${seller.id}")
                                        ) {
                                            Text(if (seller.verified) "Revoke" else "Verify")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                1 -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (products.isEmpty()) {
                            item { Text("No products available yet. Check back soon for new arrivals.", color = BrandMuted) }
                        } else {
                            items(products, key = { it.id }) { prod ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(prod.title, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                            Text("${prod.sellerName} • ${formatNaira(prod.priceNaira)} • ${prod.status}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                        }
                                        OutlinedButton(onClick = {
                                            onModerateProduct(prod.id, if (prod.status == "active") "flagged" else "active")
                                        }) {
                                            Text(if (prod.status == "active") "Flag" else "Restore", color = LiveCrimson)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                2 -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        item {
                            Button(
                                onClick = { showGiftDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text("Add Virtual Gift")
                            }
                        }
                        items(gifts, key = { it.id }) { gift ->
                            Surface(
                                color = SurfaceSoft,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(12.dp)
                                ) {
                                    Column {
                                        Text(gift.name, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                        Text("${gift.category} • Animation: ${gift.animationType}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                    }
                                    Text("${gift.coinCost} Coins", style = MaterialTheme.typography.titleSmall, color = GoldCoin, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                3 -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (disputes.isEmpty()) {
                            item { Text("No open Trust & Safety disputes.", color = BrandMuted) }
                        } else {
                            items(disputes, key = { it.id }) { dispute ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text("${dispute.targetType.uppercase()} (${dispute.status})", style = MaterialTheme.typography.labelLarge, color = LiveCrimson)
                                        Text(dispute.reason, style = MaterialTheme.typography.bodyMedium, color = BrandSlate)
                                        if (dispute.status == "open") {
                                            Spacer(Modifier.height(8.dp))
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Button(
                                                    onClick = { onResolveDispute(dispute.id, "resolved", "Reviewed & resolved by Admin") },
                                                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                                                ) { Text("Resolve") }
                                                OutlinedButton(
                                                    onClick = { onResolveDispute(dispute.id, "dismissed", "No policy violation found") }
                                                ) { Text("Dismiss") }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                4 -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (auditLogs.isEmpty()) {
                            item { Text("No admin actions logged yet.", color = BrandMuted) }
                        } else {
                            items(auditLogs, key = { it.id }) { log ->
                                Surface(
                                    color = BrandEmeraldSoft,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(log.action, style = MaterialTheme.typography.titleSmall, color = BrandNavy)
                                        Text(log.summary, style = MaterialTheme.typography.bodySmall, color = BrandSlate)
                                        Text("By ${log.adminEmail} • ${log.targetPath}", style = MaterialTheme.typography.labelSmall, color = BrandMuted)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showGiftDialog) {
        var name by remember { mutableStateOf("") }
        var category by remember { mutableStateOf("VIP") }
        var cost by remember { mutableStateOf("100") }
        var animType by remember { mutableStateOf("burst") }
        AlertDialog(
            onDismissRequest = { showGiftDialog = false },
            title = { Text("Create Virtual Gift") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Gift Name") })
                    OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category") })
                    OutlinedTextField(value = cost, onValueChange = { cost = it.filter(Char::isDigit) }, label = { Text("Coin Cost") })
                    OutlinedTextField(value = animType, onValueChange = { animType = it }, label = { Text("Animation (float/burst/fullscreen)") })
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            onSaveGift(null, name, category, cost.toLongOrNull() ?: 50L, animType)
                            showGiftDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                ) { Text("Save Gift") }
            },
            dismissButton = {
                TextButton(onClick = { showGiftDialog = false }) { Text("Cancel") }
            }
        )
    }
}
