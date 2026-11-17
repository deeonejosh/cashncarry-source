package com.example.ui.screens

import android.content.Intent
import android.media.MediaPlayer
import android.net.Uri
import android.provider.OpenableColumns
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.VideoView
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Comment
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.core.formatCompactCount
import com.example.core.formatNaira
import com.example.data.model.Product
import com.example.data.model.ShortVideo
import com.example.data.model.UiState
import com.example.data.model.VideoComment
import com.example.ui.components.MarketplaceImage
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.LiveCrimsonSoft
import com.example.ui.theme.SurfaceSoft

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VideoFeedScreen(
    shortVideosState: UiState<List<ShortVideo>>,
    allProducts: List<Product>,
    followingSellerIds: List<String>,
    activeVideoComments: List<VideoComment>,
    currentUserId: String,
    isApprovedSeller: Boolean,
    isPendingSeller: Boolean,
    isUploadingVideo: Boolean,
    videoUploadProgress: Float,
    videoUploadError: String?,
    onSelectVideoForComments: (String) -> Unit,
    onLikeVideo: (String) -> Unit,
    onCommentVideo: (String, String) -> Unit,
    onToggleFollowSeller: (String) -> Unit,
    onAddToCart: (Product) -> Unit,
    onBuyNow: (Product) -> Unit,
    onOpenProduct: (Product) -> Unit,
    onWatchLive: (String) -> Unit,
    onRetryVideos: () -> Unit,
    onRequireSignIn: () -> Unit,
    onOpenSellerOnboarding: () -> Unit,
    onUploadVideo: (videoUri: Uri, title: String, caption: String, product: Product, onSuccess: () -> Unit) -> Unit,
    onClearUploadError: () -> Unit,
    onDeleteVideo: (String) -> Unit
) {
    val context = LocalContext.current
    var feedFilter by remember { mutableStateOf("For You") }
    var isMuted by remember { mutableStateOf(false) }
    var commentSheetVideoId by remember { mutableStateOf<String?>(null) }
    var newComment by remember { mutableStateOf("") }
    var showUploadSheet by remember { mutableStateOf(false) }
    var showBecomeSellerDialog by remember { mutableStateOf(false) }
    var showPendingSellerDialog by remember { mutableStateOf(false) }
    var pendingDeleteVideo by remember { mutableStateOf<ShortVideo?>(null) }

    val allVideos = (shortVideosState as? UiState.Success)?.data ?: emptyList()
    val displayVideos = remember(allVideos, feedFilter, followingSellerIds) {
        when (feedFilter) {
            "Following" -> allVideos.filter { followingSellerIds.contains(it.sellerId) }
            "Trending" -> allVideos.sortedByDescending { it.likesCount + it.commentsCount }
            else -> allVideos
        }
    }
    val sellerPublishedProducts = remember(allProducts, currentUserId) {
        allProducts.filter { it.sellerId == currentUserId && it.status == "active" }
    }

    fun handleUploadTap() {
        when {
            currentUserId.isBlank() -> onRequireSignIn()
            isApprovedSeller -> {
                onClearUploadError()
                showUploadSheet = true
            }
            isPendingSeller -> showPendingSellerDialog = true
            else -> showBecomeSellerDialog = true
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when (shortVideosState) {
            is UiState.Loading -> {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .testTag("videos_loading_indicator")
                ) {
                    CircularProgressIndicator(color = BrandEmerald)
                }
            }

            is UiState.Error -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp)
                        .testTag("videos_error_state")
                ) {
                    Icon(
                        imageVector = Icons.Default.ErrorOutline,
                        contentDescription = null,
                        tint = LiveCrimson,
                        modifier = Modifier.size(44.dp)
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = "Unable to load video feed",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = shortVideosState.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.78f),
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(14.dp))
                    Button(
                        onClick = onRetryVideos,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                        modifier = Modifier
                            .height(48.dp)
                            .testTag("videos_retry_button")
                    ) {
                        Text("Retry", fontWeight = FontWeight.Bold)
                    }
                }
            }

            is UiState.Success -> {
                if (allVideos.isEmpty()) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                            .testTag("videos_empty_state")
                    ) {
                        Icon(
                            imageVector = Icons.Default.VideoLibrary,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = "No videos have been posted yet.",
                            style = MaterialTheme.typography.titleLarge,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = if (isApprovedSeller) {
                                "Upload your first vertical product reel to showcase inventory to Nigerian buyers."
                            } else {
                                "Approved Cash N Carry sellers can post vertical product videos here."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.75f),
                            textAlign = TextAlign.Center
                        )
                        if (isApprovedSeller) {
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = { handleUploadTap() },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                modifier = Modifier.height(48.dp)
                            ) {
                                Text("Upload Video", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else if (displayVideos.isEmpty()) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                    ) {
                        Text(
                            text = "No videos in $feedFilter yet.",
                            style = MaterialTheme.typography.titleLarge,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = { feedFilter = "For You" },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                            modifier = Modifier.height(48.dp)
                        ) {
                            Text("Show For You Feed")
                        }
                    }
                } else {
                    val pagerState = rememberPagerState(pageCount = { displayVideos.size })
                    VerticalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize()
                    ) { page ->
                        val video = displayVideos[page]
                        val linkedProduct = allProducts.find { it.id == video.productId }
                        val isFollowing = video.followingSeller || followingSellerIds.contains(video.sellerId)
                        val isOwner = currentUserId.isNotBlank() && video.sellerId == currentUserId && isApprovedSeller

                        Box(modifier = Modifier.fillMaxSize()) {
                            ShortVideoPlayerBox(
                                video = video,
                                isActive = pagerState.currentPage == page,
                                isMuted = isMuted,
                                modifier = Modifier.fillMaxSize()
                            )

                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                Color.Black.copy(alpha = 0.45f),
                                                Color.Transparent,
                                                Color.Black.copy(alpha = 0.88f)
                                            )
                                        )
                                    )
                            )

                            // Right action rail
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(14.dp),
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(end = 12.dp, bottom = 146.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    IconButton(
                                        onClick = { onLikeVideo(video.id) },
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.5f))
                                            .testTag("video_like_${video.id}")
                                    ) {
                                        Icon(
                                            Icons.Default.Favorite,
                                            contentDescription = "Like video",
                                            tint = if (video.likedByViewer) LiveCrimson else Color.White
                                        )
                                    }
                                    Text(formatCompactCount(video.likesCount), style = MaterialTheme.typography.labelSmall, color = Color.White)
                                }

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    IconButton(
                                        onClick = {
                                            onSelectVideoForComments(video.id)
                                            commentSheetVideoId = video.id
                                        },
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.5f))
                                            .testTag("video_comment_${video.id}")
                                    ) {
                                        Icon(Icons.AutoMirrored.Filled.Comment, contentDescription = "Comments", tint = Color.White)
                                    }
                                    Text(formatCompactCount(video.commentsCount), style = MaterialTheme.typography.labelSmall, color = Color.White)
                                }

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    IconButton(
                                        onClick = {
                                            val share = Intent(Intent.ACTION_SEND).apply {
                                                type = "text/plain"
                                                putExtra(
                                                    Intent.EXTRA_TEXT,
                                                    "Watch ${video.title} on Cash N Carry: https://www.cashncarryng.com/reels/${video.id}"
                                                )
                                            }
                                            context.startActivity(Intent.createChooser(share, "Share Video"))
                                        },
                                        modifier = Modifier
                                            .size(48.dp)
                                            .clip(CircleShape)
                                            .background(Color.Black.copy(alpha = 0.5f))
                                    ) {
                                        Icon(Icons.Default.Share, contentDescription = "Share video", tint = Color.White)
                                    }
                                    Text("Share", style = MaterialTheme.typography.labelSmall, color = Color.White)
                                }

                                if (isOwner) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        IconButton(
                                            onClick = { pendingDeleteVideo = video },
                                            modifier = Modifier
                                                .size(48.dp)
                                                .clip(CircleShape)
                                                .background(LiveCrimson.copy(alpha = 0.8f))
                                                .testTag("video_delete_${video.id}")
                                        ) {
                                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete video", tint = Color.White)
                                        }
                                        Text("Delete", style = MaterialTheme.typography.labelSmall, color = Color.White)
                                    }
                                }
                            }

                            // Bottom Info & Shoppable Product Card
                            Column(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .fillMaxWidth()
                                    .padding(start = 16.dp, end = 74.dp, bottom = 18.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "@${video.sellerName}",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (video.sellerVerified) {
                                        Spacer(Modifier.width(4.dp))
                                        Icon(
                                            imageVector = Icons.Default.Verified,
                                            contentDescription = "Verified seller",
                                            tint = BrandEmerald,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                    Spacer(Modifier.width(10.dp))
                                    Surface(
                                        color = if (isFollowing) Color.White.copy(alpha = 0.2f) else BrandEmerald,
                                        shape = RoundedCornerShape(50),
                                        modifier = Modifier.clickable { onToggleFollowSeller(video.sellerId) }
                                    ) {
                                        Text(
                                            text = if (isFollowing) "Following" else "Follow",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                                Spacer(Modifier.height(6.dp))
                                Text(video.title, style = MaterialTheme.typography.titleSmall, color = Color.White)
                                Text(
                                    text = video.caption,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White.copy(alpha = 0.85f),
                                    maxLines = 2
                                )
                                Spacer(Modifier.height(10.dp))

                                val productPrice = linkedProduct?.priceNaira ?: video.productPriceNaira
                                val productTitle = linkedProduct?.title ?: video.productTitle
                                if (productTitle.isNotBlank()) {
                                    Surface(
                                        color = Color.White.copy(alpha = 0.94f),
                                        shape = RoundedCornerShape(16.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                if (linkedProduct != null) onOpenProduct(linkedProduct)
                                            }
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(10.dp)
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = productTitle,
                                                    style = MaterialTheme.typography.titleSmall,
                                                    color = BrandSlate,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = formatNaira(productPrice),
                                                    style = MaterialTheme.typography.labelLarge,
                                                    color = BrandEmerald,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                            if (linkedProduct != null) {
                                                if (linkedProduct.liveStreamId.isNotBlank()) {
                                                    IconButton(onClick = { onWatchLive(linkedProduct.liveStreamId) }) {
                                                        Icon(Icons.Default.LiveTv, contentDescription = "Watch Live", tint = LiveCrimson)
                                                    }
                                                }
                                                IconButton(onClick = { onAddToCart(linkedProduct) }) {
                                                    Icon(Icons.Default.AddShoppingCart, contentDescription = "Add to cart", tint = BrandEmerald)
                                                }
                                                Button(
                                                    onClick = { onBuyNow(linkedProduct) },
                                                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                                    modifier = Modifier.height(34.dp)
                                                ) {
                                                    Text("Buy", style = MaterialTheme.typography.labelMedium)
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
        }

        // Top Bar: Feed Switcher Pills + Mute + Upload Action
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("Following", "For You", "Trending").forEach { tab ->
                    FilterChip(
                        selected = feedFilter == tab,
                        onClick = { feedFilter = tab },
                        label = { Text(tab) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color.White,
                            selectedLabelColor = BrandSlate,
                            containerColor = Color.Black.copy(alpha = 0.5f),
                            labelColor = Color.White
                        )
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                IconButton(
                    onClick = { isMuted = !isMuted },
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.55f))
                        .testTag("video_mute_toggle")
                ) {
                    Icon(
                        imageVector = if (isMuted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
                        contentDescription = if (isMuted) "Unmute video" else "Mute video",
                        tint = Color.White
                    )
                }
                IconButton(
                    onClick = { handleUploadTap() },
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(BrandEmerald)
                        .testTag("reels_upload_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Upload video",
                        tint = Color.White
                    )
                }
            }
        }
    }

    if (commentSheetVideoId != null) {
        val vid = commentSheetVideoId!!
        ModalBottomSheet(
            onDismissRequest = { commentSheetVideoId = null },
            containerColor = Color.White
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Video Comments", style = MaterialTheme.typography.titleLarge, color = BrandSlate)
                Spacer(Modifier.height(10.dp))
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp)
                ) {
                    if (activeVideoComments.isEmpty()) {
                        item {
                            Text("No comments yet. Ask the seller about sizing, delivery, or warranty!", color = BrandMuted)
                        }
                    } else {
                        items(activeVideoComments, key = { it.id }) { comment ->
                            Surface(
                                color = SurfaceSoft,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(comment.userName, style = MaterialTheme.typography.titleSmall, color = BrandSlate)
                                    Text(comment.text, style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = newComment,
                        onValueChange = { newComment = it },
                        placeholder = { Text("Add a comment...") },
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = {
                            if (newComment.isNotBlank()) {
                                onCommentVideo(vid, newComment)
                                newComment = ""
                            }
                        }
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Post comment", tint = BrandEmerald)
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    if (showBecomeSellerDialog) {
        AlertDialog(
            onDismissRequest = { showBecomeSellerDialog = false },
            title = { Text("Become a Seller", fontWeight = FontWeight.Bold) },
            text = {
                Text("Only approved sellers can upload videos to the For You feed. Apply to sell on Cash N Carry to verify your store.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        showBecomeSellerDialog = false
                        onOpenSellerOnboarding()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    modifier = Modifier.testTag("start_selling_dialog_button")
                ) {
                    Text("Start Selling")
                }
            },
            dismissButton = {
                TextButton(onClick = { showBecomeSellerDialog = false }) { Text("Close") }
            }
        )
    }

    if (showPendingSellerDialog) {
        AlertDialog(
            onDismissRequest = { showPendingSellerDialog = false },
            title = { Text("Seller Verification Pending", fontWeight = FontWeight.Bold) },
            text = {
                Text("Your seller account is awaiting approval. Video uploads unlock as soon as an admin approves your seller application.")
            },
            confirmButton = {
                Button(
                    onClick = { showPendingSellerDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandOrange)
                ) {
                    Text("OK")
                }
            }
        )
    }

    if (pendingDeleteVideo != null) {
        val target = pendingDeleteVideo!!
        AlertDialog(
            onDismissRequest = { pendingDeleteVideo = null },
            title = { Text("Delete Video?") },
            text = { Text("Remove \"${target.title}\" permanently from Cash N Carry?") },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteVideo(target.id)
                        pendingDeleteVideo = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LiveCrimson)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteVideo = null }) { Text("Cancel") }
            }
        )
    }

    if (showUploadSheet) {
        var pickedVideoUri by remember { mutableStateOf<Uri?>(null) }
        var pickedVideoLabel by remember { mutableStateOf("") }
        var videoTitle by remember { mutableStateOf("") }
        var videoCaption by remember { mutableStateOf("") }
        var selectedProduct by remember(sellerPublishedProducts) {
            mutableStateOf(sellerPublishedProducts.firstOrNull())
        }
        var localValidationError by remember { mutableStateOf<String?>(null) }

        val videoPickerLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.PickVisualMedia()
        ) { uri ->
            if (uri != null) {
                pickedVideoUri = uri
                localValidationError = null
                pickedVideoLabel = runCatching {
                    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                        ?.use { cursor ->
                            val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            if (cursor.moveToFirst() && idx >= 0) cursor.getString(idx) else null
                        }
                }.getOrNull() ?: (uri.lastPathSegment ?: "Selected video file")
            }
        }

        ModalBottomSheet(
            onDismissRequest = { if (!isUploadingVideo) showUploadSheet = false },
            containerColor = Color.White
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text("Upload Shoppable Video", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = BrandSlate)

                OutlinedButton(
                    onClick = {
                        videoPickerLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly)
                        )
                    },
                    enabled = !isUploadingVideo,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("pick_video_file_button")
                ) {
                    Icon(Icons.Default.UploadFile, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = if (pickedVideoLabel.isBlank()) "Choose Video File (MP4 / WebM)" else pickedVideoLabel,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                OutlinedTextField(
                    value = videoTitle,
                    onValueChange = { videoTitle = it.take(120) },
                    label = { Text("Video Title *") },
                    singleLine = true,
                    enabled = !isUploadingVideo,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("upload_video_title_input")
                )

                OutlinedTextField(
                    value = videoCaption,
                    onValueChange = { videoCaption = it.take(300) },
                    label = { Text("Caption") },
                    minLines = 2,
                    enabled = !isUploadingVideo,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("upload_video_caption_input")
                )

                Text("Pin Your Published Product *", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = BrandSlate)
                if (sellerPublishedProducts.isEmpty()) {
                    Text(
                        text = "Publish a product in Seller Centre first before posting a shoppable video.",
                        style = MaterialTheme.typography.bodySmall,
                        color = LiveCrimson
                    )
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(sellerPublishedProducts, key = { it.id }) { prod ->
                            FilterChip(
                                selected = selectedProduct?.id == prod.id,
                                onClick = { selectedProduct = prod },
                                label = { Text(prod.title.take(22)) }
                            )
                        }
                    }
                }

                if (isUploadingVideo) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        LinearProgressIndicator(
                            progress = { videoUploadProgress.coerceIn(0f, 1f) },
                            color = BrandEmerald,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = "Uploading video... ${(videoUploadProgress * 100).toInt()}%",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandMuted
                        )
                    }
                }

                val activeError = localValidationError ?: videoUploadError
                if (!activeError.isNullOrBlank()) {
                    Surface(
                        color = LiveCrimsonSoft,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.3f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = activeError,
                            style = MaterialTheme.typography.bodySmall,
                            color = LiveCrimson,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                Button(
                    onClick = {
                        val uri = pickedVideoUri
                        val prod = selectedProduct
                        when {
                            uri == null -> localValidationError = "Select a video file first."
                            videoTitle.trim().length < 2 -> localValidationError = "Enter a video title."
                            prod == null -> localValidationError = "Select one of your published products to link."
                            else -> {
                                localValidationError = null
                                onUploadVideo(
                                    uri,
                                    videoTitle.trim(),
                                    videoCaption.trim().ifBlank { "Shop ${prod.title} on Cash N Carry!" },
                                    prod
                                ) {
                                    showUploadSheet = false
                                }
                            }
                        }
                    },
                    enabled = !isUploadingVideo && sellerPublishedProducts.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("submit_video_upload_button")
                ) {
                    Text(if (isUploadingVideo) "Uploading..." else "Upload & Publish", fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(14.dp))
            }
        }
    }
}

@Composable
private fun ShortVideoPlayerBox(
    video: ShortVideo,
    isActive: Boolean,
    isMuted: Boolean,
    modifier: Modifier = Modifier
) {
    var mediaPlayer by remember(video.id, video.videoUrl) { mutableStateOf<MediaPlayer?>(null) }
    var videoViewRef by remember(video.id, video.videoUrl) { mutableStateOf<VideoView?>(null) }

    LaunchedEffect(isMuted, mediaPlayer) {
        val vol = if (isMuted) 0f else 1f
        runCatching { mediaPlayer?.setVolume(vol, vol) }
    }

    LaunchedEffect(isActive, videoViewRef) {
        val view = videoViewRef ?: return@LaunchedEffect
        runCatching {
            if (isActive) {
                if (!view.isPlaying) view.start()
            } else {
                if (view.isPlaying) view.pause()
            }
        }
    }

    Box(modifier = modifier.background(Color.Black)) {
        val poster = video.coverKey.ifBlank { video.productImageUrl }
        if (poster.isNotBlank()) {
            MarketplaceImage(
                imageUrlOrKey = poster,
                contentDescription = video.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
        if (video.videoUrl.isNotBlank()) {
            DisposableEffect(video.id, video.videoUrl) {
                onDispose {
                    runCatching { videoViewRef?.stopPlayback() }
                    mediaPlayer = null
                    videoViewRef = null
                }
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
                                val vol = if (isMuted) 0f else 1f
                                mp.setVolume(vol, vol)
                                mediaPlayer = mp
                                if (isActive) start()
                            }
                            setOnErrorListener { _, _, _ -> true }
                            setVideoURI(Uri.parse(video.videoUrl))
                        }
                        videoViewRef = vv
                        addView(vv)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}
