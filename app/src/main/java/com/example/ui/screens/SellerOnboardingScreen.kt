package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.core.NIGERIAN_STATES
import com.example.data.model.SellerApplication
import com.example.data.model.UserProfile
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldDark
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandOrangeSoft
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.LiveCrimsonSoft
import com.example.ui.theme.SurfaceSoft

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun SellerOnboardingScreen(
    isAuthenticated: Boolean,
    userProfile: UserProfile?,
    sellerApplication: SellerApplication?,
    isSubmitting: Boolean,
    kycUploadsEnabled: Boolean,
    onBack: () -> Unit,
    onRequireSignIn: () -> Unit,
    onOpenSellerCentre: () -> Unit,
    onSubmitApplication: (
        businessName: String,
        cacNumber: String,
        businessType: String,
        stateLocation: String,
        phone: String,
        description: String
    ) -> Unit
) {
    val isApprovedSeller = userProfile?.isApprovedSeller == true
    val isSuspended = userProfile?.suspended == true ||
        userProfile?.sellerStatus.equals("suspended", ignoreCase = true)
    val effectiveStatus = when {
        isSuspended -> "suspended"
        isApprovedSeller -> "approved"
        !sellerApplication?.status.isNullOrBlank() && sellerApplication?.status != "none" ->
            sellerApplication?.status ?: "none"
        !userProfile?.sellerStatus.isNullOrBlank() -> userProfile?.sellerStatus ?: "none"
        else -> "none"
    }.lowercase()

    var businessName by remember(sellerApplication?.id) {
        mutableStateOf(sellerApplication?.businessName.orEmpty())
    }
    var cacNumber by remember(sellerApplication?.id) {
        mutableStateOf(sellerApplication?.cacNumber.orEmpty())
    }
    var businessType by remember(sellerApplication?.id) {
        mutableStateOf(sellerApplication?.businessType?.ifBlank { "Retail" } ?: "Retail")
    }
    var stateLocation by remember(sellerApplication?.id, userProfile?.selectedState) {
        mutableStateOf(
            sellerApplication?.stateLocation?.ifBlank { userProfile?.selectedState ?: "Lagos" }
                ?: userProfile?.selectedState
                ?: "Lagos"
        )
    }
    var phone by remember(sellerApplication?.id) {
        mutableStateOf(sellerApplication?.phone.orEmpty())
    }
    var description by remember(sellerApplication?.id) {
        mutableStateOf(sellerApplication?.description.orEmpty())
    }
    var validationError by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Seller Onboarding", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("seller_onboarding_back")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Color.White
    ) { padding ->
        Column(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
                .testTag("seller_onboarding_screen")
        ) {
            if (!isAuthenticated) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = SurfaceSoft,
                    border = BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(18.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(BrandEmeraldSoft)
                            ) {
                                Icon(Icons.Default.Storefront, contentDescription = null, tint = BrandEmerald)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("Sign in to Become a Seller", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BrandSlate)
                                Text("Your seller application is linked to your verified Cash N Carry account.", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                            }
                        }
                        Button(
                            onClick = onRequireSignIn,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .testTag("onboarding_sign_in_button")
                        ) {
                            Text("Sign In / Create Buyer Account", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                return@Column
            }

            when (effectiveStatus) {
                "suspended" -> {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = LiveCrimsonSoft,
                        border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.35f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(18.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.WarningAmber, contentDescription = null, tint = LiveCrimson)
                                Spacer(Modifier.width(8.dp))
                                Text("Seller Account Suspended", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = LiveCrimson)
                            }
                            Text(
                                text = "Your seller publishing and broadcasting permissions are currently suspended. Contact Cash N Carry marketplace support for review.",
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandSlate
                            )
                        }
                    }
                }

                "approved" -> {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = BrandEmeraldSoft,
                        border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.35f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.padding(18.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Verified, contentDescription = "Verified seller", tint = BrandEmerald)
                                Spacer(Modifier.width(8.dp))
                                Text("Verified Cash N Carry Seller", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BrandEmeraldDark)
                            }
                            Text(
                                text = "Your seller account is approved. You can publish products, upload Shoppable Reels, launch auctions, and manage orders in Seller Centre.",
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandSlate
                            )
                            Button(
                                onClick = onOpenSellerCentre,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .testTag("onboarding_open_seller_centre")
                            ) {
                                Text("Open Seller Centre", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                "pending" -> {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = BrandOrangeSoft,
                        border = BorderStroke(1.dp, BrandOrange.copy(alpha = 0.35f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("seller_application_pending_card")
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.padding(18.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.HourglassTop, contentDescription = "Pending review", tint = BrandOrange)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = "Your seller account is awaiting approval.",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandSlate
                                )
                            }
                            Text(
                                text = "Our compliance team is reviewing your application. You will unlock Seller Centre, video uploads, and livestreaming once approved by an admin.",
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandMuted
                            )
                            if (sellerApplication != null) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White,
                                    border = BorderStroke(1.dp, BrandBorder),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        verticalArrangement = Arrangement.spacedBy(4.dp),
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Text("Business: ${sellerApplication.businessName}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = BrandSlate)
                                        Text("Type: ${sellerApplication.businessType} • ${sellerApplication.stateLocation}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                        if (sellerApplication.cacNumber.isNotBlank()) {
                                            Text("CAC / Registration: ${sellerApplication.cacNumber}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                        }
                                        Text("Phone: ${sellerApplication.phone}", style = MaterialTheme.typography.bodySmall, color = BrandMuted)
                                    }
                                }
                            }
                        }
                    }
                }

                else -> {
                    if (effectiveStatus == "rejected" && sellerApplication != null) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = LiveCrimsonSoft,
                            border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("Previous Application Declined", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = LiveCrimson)
                                if (sellerApplication.reviewerNotes.isNotBlank()) {
                                    Text(sellerApplication.reviewerNotes, style = MaterialTheme.typography.bodySmall, color = BrandSlate)
                                } else {
                                    Text("Update your business details below and resubmit for admin review.", style = MaterialTheme.typography.bodySmall, color = BrandSlate)
                                }
                            }
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = BrandEmeraldSoft,
                        border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.25f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text("Become a Verified Seller on Cash N Carry", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = BrandEmeraldDark)
                            Text(
                                text = "Complete your Nigerian business registration details below. Seller permissions remain locked until an administrator reviews and approves your application.",
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandSlate
                            )
                        }
                    }

                    if (validationError != null) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = LiveCrimsonSoft,
                            border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = validationError.orEmpty(),
                                color = LiveCrimson,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(12.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = businessName,
                        onValueChange = { businessName = it },
                        label = { Text("Registered Business / Storefront Name *") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("seller_app_business_name")
                    )

                    OutlinedTextField(
                        value = cacNumber,
                        onValueChange = { cacNumber = it },
                        label = { Text("CAC Number / Business Reg (Optional)") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("seller_app_cac_number")
                    )

                    Text("Business Type", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = BrandSlate)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        listOf("Retail", "Wholesale", "Manufacturer", "Creator Brand").forEach { type ->
                            FilterChip(
                                selected = businessType == type,
                                onClick = { businessType = type },
                                label = { Text(type) },
                                modifier = Modifier.height(48.dp)
                            )
                        }
                    }

                    Text("Primary State", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = BrandSlate)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        listOf("Lagos", "FCT Abuja", "Rivers", "Kano", "Oyo", "Ogun", "Enugu").plus(
                            if (NIGERIAN_STATES.contains(stateLocation) &&
                                !listOf("Lagos", "FCT Abuja", "Rivers", "Kano", "Oyo", "Ogun", "Enugu").contains(stateLocation)
                            ) listOf(stateLocation) else emptyList()
                        ).forEach { st ->
                            FilterChip(
                                selected = stateLocation == st,
                                onClick = { stateLocation = st },
                                label = { Text(st) },
                                modifier = Modifier.height(48.dp)
                            )
                        }
                    }

                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Business Phone Number (+234...) *") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("seller_app_phone")
                    )

                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("What do you sell & dispatch from? *") },
                        minLines = 3,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("seller_app_description")
                    )

                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = SurfaceSoft,
                        border = BorderStroke(1.dp, BrandBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Icon(
                                imageVector = if (kycUploadsEnabled) Icons.Default.CheckCircle else Icons.Default.Lock,
                                contentDescription = null,
                                tint = if (kycUploadsEnabled) BrandEmerald else BrandMuted,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(10.dp))
                            Text(
                                text = if (kycUploadsEnabled) {
                                    "Verification document uploads enabled."
                                } else {
                                    "Binary ID/KYC document uploads are currently disabled while encrypted KYC storage is offline. Submit business details for manual verification."
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = BrandMuted
                            )
                        }
                    }

                    Button(
                        onClick = {
                            when {
                                businessName.trim().length < 2 ->
                                    validationError = "Enter your business name (at least 2 characters)."
                                phone.trim().length < 7 ->
                                    validationError = "Enter a valid Nigerian contact phone number."
                                description.trim().length < 10 ->
                                    validationError = "Describe your products and fulfillment location (at least 10 characters)."
                                else -> {
                                    validationError = null
                                    onSubmitApplication(
                                        businessName.trim(),
                                        cacNumber.trim(),
                                        businessType,
                                        stateLocation,
                                        phone.trim(),
                                        description.trim()
                                    )
                                }
                            }
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("submit_seller_application_button")
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text("Submitting Application...", fontWeight = FontWeight.Bold)
                        } else {
                            Text("Submit Seller Application", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
