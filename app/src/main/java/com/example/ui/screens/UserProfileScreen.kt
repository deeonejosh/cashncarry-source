package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.core.formatCompactCount
import com.example.core.formatNaira
import com.example.data.model.Product
import com.example.data.model.SellerApplication
import com.example.data.model.ShortVideo
import com.example.data.model.UserProfile
import com.example.data.model.WalletBalance
import com.example.ui.components.MarketplaceImage
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldDark
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandOrangeSoft
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.GoldCoin
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.SurfaceSoft

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    isAuthenticated: Boolean,
    userProfile: UserProfile?,
    sellerApplication: SellerApplication?,
    fallbackName: String,
    userEmail: String,
    avatarUrl: String?,
    wallet: WalletBalance,
    uploadedVideos: List<ShortVideo>,
    catalogProducts: List<Product>,
    onBack: () -> Unit,
    onRequireSignIn: () -> Unit,
    onSaveProfile: (String, String, String) -> Unit,
    onOpenVideoUpload: () -> Unit,
    onOpenBroadcastStudio: () -> Unit,
    onOpenSellerCentre: () -> Unit,
    onOpenSellerOnboarding: () -> Unit,
    onWatchVideoFeed: () -> Unit,
    onOpenProduct: (Product) -> Unit,
    onOpenWallet: () -> Unit,
    onSignOut: () -> Unit
) {
    BackHandler { onBack() }

    val isApprovedSeller = isAuthenticated && userProfile?.isApprovedSeller == true
    val isPendingSeller = isAuthenticated && !isApprovedSeller && (
        userProfile?.sellerStatus.equals("pending", ignoreCase = true) ||
            sellerApplication?.status.equals("pending", ignoreCase = true)
        )

    val displayName = userProfile?.displayName?.ifBlank { fallbackName } ?: fallbackName
    val bio = userProfile?.bio.orEmpty()
    val avatarKey = userProfile?.avatarKey.orEmpty()
    val selectedState = userProfile?.selectedState ?: "Lagos"
    val followingCount = userProfile?.followingSellerIds?.size ?: 0
    val totalVideoLikes = remember(uploadedVideos) { uploadedVideos.sumOf { it.likesCount } }

    var showEditSheet by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = Color.White,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isAuthenticated) "My Profile" else "Account",
                        style = MaterialTheme.typography.titleLarge,
                        color = BrandSlate
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("profile_back_button")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = BrandSlate)
                    }
                },
                actions = {
                    if (isAuthenticated) {
                        IconButton(onClick = onSignOut, modifier = Modifier.testTag("profile_sign_out_button")) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out", tint = LiveCrimson)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        if (!isAuthenticated) {
            Column(
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(20.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = SurfaceSoft,
                    border = BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(20.dp)
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(36.dp))
                        Text(
                            text = "Sign in to Cash N Carry Nigeria",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = BrandSlate
                        )
                        Text(
                            text = "Access your cart, orders, followed sellers, live bidding, or apply to become a verified seller.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = BrandMuted
                        )
                        Button(
                            onClick = onRequireSignIn,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .testTag("profile_sign_in_button")
                        ) {
                            Text("Sign In / Create Account", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            return@Scaffold
        }

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            val gridColumns = if (maxWidth >= 680.dp) 4 else 3
            val videoRows = remember(uploadedVideos, gridColumns) {
                uploadedVideos.chunked(gridColumns)
            }

            LazyColumn(
                contentPadding = PaddingValues(bottom = 28.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White)
            ) {
                // 1. Gradient Profile Header + Avatar + Bio
                item {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(104.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(BrandNavy, BrandEmeraldDark)
                                    )
                                )
                        )

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 56.dp, start = 16.dp, end = 16.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.Bottom,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(92.dp)
                                        .clickable { showEditSheet = true }
                                        .testTag("profile_avatar_box")
                                ) {
                                    MarketplaceImage(
                                        imageUrlOrKey = avatarKey.ifBlank { avatarUrl.orEmpty() },
                                        contentDescription = "$displayName avatar",
                                        placeholderIcon = Icons.Default.Person,
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(CircleShape)
                                            .border(3.dp, Color.White, CircleShape)
                                            .background(SurfaceSoft)
                                    )
                                    Surface(
                                        color = BrandEmerald,
                                        shape = CircleShape,
                                        border = BorderStroke(2.dp, Color.White),
                                        modifier = Modifier
                                            .size(28.dp)
                                            .align(Alignment.BottomEnd)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.Edit,
                                                contentDescription = "Edit profile",
                                                tint = Color.White,
                                                modifier = Modifier.size(14.dp)
                                            )
                                        }
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(
                                        onClick = { showEditSheet = true },
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, BrandBorder),
                                        modifier = Modifier
                                            .height(48.dp)
                                            .testTag("edit_profile_button")
                                    ) {
                                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(5.dp))
                                        Text("Edit Profile")
                                    }
                                    if (isApprovedSeller) {
                                        Button(
                                            onClick = onOpenVideoUpload,
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                            shape = RoundedCornerShape(12.dp),
                                            modifier = Modifier
                                                .height(48.dp)
                                                .testTag("upload_shoppable_video_button")
                                        ) {
                                            Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(5.dp))
                                            Text("Upload Video")
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(12.dp))

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = displayName,
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = BrandSlate,
                                    fontWeight = FontWeight.Bold
                                )
                                if (isApprovedSeller) {
                                    Spacer(Modifier.width(6.dp))
                                    Icon(Icons.Default.Verified, contentDescription = "Verified Seller", tint = BrandEmerald, modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(Modifier.height(2.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = BrandEmerald,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    text = "$selectedState • $userEmail",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BrandMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            Spacer(Modifier.height(10.dp))

                            Surface(
                                color = SurfaceSoft,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { showEditSheet = true }
                                    .testTag("profile_bio_card")
                            ) {
                                Text(
                                    text = bio.ifBlank { "Tap Edit Profile to add your bio and shopping preferences." },
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (bio.isNotBlank()) BrandSlate else BrandMuted,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }

                            Spacer(Modifier.height(14.dp))

                            // Stats Row
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                ProfileStatPill(
                                    label = "Videos",
                                    value = "${uploadedVideos.size}",
                                    accent = BrandNavy,
                                    modifier = Modifier.weight(1f)
                                )
                                ProfileStatPill(
                                    label = "Likes",
                                    value = formatCompactCount(totalVideoLikes),
                                    accent = LiveCrimson,
                                    modifier = Modifier.weight(1f)
                                )
                                ProfileStatPill(
                                    label = "Following",
                                    value = "$followingCount",
                                    accent = BrandEmerald,
                                    modifier = Modifier.weight(1f)
                                )
                                ProfileStatPill(
                                    label = "Coins",
                                    value = "${wallet.purchasedCoins + wallet.promoTestCoins}",
                                    accent = GoldCoin,
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable(onClick = onOpenWallet)
                                )
                            }

                            Spacer(Modifier.height(14.dp))

                            // Seller Status / Onboarding Card (strictly enforced by server role & sellerStatus)
                            when {
                                isApprovedSeller -> {
                                    Surface(
                                        color = BrandEmeraldSoft,
                                        shape = RoundedCornerShape(16.dp),
                                        border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.3f)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(
                                            verticalArrangement = Arrangement.spacedBy(10.dp),
                                            modifier = Modifier.padding(14.dp)
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Verified, contentDescription = null, tint = BrandEmerald)
                                                Spacer(Modifier.width(8.dp))
                                                Text("Approved Seller Account", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = BrandEmeraldDark)
                                            }
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Button(
                                                    onClick = onOpenSellerCentre,
                                                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                                    modifier = Modifier.weight(1f).height(48.dp)
                                                ) {
                                                    Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(16.dp))
                                                    Spacer(Modifier.width(6.dp))
                                                    Text("Seller Centre")
                                                }
                                                OutlinedButton(
                                                    onClick = onOpenBroadcastStudio,
                                                    modifier = Modifier.weight(1f).height(48.dp)
                                                ) {
                                                    Icon(Icons.Default.Videocam, contentDescription = null, modifier = Modifier.size(16.dp))
                                                    Spacer(Modifier.width(6.dp))
                                                    Text("Go Live")
                                                }
                                            }
                                        }
                                    }
                                }

                                isPendingSeller -> {
                                    Surface(
                                        color = BrandOrangeSoft,
                                        shape = RoundedCornerShape(16.dp),
                                        border = BorderStroke(1.dp, BrandOrange.copy(alpha = 0.35f)),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable(onClick = onOpenSellerOnboarding)
                                            .testTag("profile_pending_seller_card")
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(14.dp)
                                        ) {
                                            Icon(Icons.Default.HourglassTop, contentDescription = null, tint = BrandOrange)
                                            Spacer(Modifier.width(10.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = "Your seller account is awaiting approval.",
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = BrandSlate
                                                )
                                                Text(
                                                    text = "Tap to view your submitted application status.",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = BrandMuted
                                                )
                                            }
                                        }
                                    }
                                }

                                else -> {
                                    Surface(
                                        color = SurfaceSoft,
                                        shape = RoundedCornerShape(16.dp),
                                        border = BorderStroke(1.dp, BrandBorder),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(
                                            verticalArrangement = Arrangement.spacedBy(8.dp),
                                            modifier = Modifier.padding(14.dp)
                                        ) {
                                            Text("Become a Seller", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = BrandSlate)
                                            Text(
                                                text = "Apply to open a verified storefront, list products, upload Shoppable Reels, and go live on Cash N Carry Nigeria.",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = BrandMuted
                                            )
                                            Button(
                                                onClick = onOpenSellerOnboarding,
                                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                                                shape = RoundedCornerShape(12.dp),
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(48.dp)
                                                    .testTag("profile_start_selling_button")
                                            ) {
                                                Text("Start Selling", fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Shoppable Videos Grid Header (Visible for sellers or users with videos)
                if (isApprovedSeller || uploadedVideos.isNotEmpty()) {
                    item {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 16.dp, end = 12.dp, top = 20.dp, bottom = 8.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.VideoLibrary, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = "Uploaded Videos (${uploadedVideos.size})",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = BrandSlate,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            if (uploadedVideos.isNotEmpty()) {
                                TextButton(onClick = onWatchVideoFeed) {
                                    Text("Open Reels", color = BrandEmerald)
                                }
                            }
                        }
                    }

                    if (uploadedVideos.isEmpty()) {
                        item {
                            Surface(
                                color = SurfaceSoft,
                                shape = RoundedCornerShape(18.dp),
                                border = BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(24.dp)
                                ) {
                                    Icon(Icons.Default.ShoppingBag, contentDescription = null, tint = BrandEmerald, modifier = Modifier.size(34.dp))
                                    Spacer(Modifier.height(8.dp))
                                    Text("No videos have been posted yet.", style = MaterialTheme.typography.titleMedium, color = BrandSlate)
                                    Spacer(Modifier.height(10.dp))
                                    Button(
                                        onClick = onOpenVideoUpload,
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandNavy),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.height(48.dp)
                                    ) {
                                        Text("Upload Shoppable Video")
                                    }
                                }
                            }
                        }
                    } else {
                        items(videoRows.size) { rowIndex ->
                            val rowVideos = videoRows[rowIndex]
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 4.dp)
                            ) {
                                rowVideos.forEach { video ->
                                    ShoppableVideoGridTile(
                                        video = video,
                                        onClick = {
                                            val linked = catalogProducts.find { it.id == video.productId }
                                            if (linked != null) {
                                                onOpenProduct(linked)
                                            } else {
                                                onWatchVideoFeed()
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                repeat(gridColumns - rowVideos.size) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showEditSheet) {
        var editedName by remember(displayName) { mutableStateOf(displayName) }
        var editedBio by remember(bio) { mutableStateOf(bio) }

        ModalBottomSheet(
            onDismissRequest = { showEditSheet = false },
            containerColor = Color.White
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text("Edit Account Profile", style = MaterialTheme.typography.titleLarge, color = BrandSlate)

                OutlinedTextField(
                    value = editedName,
                    onValueChange = { editedName = it.take(80) },
                    label = { Text("Display Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("edit_profile_name_input")
                )

                OutlinedTextField(
                    value = editedBio,
                    onValueChange = { editedBio = it.take(240) },
                    label = { Text("Bio (${editedBio.length}/240)") },
                    minLines = 3,
                    maxLines = 4,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("edit_profile_bio_input")
                )

                Button(
                    onClick = {
                        onSaveProfile(editedName, editedBio, avatarKey)
                        showEditSheet = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("save_profile_button")
                ) {
                    Text("Save Profile", fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun ProfileStatPill(
    label: String,
    value: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        color = BrandEmeraldSoft.copy(alpha = 0.45f),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, BrandBorder),
        modifier = modifier
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp)
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                color = accent,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = BrandMuted
            )
        }
    }
}

@Composable
private fun ShoppableVideoGridTile(
    video: ShortVideo,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = BrandNavy),
        modifier = modifier
            .aspectRatio(0.72f)
            .clickable(onClick = onClick)
            .testTag("profile_video_tile_${video.id}")
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            MarketplaceImage(
                imageUrlOrKey = video.coverKey.ifBlank { video.productImageUrl },
                contentDescription = video.title,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.Black.copy(alpha = 0.25f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.85f)
                            )
                        )
                    )
            )
            Surface(
                color = Color.Black.copy(alpha = 0.55f),
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(6.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Favorite,
                        contentDescription = null,
                        tint = LiveCrimson,
                        modifier = Modifier.size(11.dp)
                    )
                    Spacer(Modifier.width(3.dp))
                    Text(
                        text = formatCompactCount(video.likesCount),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White
                    )
                }
            }
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = "Play shoppable video",
                tint = Color.White.copy(alpha = 0.9f),
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(30.dp)
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(8.dp)
            ) {
                Surface(
                    color = BrandEmerald,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = formatNaira(video.productPriceNaira),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
                Spacer(Modifier.height(3.dp))
                Text(
                    text = video.title,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
