package com.example.ui.screens

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.core.MARKETPLACE_CATEGORIES
import com.example.core.formatCountdown
import com.example.core.formatNaira
import com.example.data.model.Auction
import com.example.data.model.AuctionBid
import com.example.data.model.Livestream
import com.example.data.model.UiState
import com.example.ui.components.LiveAuctionCard
import com.example.ui.components.LivestreamCard
import com.example.ui.components.resolveDrawableRes
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.FlashAmberSoft
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiveHubScreen(
    livestreamsState: UiState<List<Livestream>>,
    auctionsState: UiState<List<Auction>>,
    activeAuctionBids: List<AuctionBid>,
    followingSellerIds: List<String>,
    currentUserId: String,
    hasSavedShippingReady: Boolean,
    selectedState: String,
    selectedAddress: String,
    onOpenStream: (String) -> Unit,
    onGoLive: () -> Unit,
    onRetry: () -> Unit,
    onSelectAuction: (String) -> Unit,
    onPlaceBid: (Auction, Long) -> Unit,
    onClaimWonAuction: (Auction, String, String, (String) -> Unit) -> Unit,
    onOpenShippingSetup: () -> Unit,
    onOrderCreated: (String) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedCategory by remember { mutableStateOf("All") }
    var inspectedAuction by remember { mutableStateOf<Auction?>(null) }

    val streams = (livestreamsState as? UiState.Success)?.data ?: emptyList()
    val auctions = (auctionsState as? UiState.Success)?.data ?: emptyList()

    val filteredStreams = remember(streams, selectedTab, selectedCategory, followingSellerIds) {
        streams.filter { stream ->
            val catOk = selectedCategory == "All" || stream.category.equals(selectedCategory, ignoreCase = true)
            val tabOk = when (selectedTab) {
                0 -> stream.status == "live"
                2 -> stream.status == "scheduled"
                3 -> followingSellerIds.contains(stream.sellerId)
                else -> true
            }
            catOk && tabOk
        }
    }

    Scaffold(
        containerColor = Color.White,
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onGoLive,
                containerColor = LiveCrimson,
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Videocam, contentDescription = "Go Live") },
                text = { Text("Go Live", fontWeight = FontWeight.Bold) },
                modifier = Modifier.testTag("go_live_fab")
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LiveTv, contentDescription = null, tint = LiveCrimson)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "LIVE Shopping & Auctions",
                        style = MaterialTheme.typography.headlineSmall,
                        color = BrandSlate
                    )
                }
                Text(
                    text = "Watch real-time product demos, flash drops & live Naira auctions.",
                    style = MaterialTheme.typography.bodySmall,
                    color = BrandMuted
                )
            }

            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = BrandEmerald
            ) {
                listOf("Live Now", "Auctions", "Scheduled", "Following").forEachIndexed { idx, title ->
                    Tab(
                        selected = selectedTab == idx,
                        onClick = { selectedTab = idx },
                        text = { Text(title, maxLines = 1) }
                    )
                }
            }

            if (selectedTab != 1) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(MARKETPLACE_CATEGORIES) { cat ->
                        FilterChip(
                            selected = selectedCategory == cat,
                            onClick = { selectedCategory = cat },
                            label = { Text(cat) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BrandNavy,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
            }

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                if (selectedTab == 1) {
                    if (!hasSavedShippingReady) {
                        item {
                            Surface(
                                color = FlashAmberSoft,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, FlashAmber),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable(onClick = onOpenShippingSetup)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(14.dp)
                                ) {
                                    Icon(Icons.Default.Gavel, contentDescription = null, tint = FlashAmber)
                                    Spacer(Modifier.width(10.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Complete Bidding Setup",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = BrandSlate
                                        )
                                        Text(
                                            text = "Tap to save your Nigerian shipping state & address before placing live bids.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = BrandMuted
                                        )
                                    }
                                    Text("Setup", color = FlashAmber, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    when (auctionsState) {
                        is UiState.Loading -> {
                            item {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.fillMaxWidth().padding(32.dp)
                                ) {
                                    androidx.compose.material3.CircularProgressIndicator(color = BrandEmerald)
                                }
                            }
                        }
                        is UiState.Error -> {
                            item {
                                ErrorRetryLiveState(
                                    message = auctionsState.message,
                                    onRetry = onRetry
                                )
                            }
                        }
                        is UiState.Success -> {
                            if (auctions.isEmpty()) {
                                item {
                                    EmptyLiveState("No active auctions right now", "Check back soon or launch an auction from Seller Centre.")
                                }
                            } else {
                                items(auctions, key = { it.id }) { auction ->
                                    LiveAuctionCard(
                                        auction = auction,
                                        currentUserId = currentUserId,
                                        onInspect = {
                                            onSelectAuction(auction.id)
                                            inspectedAuction = auction
                                        },
                                        onQuickBid = { nextBid ->
                                            if (!hasSavedShippingReady) {
                                                onOpenShippingSetup()
                                            } else {
                                                onPlaceBid(auction, nextBid)
                                            }
                                        },
                                        onClaimWin = {
                                            onClaimWonAuction(auction, selectedState, selectedAddress, onOrderCreated)
                                        }
                                    )
                                }
                            }
                        }
                    }
                } else {
                    when (livestreamsState) {
                        is UiState.Loading -> {
                            item {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.fillMaxWidth().padding(32.dp)
                                ) {
                                    androidx.compose.material3.CircularProgressIndicator(color = BrandEmerald)
                                }
                            }
                        }
                        is UiState.Error -> {
                            item {
                                ErrorRetryLiveState(
                                    message = livestreamsState.message,
                                    onRetry = onRetry
                                )
                            }
                        }
                        is UiState.Success -> {
                            if (filteredStreams.isEmpty()) {
                                item {
                                    EmptyLiveState(
                                        title = if (selectedTab == 3) "No followed sellers are live" else "No one is live right now.",
                                        subtitle = "Verified Cash N Carry sellers appear here when live broadcasting begins."
                                    )
                                }
                            } else {
                                val rows = filteredStreams.chunked(2)
                                items(rows) { row ->
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        row.forEach { stream ->
                                            LivestreamCard(
                                                stream = stream,
                                                onClick = { onOpenStream(stream.id) },
                                                modifier = Modifier.weight(1f)
                                            )
                                        }
                                        if (row.size == 1) Spacer(Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    val selectedAuction = inspectedAuction?.let { target ->
        auctions.find { it.id == target.id } ?: target
    }
    if (selectedAuction != null) {
        ModalBottomSheet(
            onDismissRequest = { inspectedAuction = null },
            containerColor = Color.White
        ) {
            AuctionDetailSheet(
                auction = selectedAuction,
                bids = activeAuctionBids,
                currentUserId = currentUserId,
                hasSavedShippingReady = hasSavedShippingReady,
                onPlaceBid = { amt ->
                    if (!hasSavedShippingReady) {
                        inspectedAuction = null
                        onOpenShippingSetup()
                    } else {
                        onPlaceBid(selectedAuction, amt)
                    }
                },
                onClaimWin = {
                    onClaimWonAuction(selectedAuction, selectedState, selectedAddress) { orderId ->
                        inspectedAuction = null
                        onOrderCreated(orderId)
                    }
                }
            )
        }
    }
}

@Composable
private fun AuctionDetailSheet(
    auction: Auction,
    bids: List<AuctionBid>,
    currentUserId: String,
    hasSavedShippingReady: Boolean,
    onPlaceBid: (Long) -> Unit,
    onClaimWin: () -> Unit
) {
    val nextBid = auction.currentBidNaira + auction.minIncrementNaira
    val isEnded = auction.status != "live" || auction.endsAtEpochMs <= System.currentTimeMillis()
    val isWinner = isEnded && auction.highestBidderId == currentUserId

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp)
    ) {
        Text(auction.productTitle, style = MaterialTheme.typography.headlineSmall, color = BrandSlate)
        Text(
            text = "Seller: ${auction.sellerName} • Anti-sniping +30s rule active",
            style = MaterialTheme.typography.bodySmall,
            color = BrandMuted
        )
        Spacer(Modifier.height(12.dp))
        Surface(
            color = BrandEmeraldSoft,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(14.dp)
            ) {
                Column {
                    Text("Highest Bid", style = MaterialTheme.typography.labelMedium, color = BrandMuted)
                    Text(
                        text = formatNaira(auction.currentBidNaira),
                        style = MaterialTheme.typography.headlineMedium,
                        color = BrandEmerald,
                        fontWeight = FontWeight.Bold
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Min Increment", style = MaterialTheme.typography.labelMedium, color = BrandMuted)
                    Text(formatNaira(auction.minIncrementNaira), style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        if (!isEnded) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = { onPlaceBid(nextBid) },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                ) {
                    Text(
                        text = if (hasSavedShippingReady) "Bid ${formatNaira(nextBid)}" else "Setup & Bid",
                        fontWeight = FontWeight.Bold
                    )
                }
                OutlinedButton(
                    onClick = { onPlaceBid(nextBid + auction.minIncrementNaira * 2) },
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.height(48.dp)
                ) {
                    Text("+${formatNaira(auction.minIncrementNaira * 3)}")
                }
            }
        } else if (isWinner) {
            Button(
                onClick = onClaimWin,
                colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text("Generate Winning Order", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(14.dp))
        Text("Live Bid History", style = MaterialTheme.typography.titleSmall, color = BrandSlate)
        Spacer(Modifier.height(6.dp))
        if (bids.isEmpty()) {
            Text("No bids yet. Be the first bidder!", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
        } else {
            bids.take(6).forEach { bid ->
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Text(bid.bidderName, style = MaterialTheme.typography.bodyMedium, color = BrandSlate)
                    Text(formatNaira(bid.amountNaira), style = MaterialTheme.typography.titleSmall, color = BrandEmerald)
                }
            }
        }
        Spacer(Modifier.height(22.dp))
    }
}

@Composable
private fun ErrorRetryLiveState(
    message: String,
    onRetry: () -> Unit
) {
    Surface(
        color = LiveCrimson.copy(alpha = 0.08f),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.28f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp)
        ) {
            Text("Unable to load data", style = MaterialTheme.typography.titleMedium, color = LiveCrimson, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(message, style = MaterialTheme.typography.bodySmall, color = BrandSlate)
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                modifier = Modifier.height(48.dp)
            ) {
                Text("Retry", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun EmptyLiveState(title: String, subtitle: String) {
    Surface(
        color = SurfaceSoft,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, BrandBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(28.dp)
        ) {
            Icon(Icons.Default.Schedule, contentDescription = null, tint = BrandMuted, modifier = Modifier.size(34.dp))
            Spacer(Modifier.height(8.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, color = BrandSlate)
            Spacer(Modifier.height(4.dp))
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
        }
    }
}
