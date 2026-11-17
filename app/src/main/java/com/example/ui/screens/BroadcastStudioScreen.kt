package com.example.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.HighQuality
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.StopCircle
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.core.MARKETPLACE_CATEGORIES
import com.example.core.formatNaira
import com.example.data.model.Livestream
import com.example.data.model.Product
import com.example.data.model.StreamMessage
import com.example.ui.components.AnimatedLiveBadge
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.FlashAmber
import com.example.ui.theme.LiveCrimson

@Composable
fun BroadcastStudioScreen(
    sellerProducts: List<Product>,
    activeStream: Livestream?,
    streamMessages: List<StreamMessage>,
    liveStreamingConfigured: Boolean = false,
    onBack: () -> Unit,
    onStartLive: (String, String, String, Product?, (String) -> Unit) -> Unit,
    onPinProduct: (String, Product) -> Unit,
    onLaunchFlashDeal: (String, String, Long) -> Unit,
    onLaunchAuction: (Product, Long, Long, Long) -> Unit,
    onSendHostChat: (String, String) -> Unit,
    onModeratorDeleteChat: (String, String) -> Unit,
    onEndLive: (String) -> Unit
) {
    BackHandler { onBack() }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPerm by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    var hasAudioPerm by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        hasCameraPerm = results[Manifest.permission.CAMERA] == true || hasCameraPerm
        hasAudioPerm = results[Manifest.permission.RECORD_AUDIO] == true || hasAudioPerm
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPerm || !hasAudioPerm) {
            permLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        }
    }

    var isFrontCamera by remember { mutableStateOf(true) }
    var isCameraEnabled by remember { mutableStateOf(true) }
    var isMicMuted by remember { mutableStateOf(false) }
    var qualityPreset by remember { mutableStateOf("1080p HD") }
    var streamTitle by remember { mutableStateOf("Lagos Flash Drop & Live Unboxing") }
    var streamCategory by remember { mutableStateOf("Fashion") }
    var selectedPinProduct by remember(sellerProducts) { mutableStateOf(sellerProducts.firstOrNull()) }
    var liveStreamId by remember(activeStream?.id) { mutableStateOf(activeStream?.id) }
    var chatText by remember { mutableStateOf("") }
    var showAuctionDialog by remember { mutableStateOf(false) }
    var showFlashDialog by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Real CameraX Preview
        if (hasCameraPerm && isCameraEnabled) {
            val previewView = remember { PreviewView(context) }
            DisposableEffect(isFrontCamera, isCameraEnabled, lifecycleOwner) {
                val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
                val executor = ContextCompat.getMainExecutor(context)
                var boundProvider: ProcessCameraProvider? = null
                cameraProviderFuture.addListener({
                    try {
                        val provider = cameraProviderFuture.get()
                        boundProvider = provider
                        val preview = Preview.Builder().build().apply {
                            surfaceProvider = previewView.surfaceProvider
                        }
                        val selector = if (isFrontCamera) {
                            CameraSelector.DEFAULT_FRONT_CAMERA
                        } else {
                            CameraSelector.DEFAULT_BACK_CAMERA
                        }
                        provider.unbindAll()
                        provider.bindToLifecycle(lifecycleOwner, selector, preview)
                    } catch (e: Exception) {
                        Log.w("BroadcastStudio", "CameraX preview unavailable on device: ${e.message}")
                    }
                }, executor)

                onDispose {
                    try {
                        boundProvider?.unbindAll()
                    } catch (_: Exception) {
                    }
                }
            }
            AndroidView(
                factory = { previewView },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .background(BrandNavy)
                    .padding(24.dp)
            ) {
                Icon(Icons.Default.VideocamOff, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(10.dp))
                Text(
                    text = if (!hasCameraPerm) "Camera permission needed for live video preview" else "Camera paused",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
                if (!hasCameraPerm) {
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            permLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                    ) {
                        Text("Grant Camera & Mic")
                    }
                }
            }
        }

        // Top Bar: LIVE status / Close
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Surface(
                color = Color.Black.copy(alpha = 0.55f),
                shape = RoundedCornerShape(50)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    AnimatedLiveBadge(text = if (liveStreamId != null) "ON AIR" else "STUDIO READY")
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = if (activeStream != null) "${activeStream.viewerCount} viewers • $qualityPreset" else qualityPreset,
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White
                    )
                }
            }

            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.55f))
            ) {
                Icon(Icons.Default.Close, contentDescription = "Exit Studio", tint = Color.White)
            }
        }

        // Vertical Right-Side Controls (Camera, Mic, Flip, Quality, End-Live)
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp)
        ) {
            StudioControlPill(
                icon = if (isCameraEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff,
                label = if (isCameraEnabled) "Cam" else "Off",
                onClick = { isCameraEnabled = !isCameraEnabled }
            )
            StudioControlPill(
                icon = if (isMicMuted) Icons.Default.MicOff else Icons.Default.Mic,
                label = if (isMicMuted) "Muted" else "Mic",
                onClick = { isMicMuted = !isMicMuted }
            )
            StudioControlPill(
                icon = Icons.Default.Cameraswitch,
                label = "Flip",
                onClick = { isFrontCamera = !isFrontCamera }
            )
            StudioControlPill(
                icon = Icons.Default.HighQuality,
                label = if (qualityPreset == "1080p HD") "1080p" else "720p",
                onClick = {
                    qualityPreset = if (qualityPreset == "1080p HD") "720p" else "1080p HD"
                }
            )
            if (liveStreamId != null) {
                StudioControlPill(
                    icon = Icons.Default.Gavel,
                    label = "Auction",
                    tint = BrandEmerald,
                    onClick = { showAuctionDialog = true }
                )
                StudioControlPill(
                    icon = Icons.Default.FlashOn,
                    label = "Flash",
                    tint = FlashAmber,
                    onClick = { showFlashDialog = true }
                )
                StudioControlPill(
                    icon = Icons.Default.StopCircle,
                    label = "End",
                    tint = LiveCrimson,
                    onClick = {
                        liveStreamId?.let { id ->
                            onEndLive(id)
                            liveStreamId = null
                        }
                    }
                )
            }
        }

        // Bottom Studio Area: Pre-live Config OR Product Pinning directly above Chat Input
        if (liveStreamId == null) {
            Surface(
                color = Color.Black.copy(alpha = 0.72f),
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .navigationBarsPadding()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Go Live Setup", style = MaterialTheme.typography.titleLarge, color = Color.White)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = streamTitle,
                        onValueChange = { streamTitle = it },
                        label = { Text("Stream Title", color = Color.White.copy(alpha = 0.8f)) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = BrandEmerald,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.4f)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("studio_title_input")
                    )
                    Spacer(Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(MARKETPLACE_CATEGORIES.drop(1)) { cat ->
                            FilterChip(
                                selected = streamCategory == cat,
                                onClick = { streamCategory = cat },
                                label = { Text(cat) }
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = {
                            if (liveStreamingConfigured && streamTitle.isNotBlank()) {
                                onStartLive(
                                    streamTitle.trim(),
                                    streamCategory,
                                    qualityPreset,
                                    selectedPinProduct
                                ) { streamId ->
                                    liveStreamId = streamId
                                }
                            }
                        },
                        enabled = liveStreamingConfigured && streamTitle.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = LiveCrimson),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("start_live_button")
                    ) {
                        Text(
                            text = if (liveStreamingConfigured) "Start Live Broadcast" else "Live video needs streaming setup",
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        } else {
            val activeId = liveStreamId.orEmpty()
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(start = 12.dp, end = 74.dp, bottom = 10.dp)
            ) {
                // Live Chat with Moderator Delete
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                ) {
                    items(streamMessages, key = { it.id }) { msg ->
                        Surface(
                            color = Color.Black.copy(alpha = 0.48f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Text(
                                    text = "${msg.userName}: ${msg.text}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White,
                                    modifier = Modifier.weight(1f, fill = false)
                                )
                                Spacer(Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Default.DeleteOutline,
                                    contentDescription = "Moderate message",
                                    tint = Color.White.copy(alpha = 0.8f),
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clickable { onModeratorDeleteChat(activeId, msg.id) }
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Product Pinning Bar directly above Chat Input
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(sellerProducts, key = { it.id }) { prod ->
                        val isPinned = activeStream?.pinnedProductId == prod.id
                        Surface(
                            color = if (isPinned) BrandEmerald else Color.Black.copy(alpha = 0.58f),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, if (isPinned) Color.White else Color.White.copy(alpha = 0.3f)),
                            modifier = Modifier.clickable {
                                selectedPinProduct = prod
                                onPinProduct(activeId, prod)
                            }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.PushPin, contentDescription = "Pin", tint = Color.White, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(5.dp))
                                Text(
                                    text = "${prod.title.take(18)} • ${formatNaira(prod.priceNaira)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Host Chat Input
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = chatText,
                        onValueChange = { chatText = it },
                        placeholder = { Text("Host announcement...", color = Color.White.copy(alpha = 0.7f)) },
                        singleLine = true,
                        shape = RoundedCornerShape(50),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedContainerColor = Color.Black.copy(alpha = 0.52f),
                            unfocusedContainerColor = Color.Black.copy(alpha = 0.52f)
                        ),
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = {
                            if (chatText.isNotBlank()) {
                                onSendHostChat(activeId, chatText)
                                chatText = ""
                            }
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(BrandEmerald)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color.White)
                    }
                }
            }
        }
    }

    if (showAuctionDialog && selectedPinProduct != null) {
        val prod = selectedPinProduct!!
        var startBid by remember { mutableStateOf((prod.priceNaira / 2).coerceAtLeast(1000L).toString()) }
        var minInc by remember { mutableStateOf("500") }
        AlertDialog(
            onDismissRequest = { showAuctionDialog = false },
            title = { Text("Launch Live Auction") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Item: ${prod.title}", style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(
                        value = startBid,
                        onValueChange = { startBid = it.filter(Char::isDigit) },
                        label = { Text("Starting Bid (₦)") }
                    )
                    OutlinedTextField(
                        value = minInc,
                        onValueChange = { minInc = it.filter(Char::isDigit) },
                        label = { Text("Min Increment (₦)") }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onLaunchAuction(
                            prod,
                            startBid.toLongOrNull() ?: 1000L,
                            minInc.toLongOrNull() ?: 500L,
                            10L
                        )
                        showAuctionDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald)
                ) {
                    Text("Start 10m Auction")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAuctionDialog = false }) { Text("Cancel") }
            }
        )
    }

    if (showFlashDialog && liveStreamId != null && selectedPinProduct != null) {
        val activeId = liveStreamId!!
        val prod = selectedPinProduct!!
        AlertDialog(
            onDismissRequest = { showFlashDialog = false },
            title = { Text("Drop Live Flash Deal") },
            text = { Text("Trigger a 15-minute flash discount on ${prod.title}?") },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(15L, 25L, 40L).forEach { pct ->
                        Button(
                            onClick = {
                                onLaunchFlashDeal(activeId, prod.id, pct)
                                showFlashDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = FlashAmber),
                            contentPadding = PaddingValues(horizontal = 10.dp)
                        ) {
                            Text("$pct% OFF")
                        }
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showFlashDialog = false }) { Text("Close") }
            }
        )
    }
}

@Composable
private fun StudioControlPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    tint: Color = Color.White,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.56f))
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = tint)
        }
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Medium)
    }
}
