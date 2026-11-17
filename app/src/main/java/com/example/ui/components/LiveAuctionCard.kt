package com.example.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColor
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.R
import com.example.core.formatCountdown
import com.example.core.formatNaira
import com.example.data.model.Auction
import com.example.data.repository.LiveCommerceRepository
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldDark
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandOrangeSoft
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft
import kotlinx.coroutines.delay

/**
 * Real-time synced LiveAuctionCard that subscribes to auction state
 * for real-time highest bid, bidder, countdown extension, and status updates.
 */
@Composable
fun LiveAuctionCard(
    auctionId: String,
    currentUserId: String,
    onInspect: (Auction) -> Unit,
    onQuickBid: (Auction, Long) -> Unit,
    onClaimWin: (Auction) -> Unit,
    modifier: Modifier = Modifier,
    liveRepository: LiveCommerceRepository? = null
) {
    val repo = liveRepository ?: remember {
        LiveCommerceRepository()
    }

    val auction by remember(repo, auctionId) {
        repo.observeAuction(auctionId)
    }.collectAsStateWithLifecycle(initialValue = null)

    val liveAuction = auction
    if (liveAuction == null) {
        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
            border = BorderStroke(1.dp, BrandBorder),
            modifier = modifier
                .fillMaxWidth()
                .height(148.dp)
                .testTag("auction_loading_$auctionId")
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CircularProgressIndicator(
                        color = BrandEmerald,
                        strokeWidth = 2.5.dp,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Syncing live auction...",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandMuted
                    )
                }
            }
        }
    } else {
        LiveAuctionCard(
            auction = liveAuction,
            currentUserId = currentUserId,
            onInspect = { onInspect(liveAuction) },
            onQuickBid = { nextBid -> onQuickBid(liveAuction, nextBid) },
            onClaimWin = { onClaimWin(liveAuction) },
            modifier = modifier
        )
    }
}

/**
 * Stateless/Model-driven LiveAuctionCard displaying the current highest bid,
 * real-time countdown timer synced to `endsAtEpochMs` & `status`,
 * and leading bidder state.
 */
@Composable
fun LiveAuctionCard(
    auction: Auction,
    currentUserId: String,
    onInspect: () -> Unit,
    onQuickBid: (Long) -> Unit,
    onClaimWin: () -> Unit,
    modifier: Modifier = Modifier
) {
    var remainingMs by remember(auction.id, auction.endsAtEpochMs, auction.status) {
        mutableLongStateOf(
            if (auction.status == "live") {
                (auction.endsAtEpochMs - System.currentTimeMillis()).coerceAtLeast(0L)
            } else {
                0L
            }
        )
    }

    LaunchedEffect(auction.id, auction.endsAtEpochMs, auction.status, auction.updatedAtEpochMs) {
        while (auction.status == "live" && auction.endsAtEpochMs > System.currentTimeMillis()) {
            remainingMs = (auction.endsAtEpochMs - System.currentTimeMillis()).coerceAtLeast(0L)
            delay(1000L)
        }
        remainingMs = if (auction.status == "live") {
            (auction.endsAtEpochMs - System.currentTimeMillis()).coerceAtLeast(0L)
        } else {
            0L
        }
    }

    val isUpcoming = auction.status == "upcoming"
    val isEnded = (!isUpcoming && auction.status != "live") || (!isUpcoming && remainingMs == 0L)
    val isEndingSoon = !isEnded && !isUpcoming && remainingMs <= 60_000L
    val isHighestBidder = auction.highestBidderId == currentUserId && currentUserId.isNotBlank()
    val nextBidAmount = auction.currentBidNaira + auction.minIncrementNaira

    val pulseTransition = rememberInfiniteTransition(label = "auction_pulse")
    val syncDotColor by pulseTransition.animateColor(
        initialValue = BrandEmerald,
        targetValue = Color(0xFF34D399),
        animationSpec = infiniteRepeatable(
            animation = tween(800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "sync_dot_color"
    )
    val timerPillColor by pulseTransition.animateColor(
        initialValue = if (isEndingSoon) LiveCrimson else BrandEmeraldDark,
        targetValue = if (isEndingSoon) BrandOrange else BrandEmerald,
        animationSpec = infiniteRepeatable(
            animation = tween(750),
            repeatMode = RepeatMode.Reverse
        ),
        label = "timer_pill_color"
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(
            width = 1.dp,
            color = if (isEndingSoon) LiveCrimson.copy(alpha = 0.45f) else BrandBorder
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onInspect)
            .testTag("auction_card_${auction.id}")
    ) {
        Column {
            // Top Status + Live Sync + Countdown Bar
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            if (isEnded) {
                                listOf(Color(0xFFF1F5F9), Color(0xFFF8FAFC))
                            } else {
                                listOf(BrandEmeraldSoft, BrandOrangeSoft)
                            }
                        )
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    when {
                        isEnded -> {
                            Surface(
                                color = BrandSlate,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = "ENDED",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                )
                            }
                        }
                        isUpcoming -> {
                            Surface(
                                color = BrandOrange,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = "UPCOMING",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                )
                            }
                        }
                        else -> {
                            Surface(
                                color = timerPillColor,
                                shape = RoundedCornerShape(50),
                                modifier = Modifier.testTag("auction_timer_${auction.id}")
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Timer,
                                        contentDescription = "Auction countdown",
                                        tint = Color.White,
                                        modifier = Modifier.size(13.dp)
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Text(
                                        text = if (isEndingSoon) {
                                            "ENDING • ${formatCountdown(remainingMs)}"
                                        } else {
                                            "LIVE • ${formatCountdown(remainingMs)}"
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(start = 2.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (isEnded) BrandMuted else syncDotColor)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = if (isEnded) "Finalized" else "Live Sync",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isEnded) BrandMuted else BrandEmeraldDark,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Text(
                    text = "${auction.bidCount} ${if (auction.bidCount == 1L) "bid" else "bids"}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = BrandSlate
                )
            }

            // Main Product & Highest Bid Content
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(92.dp)
                        .clip(RoundedCornerShape(14.dp))
                ) {
                    MarketplaceImage(
                        imageUrlOrKey = auction.productImageKey,
                        contentDescription = auction.productTitle,
                        modifier = Modifier.fillMaxSize()
                    )
                    Surface(
                        color = Color.Black.copy(alpha = 0.62f),
                        shape = RoundedCornerShape(topEnd = 10.dp),
                        modifier = Modifier.align(Alignment.BottomStart)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Gavel,
                            contentDescription = "Auction item",
                            tint = Color.White,
                            modifier = Modifier
                                .padding(5.dp)
                                .size(13.dp)
                        )
                    }
                }

                Spacer(Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = auction.productTitle,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = BrandSlate,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "By ${auction.sellerName}",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(Modifier.height(8.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (auction.bidCount > 0) "Current Highest Bid" else "Starting Bid",
                                style = MaterialTheme.typography.labelSmall,
                                color = BrandMuted
                            )
                            AnimatedContent(
                                targetState = auction.currentBidNaira,
                                transitionSpec = {
                                    (slideInVertically { -it / 2 } + fadeIn()) togetherWith
                                        (slideOutVertically { it / 2 } + fadeOut())
                                },
                                label = "highest_bid_anim"
                            ) { bidNaira ->
                                Text(
                                    text = formatNaira(bidNaira),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = BrandEmerald,
                                    modifier = Modifier.testTag("auction_highest_bid_${auction.id}")
                                )
                            }
                            Text(
                                text = "Min +${formatNaira(auction.minIncrementNaira)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = BrandMuted
                            )
                        }

                        Spacer(Modifier.width(8.dp))

                        if (!isEnded && !isUpcoming) {
                            Button(
                                onClick = { onQuickBid(nextBidAmount) },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandOrange,
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                                modifier = Modifier
                                    .height(48.dp)
                                    .testTag("quick_bid_${auction.id}")
                            ) {
                                Text(
                                    text = "Bid ${formatNaira(nextBidAmount)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else if (isEnded && isHighestBidder) {
                            Button(
                                onClick = onClaimWin,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandEmerald,
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                                modifier = Modifier
                                    .height(48.dp)
                                    .testTag("claim_auction_${auction.id}")
                            ) {
                                Text(
                                    text = "Pay & Claim",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    if (auction.highestBidderName.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Surface(
                            color = if (isHighestBidder) BrandEmeraldSoft else BrandOrangeSoft,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.EmojiEvents,
                                    contentDescription = "Highest bidder",
                                    tint = if (isHighestBidder) BrandEmerald else BrandOrange,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    text = if (isHighestBidder) {
                                        "You hold the highest bid!"
                                    } else {
                                        "Leading: ${auction.highestBidderName}"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (isHighestBidder) BrandEmeraldDark else BrandOrange,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
