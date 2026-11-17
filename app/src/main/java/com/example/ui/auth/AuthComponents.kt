package com.example.ui.auth

import androidx.compose.animation.animateColor
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.remote.CloudflareEndpoints
import com.example.data.remote.CloudflareResult
import com.example.data.remote.CloudflareSessionSnapshot
import com.example.data.remote.CloudflareSyncRepository
import com.example.ui.theme.BrandBorder
import com.example.ui.theme.BrandEmerald
import com.example.ui.theme.BrandEmeraldDark
import com.example.ui.theme.BrandEmeraldSoft
import com.example.ui.theme.BrandMuted
import com.example.ui.theme.BrandNavy
import com.example.ui.theme.BrandOrange
import com.example.ui.theme.BrandOrangeSoft
import com.example.ui.theme.BrandSlate
import com.example.ui.theme.LiveCrimson
import com.example.ui.theme.LiveCrimsonSoft
import com.example.ui.theme.SurfaceSoft
import kotlinx.coroutines.launch

enum class AuthFlowStep {
    LOGIN,
    CREATE_ACCOUNT,
    VERIFY_EMAIL,
    FORGOT_PASSWORD,
    EMAIL_SENT_CONFIRMATION,
    RESET_PASSWORD,
    PASSWORD_RESET_SUCCESS
}

@Composable
fun SessionLoadingScreen(
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(24.dp)
                .testTag("session_loading_screen")
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.widthIn(max = 420.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.logo_cashncarry_wordmark),
                    contentDescription = stringResource(R.string.app_name),
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .height(48.dp)
                        .width(210.dp)
                )
                CircularProgressIndicator(
                    color = BrandEmerald,
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(34.dp)
                )
                Text(
                    text = "Restoring your Cash N Carry session...",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = BrandSlate,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "Connecting securely to Cash N Carry Nigeria",
                    style = MaterialTheme.typography.bodySmall,
                    color = BrandMuted,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun LogoutConfirmationDialog(
    onConfirmLogout: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Sign Out of Cash N Carry?",
                fontWeight = FontWeight.Bold,
                color = BrandSlate
            )
        },
        text = {
            Text(
                text = "Your active session will be invalidated on this device and you will need to sign in again.",
                style = MaterialTheme.typography.bodyMedium,
                color = BrandMuted
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirmLogout,
                colors = ButtonDefaults.buttonColors(containerColor = LiveCrimson, contentColor = Color.White),
                modifier = Modifier
                    .height(48.dp)
                    .testTag("confirm_logout_button")
            ) {
                Text("Sign Out", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                modifier = Modifier
                    .height(48.dp)
                    .testTag("cancel_logout_button")
            ) {
                Text("Stay Signed In")
            }
        }
    )
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AuthScreen(
    cloudflareSyncRepo: CloudflareSyncRepository,
    onAuthSuccess: (CloudflareSessionSnapshot) -> Unit,
    onContinueAsGuest: (() -> Unit)? = null
) {
    val scope = rememberCoroutineScope()
    val authScrollState = rememberScrollState()
    val errorBringIntoViewRequester = remember { BringIntoViewRequester() }
    var step by remember { mutableStateOf(AuthFlowStep.LOGIN) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var verificationToken by remember { mutableStateOf("") }
    var resetToken by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var infoMessage by remember { mutableStateOf<String?>(null) }

    val pulseTransition = rememberInfiniteTransition(label = "auth_live_pulse")
    val liveDotColor by pulseTransition.animateColor(
        initialValue = Color.White,
        targetValue = BrandOrangeSoft,
        animationSpec = infiniteRepeatable(
            animation = tween(800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "auth_live_dot"
    )

    // Reset form position when the authentication step changes.
    LaunchedEffect(step) { authScrollState.scrollTo(0) }
    // Keep validation feedback reachable on compact Android screens.
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) errorBringIntoViewRequester.bringIntoView()
    }

    fun switchStep(next: AuthFlowStep, clearPassword: Boolean = true) {
        step = next
        errorMessage = null
        if (clearPassword) {
            password = ""
            confirmPassword = ""
            showPassword = false
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            contentAlignment = Alignment.TopCenter,
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(authScrollState)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 560.dp)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Header Brand Strip
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.logo_cashncarry_wordmark),
                        contentDescription = stringResource(R.string.app_name),
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .height(34.dp)
                            .width(164.dp)
                    )
                    Surface(
                        color = BrandEmeraldSoft,
                        shape = RoundedCornerShape(50),
                        border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.25f))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .width(18.dp)
                                    .height(12.dp)
                                    .clip(RoundedCornerShape(3.dp))
                            ) {
                                Box(Modifier.weight(1f).fillMaxSize().background(BrandEmerald))
                                Box(Modifier.weight(1f).fillMaxSize().background(Color.White))
                                Box(Modifier.weight(1f).fillMaxSize().background(BrandEmerald))
                            }
                            Text(
                                text = "NG ₦",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = BrandEmeraldDark
                            )
                        }
                    }
                }

                // Elevated Marketplace Auth Card
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(24.dp),
                    border = BorderStroke(1.dp, BrandBorder),
                    shadowElevation = 4.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp).animateContentSize(animationSpec = tween(180)),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (step == AuthFlowStep.LOGIN || step == AuthFlowStep.CREATE_ACCOUNT || step == AuthFlowStep.VERIFY_EMAIL) {
                            Surface(
                                color = SurfaceSoft,
                                shape = RoundedCornerShape(14.dp),
                                border = BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    AuthModeTab(
                                        label = "Sign In",
                                        selected = step == AuthFlowStep.LOGIN,
                                        onClick = {
                                            infoMessage = null
                                            switchStep(AuthFlowStep.LOGIN)
                                        },
                                        modifier = Modifier
                                            .weight(1f)
                                            .testTag("auth_tab_sign_in")
                                    )
                                    AuthModeTab(
                                        label = "Create Account",
                                        selected = step == AuthFlowStep.CREATE_ACCOUNT || step == AuthFlowStep.VERIFY_EMAIL,
                                        onClick = {
                                            infoMessage = null
                                            switchStep(AuthFlowStep.CREATE_ACCOUNT)
                                        },
                                        modifier = Modifier
                                            .weight(1f)
                                            .testTag("auth_tab_create_account")
                                    )
                                }
                            }
                        }

                        if (infoMessage != null) {
                            Surface(
                                color = BrandEmeraldSoft,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, BrandEmerald.copy(alpha = 0.25f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = infoMessage.orEmpty(),
                                    color = BrandEmeraldDark,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }

                        if (errorMessage != null) {
                            Surface(
                                color = LiveCrimsonSoft,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, LiveCrimson.copy(alpha = 0.25f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .bringIntoViewRequester(errorBringIntoViewRequester)
                                    .testTag("auth_error_banner")
                            ) {
                                Text(
                                    text = errorMessage.orEmpty(),
                                    color = LiveCrimson,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }

                        // Keep only one form active for deterministic navigation.
                        key(step) {
                            when (step) {
                                AuthFlowStep.LOGIN -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {

                                    OutlinedTextField(
                                        value = email,
                                        onValueChange = { email = it },
                                        label = { Text("Email Address") },
                                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = KeyboardType.Email,
                                            imeAction = ImeAction.Next
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("login_email_input")
                                    )

                                    OutlinedTextField(
                                        value = password,
                                        onValueChange = { password = it },
                                        label = { Text("Password (12+ chars)") },
                                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                        trailingIcon = {
                                            IconButton(
                                                onClick = { showPassword = !showPassword },
                                                modifier = Modifier.testTag("toggle_password_visibility")
                                            ) {
                                                Icon(
                                                    imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                                    contentDescription = if (showPassword) "Hide password" else "Show password"
                                                )
                                            }
                                        },
                                        singleLine = true,
                                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = KeyboardType.Password,
                                            imeAction = ImeAction.Done
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("login_password_input")
                                    )

                                    Row(
                                        horizontalArrangement = Arrangement.End,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        TextButton(
                                            onClick = {
                                                infoMessage = null
                                                switchStep(AuthFlowStep.FORGOT_PASSWORD)
                                            },
                                            modifier = Modifier
                                                .height(48.dp)
                                                .testTag("forgot_password_link")
                                        ) {
                                            Text("Forgot Password?", color = BrandEmeraldDark, fontWeight = FontWeight.SemiBold)
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            if (email.isBlank()) {
                                                errorMessage = "Enter your email address."
                                                return@Button
                                            }
                                            if (password.length < CloudflareEndpoints.MIN_PASSWORD_LENGTH) {
                                                errorMessage = "Password must be at least 12 characters."
                                                return@Button
                                            }
                                            isLoading = true
                                            errorMessage = null
                                            infoMessage = null
                                            scope.launch {
                                                when (val res = cloudflareSyncRepo.signInWithPassword(email, password)) {
                                                    is CloudflareResult.Success -> {
                                                        isLoading = false
                                                        onAuthSuccess(res.data)
                                                    }
                                                    is CloudflareResult.Failure -> {
                                                        isLoading = false
                                                        errorMessage = res.message
                                                    }
                                                }
                                            }
                                        },
                                        enabled = !isLoading,
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp)
                                            .testTag("login_submit_button")
                                    ) {
                                        if (isLoading) {
                                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Signing in...", fontWeight = FontWeight.Bold)
                                        } else {
                                            Text("Sign In", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                AuthFlowStep.CREATE_ACCOUNT -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(
                                        text = "Step 1: Verify Your Email",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = BrandSlate
                                    )
                                    Text(
                                        text = "All new accounts start as Buyer accounts. After signing in, you can apply to sell from your Profile or Create menu.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted
                                    )

                                    OutlinedTextField(
                                        value = email,
                                        onValueChange = { email = it },
                                        label = { Text("Email Address") },
                                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = KeyboardType.Email,
                                            imeAction = ImeAction.Done
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("register_email_input")
                                    )

                                    Button(
                                        onClick = {
                                            isLoading = true
                                            errorMessage = null
                                            infoMessage = null
                                            scope.launch {
                                                when (val res = cloudflareSyncRepo.registerAccount(email)) {
                                                    is CloudflareResult.Success -> {
                                                        isLoading = false
                                                        infoMessage = res.data
                                                        switchStep(AuthFlowStep.VERIFY_EMAIL)
                                                    }
                                                    is CloudflareResult.Failure -> {
                                                        isLoading = false
                                                        errorMessage = res.message
                                                    }
                                                }
                                            }
                                        },
                                        enabled = !isLoading && email.isNotBlank(),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandOrange, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp)
                                            .testTag("register_send_code_button")
                                    ) {
                                        if (isLoading) {
                                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Sending Verification...", fontWeight = FontWeight.Bold)
                                        } else {
                                            Text("Send Verification Email", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    TextButton(
                                        onClick = { switchStep(AuthFlowStep.VERIFY_EMAIL) },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(48.dp)
                                            .testTag("already_have_verify_token_button")
                                    ) {
                                        Text("Already received a verification token? Enter it", color = BrandEmeraldDark)
                                    }
                                }

                                AuthFlowStep.VERIFY_EMAIL -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        text = "Step 2: Complete Verification & Password",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = BrandSlate
                                    )
                                    Text(
                                        text = "Paste the 64-character verification token from your email and choose a strong password (12–128 characters).",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted
                                    )

                                    OutlinedTextField(
                                        value = verificationToken,
                                        onValueChange = { verificationToken = it },
                                        label = { Text("Verification Token") },
                                        leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                                        singleLine = true,
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("verify_token_input")
                                    )

                                    OutlinedTextField(
                                        value = password,
                                        onValueChange = { password = it },
                                        label = { Text("Create Password (12+ chars)") },
                                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                        trailingIcon = {
                                            IconButton(onClick = { showPassword = !showPassword }) {
                                                Icon(
                                                    imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                                    contentDescription = "Toggle password"
                                                )
                                            }
                                        },
                                        singleLine = true,
                                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("verify_password_input")
                                    )

                                    OutlinedTextField(
                                        value = confirmPassword,
                                        onValueChange = { confirmPassword = it },
                                        label = { Text("Confirm Password") },
                                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                        singleLine = true,
                                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("verify_confirm_password_input")
                                    )

                                    Button(
                                        onClick = {
                                            if (password != confirmPassword) {
                                                errorMessage = "Passwords do not match."
                                                return@Button
                                            }
                                            isLoading = true
                                            errorMessage = null
                                            infoMessage = null
                                            scope.launch {
                                                when (
                                                    val res = cloudflareSyncRepo.verifyEmailAndSetPassword(
                                                        token = verificationToken,
                                                        password = password,
                                                        role = "buyer"
                                                    )
                                                ) {
                                                    is CloudflareResult.Success -> {
                                                        isLoading = false
                                                        verificationToken = ""
                                                        infoMessage = "Account verified! Sign in with your email and new password."
                                                        switchStep(AuthFlowStep.LOGIN)
                                                    }
                                                    is CloudflareResult.Failure -> {
                                                        isLoading = false
                                                        errorMessage = res.message
                                                    }
                                                }
                                            }
                                        },
                                        enabled = !isLoading,
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp)
                                            .testTag("verify_submit_button")
                                    ) {
                                        if (isLoading) {
                                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Activating Account...", fontWeight = FontWeight.Bold)
                                        } else {
                                            Text("Verify & Activate Account", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    TextButton(
                                        onClick = { switchStep(AuthFlowStep.CREATE_ACCOUNT) },
                                        modifier = Modifier.height(48.dp)
                                    ) {
                                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("Back to Email Step")
                                    }
                                }

                                AuthFlowStep.FORGOT_PASSWORD -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        text = "Recover Your Password",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = BrandSlate
                                    )
                                    Text(
                                        text = "Enter the email associated with your Cash N Carry account. If eligible, we'll send a single-use password reset token.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted
                                    )

                                    OutlinedTextField(
                                        value = email,
                                        onValueChange = { email = it },
                                        label = { Text("Account Email") },
                                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("forgot_email_input")
                                    )

                                    Button(
                                        onClick = {
                                            isLoading = true
                                            errorMessage = null
                                            infoMessage = null
                                            scope.launch {
                                                when (val res = cloudflareSyncRepo.requestPasswordReset(email)) {
                                                    is CloudflareResult.Success -> {
                                                        isLoading = false
                                                        infoMessage = res.data
                                                        switchStep(AuthFlowStep.EMAIL_SENT_CONFIRMATION)
                                                    }
                                                    is CloudflareResult.Failure -> {
                                                        isLoading = false
                                                        errorMessage = res.message
                                                    }
                                                }
                                            }
                                        },
                                        enabled = !isLoading && email.isNotBlank(),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandNavy, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp)
                                            .testTag("forgot_submit_button")
                                    ) {
                                        if (isLoading) {
                                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Requesting Reset...", fontWeight = FontWeight.Bold)
                                        } else {
                                            Text("Send Reset Email", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    Row(
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        TextButton(
                                            onClick = { switchStep(AuthFlowStep.LOGIN) },
                                            modifier = Modifier.height(48.dp)
                                        ) {
                                            Text("Back to Sign In")
                                        }
                                        TextButton(
                                            onClick = { switchStep(AuthFlowStep.RESET_PASSWORD) },
                                            modifier = Modifier.height(48.dp).testTag("have_reset_token_button")
                                        ) {
                                            Text("Enter Reset Token")
                                        }
                                    }
                                }

                                AuthFlowStep.EMAIL_SENT_CONFIRMATION -> Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("email_sent_confirmation_screen")
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier
                                            .size(64.dp)
                                            .clip(CircleShape)
                                            .background(BrandEmeraldSoft)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.MarkEmailRead,
                                            contentDescription = "Email sent",
                                            tint = BrandEmerald,
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }
                                    Text(
                                        text = "Check Your Inbox",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = BrandSlate
                                    )
                                    Text(
                                        text = "If a verified buyer or seller account matches that email, a single-use reset link and token have been dispatched.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted,
                                        textAlign = TextAlign.Center
                                    )
                                    Button(
                                        onClick = { switchStep(AuthFlowStep.RESET_PASSWORD) },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp)
                                            .testTag("proceed_to_reset_password_button")
                                    ) {
                                        Text("Enter Reset Token & New Password", fontWeight = FontWeight.Bold)
                                    }
                                    OutlinedButton(
                                        onClick = { switchStep(AuthFlowStep.LOGIN) },
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(48.dp)
                                    ) {
                                        Text("Back to Sign In")
                                    }
                                }

                                AuthFlowStep.RESET_PASSWORD -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        text = "Set New Password",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = BrandSlate
                                    )
                                    Text(
                                        text = "Enter your single-use 64-character reset token and choose a new password (12–128 characters).",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted
                                    )

                                    OutlinedTextField(
                                        value = resetToken,
                                        onValueChange = { resetToken = it },
                                        label = { Text("Reset Token") },
                                        leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                                        singleLine = true,
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("reset_token_input")
                                    )

                                    OutlinedTextField(
                                        value = password,
                                        onValueChange = { password = it },
                                        label = { Text("New Password (12+ chars)") },
                                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                        trailingIcon = {
                                            IconButton(onClick = { showPassword = !showPassword }) {
                                                Icon(
                                                    imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                                    contentDescription = "Toggle password"
                                                )
                                            }
                                        },
                                        singleLine = true,
                                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("reset_new_password_input")
                                    )

                                    OutlinedTextField(
                                        value = confirmPassword,
                                        onValueChange = { confirmPassword = it },
                                        label = { Text("Confirm New Password") },
                                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                        singleLine = true,
                                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("reset_confirm_password_input")
                                    )

                                    Button(
                                        onClick = {
                                            if (password != confirmPassword) {
                                                errorMessage = "Passwords do not match."
                                                return@Button
                                            }
                                            isLoading = true
                                            errorMessage = null
                                            infoMessage = null
                                            scope.launch {
                                                when (val res = cloudflareSyncRepo.resetPassword(resetToken, password)) {
                                                    is CloudflareResult.Success -> {
                                                        isLoading = false
                                                        resetToken = ""
                                                        switchStep(AuthFlowStep.PASSWORD_RESET_SUCCESS)
                                                    }
                                                    is CloudflareResult.Failure -> {
                                                        isLoading = false
                                                        errorMessage = res.message
                                                    }
                                                }
                                            }
                                        },
                                        enabled = !isLoading,
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp)
                                            .testTag("reset_submit_button")
                                    ) {
                                        if (isLoading) {
                                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Updating Password...", fontWeight = FontWeight.Bold)
                                        } else {
                                            Text("Reset Password", fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    TextButton(
                                        onClick = { switchStep(AuthFlowStep.LOGIN) },
                                        modifier = Modifier.height(48.dp)
                                    ) {
                                        Text("Cancel & Return to Sign In")
                                    }
                                }

                                AuthFlowStep.PASSWORD_RESET_SUCCESS -> Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("password_reset_success_screen")
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier
                                            .size(64.dp)
                                            .clip(CircleShape)
                                            .background(BrandEmeraldSoft)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = "Password updated",
                                            tint = BrandEmerald,
                                            modifier = Modifier.size(34.dp)
                                        )
                                    }
                                    Text(
                                        text = "Password Reset Successful",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = BrandSlate
                                    )
                                    Text(
                                        text = "Your password has been updated and prior sessions were revoked for security. You can now sign in with your new password.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = BrandMuted,
                                        textAlign = TextAlign.Center
                                    )
                                    Button(
                                        onClick = {
                                            infoMessage = "Password updated. Sign in below."
                                            switchStep(AuthFlowStep.LOGIN)
                                        },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandEmerald, contentColor = Color.White),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp)
                                            .testTag("reset_success_sign_in_button")
                                    ) {
                                        Text("Sign In Now", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        if (onContinueAsGuest != null) {
                            OutlinedButton(
                                onClick = onContinueAsGuest,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .testTag("continue_as_guest_button")
                            ) {
                                Text("Continue as Guest", fontWeight = FontWeight.SemiBold, color = BrandSlate)
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = BrandEmerald,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = "Encrypted session • 12+ character password policy",
                                style = MaterialTheme.typography.labelSmall,
                                color = BrandMuted,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                // 4. Marketplace Trust & Feature Highlights
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    AuthHighlightRow(
                        icon = Icons.Default.LiveTv,
                        accentBg = BrandEmeraldSoft,
                        accentTint = BrandEmerald,
                        title = "Shoppable Videos & Live Shopping",
                        subtitle = "Watch verified sellers unbox products, pin deals & drop flash sales."
                    )
                    AuthHighlightRow(
                        icon = Icons.Default.Gavel,
                        accentBg = BrandOrangeSoft,
                        accentTint = BrandOrange,
                        title = "Real-Time Live Auctions",
                        subtitle = "Bid in Nigerian Naira (₦) with instant anti-sniping countdowns."
                    )
                    AuthHighlightRow(
                        icon = Icons.Default.VerifiedUser,
                        accentBg = BrandEmeraldSoft,
                        accentTint = BrandEmeraldDark,
                        title = "Synchronized Marketplace Account",
                        subtitle = "One buyer or approved seller account synced across Web & Android."
                    )
                }
            }
        }
    }
}

@Composable
private fun AuthModeTab(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        color = if (selected) MaterialTheme.colorScheme.surface else Color.Transparent,
        shape = RoundedCornerShape(10.dp),
        shadowElevation = if (selected) 2.dp else 0.dp,
        modifier = modifier
            .height(48.dp)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                color = if (selected) BrandSlate else BrandMuted
            )
        }
    }
}

@Composable
private fun HeroPillTag(text: String) {
    Surface(
        color = Color.White.copy(alpha = 0.16f),
        shape = RoundedCornerShape(50),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.25f))
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun AuthHighlightRow(
    icon: ImageVector,
    accentBg: Color,
    accentTint: Color,
    title: String,
    subtitle: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceSoft)
            .padding(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(accentBg),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = accentTint,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = BrandSlate
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = BrandMuted
            )
        }
    }
}
