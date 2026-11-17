package com.example.data.remote

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import com.example.data.model.Auction
import com.example.data.model.BuyerAddress
import com.example.data.model.CartItem
import com.example.data.model.Livestream
import com.example.data.model.MarketplaceOrder
import com.example.data.model.Product
import com.example.data.model.ProductReview
import com.example.data.model.SellerApplication
import com.example.data.model.SellerStorefront
import com.example.data.model.ShortVideo
import com.example.data.model.StreamMessage
import com.example.data.model.VideoComment
import com.example.data.model.WalletLedgerEntry
import com.example.data.model.WishlistItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okio.BufferedSink
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit
import kotlin.math.roundToLong

class CloudflareSyncRepository(
    private val storage: SessionStorage,
    private val baseUrl: String = CloudflareEndpoints.DEFAULT_BASE_URL,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()
) {
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()
    private val normalizedBase = baseUrl.trimEnd('/')
    private val tokenHexRegex = Regex("^[a-f0-9]{64}$", RegexOption.IGNORE_CASE)
    private val emailRegex = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    fun resolveMediaUrl(raw: String): String {
        val clean = raw.trim()
        if (clean.isBlank()) return ""
        return when {
            clean.startsWith("https://", ignoreCase = true) || clean.startsWith("http://", ignoreCase = true) -> clean
            clean.startsWith("/") -> "$normalizedBase$clean"
            else -> ""
        }
    }

    fun currentSessionSnapshot(): CloudflareSessionSnapshot {
        val token = storage.getToken()
        val cookie = storage.getSessionCookie()
        val hasCredential = !token.isNullOrBlank() || !cookie.isNullOrBlank()
        val userId = storage.getUserId()
        return CloudflareSessionSnapshot(
            signedIn = hasCredential && userId.isNotBlank(),
            userId = userId,
            email = storage.getEmail(),
            role = storage.getRole(),
            sellerStatus = storage.getSellerStatus(),
            verified = storage.isVerified(),
            suspended = storage.isSuspended(),
            displayName = storage.getDisplayName(),
            bio = storage.getBio(),
            selectedState = storage.getSelectedState(),
            hasCookieSession = !cookie.isNullOrBlank(),
            hasBearerToken = !token.isNullOrBlank()
        )
    }

    fun currentStagingFlags(): StagingFeatureFlags = storage.getStagingFlags()

    suspend fun fetchHealth(): CloudflareHealthSnapshot = withContext(Dispatchers.IO) {
        try {
            val req = newRequestBuilder("/api/health").get().build()
            client.newCall(req).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                if (!res.isSuccessful || raw.isBlank()) {
                    return@withContext CloudflareHealthSnapshot(
                        ok = false,
                        staging = storage.getStagingFlags(),
                        error = "Health check HTTP ${res.code}"
                    )
                }
                val obj = JSONObject(raw)
                val featuresObj = obj.optJSONObject("features") ?: obj.optJSONObject("staging") ?: JSONObject()
                val liveConfigured = featuresObj.optBoolean(
                    "liveStreamingConfigured",
                    featuresObj.optBoolean("streamConfigured", false)
                )
                val videoUploadsEnabled = featuresObj.optBoolean(
                    "videoUploadsEnabled",
                    featuresObj.optBoolean("r2Configured", true)
                )
                val flags = StagingFeatureFlags(
                    paymentsEnabled = featuresObj.optBoolean("paymentsEnabled", false),
                    coinsPurchasesEnabled = featuresObj.optBoolean("coinsPurchasesEnabled", false),
                    kycUploadsEnabled = featuresObj.optBoolean("kycUploadsEnabled", false),
                    orderReservationsEnabled = featuresObj.optBoolean("orderReservationsEnabled", true),
                    liveStreamingConfigured = liveConfigured,
                    videoUploadsEnabled = videoUploadsEnabled,
                    streamConfigured = featuresObj.optBoolean("streamConfigured", liveConfigured),
                    r2Configured = featuresObj.optBoolean("r2Configured", videoUploadsEnabled)
                )
                storage.saveStagingFlags(flags)
                CloudflareHealthSnapshot(
                    ok = obj.optBoolean("ok", false),
                    service = obj.optString("service", "cashncarry-api"),
                    environment = obj.optString("environment", "production"),
                    dbConnected = obj.optBoolean("dbConnected", false),
                    authDbConnected = obj.optBoolean("authDbConnected", false),
                    authenticated = obj.optBoolean("authenticated", false),
                    staging = flags
                )
            }
        } catch (t: Throwable) {
            CloudflareHealthSnapshot(
                ok = false,
                staging = storage.getStagingFlags(),
                error = t.message ?: "Unable to reach Cash N Carry API"
            )
        }
    }

    suspend fun registerAccount(email: String): CloudflareResult<String> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.length > 254 || !emailRegex.matches(cleanEmail)) {
            return@withContext CloudflareResult.Failure(400, "INVALID_EMAIL", "Please enter a valid email address.")
        }
        val payload = JSONObject().put("email", cleanEmail).toString()
        when (val res = executeJson("POST", "/api/auth/register", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(
                "If this address can register, a verification link and token have been sent."
            )
        }
    }

    suspend fun verifyEmailAndSetPassword(
        token: String,
        password: String,
        role: String = "buyer"
    ): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val cleanToken = token.trim().lowercase()
        if (!tokenHexRegex.matches(cleanToken)) {
            return@withContext CloudflareResult.Failure(400, "INVALID_TOKEN", "Enter the 64-character verification token from your email.")
        }
        if (password.length < CloudflareEndpoints.MIN_PASSWORD_LENGTH || password.length > CloudflareEndpoints.MAX_PASSWORD_LENGTH) {
            return@withContext CloudflareResult.Failure(400, "INVALID_PASSWORD", "Password must be between 12 and 128 characters.")
        }
        // New registrations are strictly buyers until they apply and receive admin approval.
        val payload = JSONObject()
            .put("token", cleanToken)
            .put("password", password)
            .put("role", "buyer")
            .toString()

        when (val res = executeJson("POST", "/api/auth/verify", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optBoolean("completed", true))
        }
    }

    suspend fun signInWithPassword(
        email: String,
        password: String
    ): CloudflareResult<CloudflareSessionSnapshot> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (!emailRegex.matches(cleanEmail)) {
            return@withContext CloudflareResult.Failure(400, "INVALID_EMAIL", "Enter a valid email address.")
        }
        if (password.length < CloudflareEndpoints.MIN_PASSWORD_LENGTH || password.length > CloudflareEndpoints.MAX_PASSWORD_LENGTH) {
            return@withContext CloudflareResult.Failure(400, "INVALID_PASSWORD", "Password must be at least 12 characters.")
        }

        val payload = JSONObject()
            .put("email", cleanEmail)
            .put("password", password)
            .toString()

        when (val res = executeJsonWithHeaders("POST", "/api/auth/login", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val (obj, setCookies) = res.data
                val signedIn = obj.optBoolean("signedIn", false)
                val token = obj.optString("token", "").takeIf { tokenHexRegex.matches(it) }
                val cookieValue = extractSessionCookie(setCookies)?.takeIf { tokenHexRegex.matches(it) }
                if (!signedIn || (token == null && cookieValue == null)) {
                    storage.clearSession()
                    return@withContext CloudflareResult.Failure(
                        401, "SESSION_MISSING", "Sign-in did not return an active session."
                    )
                }
                val userObj = if (cookieValue != null) {
                    when (val current = executeJsonWithHeaders(
                        "GET", "/api/auth/me", null, sessionCookieOverride = cookieValue
                    )) {
                        is CloudflareResult.Failure -> {
                            storage.clearSession()
                            return@withContext CloudflareResult.Failure(
                                current.statusCode, "SESSION_INVALID",
                                "Could not validate the new session."
                            )
                        }
                        is CloudflareResult.Success ->
                            current.data.first.optJSONObject("user") ?: JSONObject()
                    }
                } else {
                    obj.optJSONObject("user") ?: JSONObject()
                }
                val userId = userObj.optString("id", "")
                val userEmail = userObj.optString("email", cleanEmail).ifBlank { cleanEmail }
                val role = userObj.optString("role", "").lowercase()
                val sellerStatus = userObj.optString("sellerStatus", userObj.optString("seller_status", "none")).lowercase().ifBlank { "none" }
                val verified = userObj.optBoolean("verified", true)
                val suspended = userObj.optBoolean("suspended", false)

                if (role !in setOf("buyer", "seller") || userId.isBlank() || userEmail != cleanEmail || suspended) {
                    storage.clearSession()
                    return@withContext CloudflareResult.Failure(
                        statusCode = 403,
                        code = "MOBILE_AUTH_REJECTED",
                        message = "Mobile sign-in requires a verified active buyer or seller account."
                    )
                }

                try {
                    storage.saveSession(
                        token = token,
                        sessionCookie = cookieValue,
                        userId = userId,
                        email = userEmail,
                        role = if (role == "seller") "seller" else "buyer",
                        sellerStatus = sellerStatus,
                        verified = verified,
                        suspended = suspended
                    )
                } catch (_: IllegalStateException) {
                    storage.clearSession()
                    return@withContext CloudflareResult.Failure(
                        503, "SECURE_STORAGE_UNAVAILABLE", "Secure session storage is unavailable on this device"
                    )
                }
                fetchProfile()
                CloudflareResult.Success(currentSessionSnapshot())
            }
        }
    }

    suspend fun restoreSession(): CloudflareResult<CloudflareSessionSnapshot> = withContext(Dispatchers.IO) {
        val existingToken = storage.getToken()
        val existingCookie = storage.getSessionCookie()
        if (existingToken.isNullOrBlank() && existingCookie.isNullOrBlank()) {
            return@withContext CloudflareResult.Failure(401, "NO_SESSION", "No saved session")
        }

        when (val res = executeJson("GET", "/api/auth/me", null)) {
            is CloudflareResult.Failure -> {
                if (res.statusCode == 401 || res.statusCode == 403) {
                    storage.clearSession()
                }
                res
            }
            is CloudflareResult.Success -> {
                val obj = res.data
                val liveUser = obj.optJSONObject("user")
                val authenticated = obj.optBoolean("authenticated", liveUser != null)
                val userObj = liveUser ?: JSONObject()
                val userId = userObj.optString("id", "")
                val userEmail = userObj.optString("email", "")
                val role = userObj.optString("role", "").lowercase()
                val sellerStatus = userObj.optString("sellerStatus", userObj.optString("seller_status", "none")).lowercase().ifBlank { "none" }
                val verified = userObj.optBoolean("verified", true)
                val suspended = userObj.optBoolean("suspended", false)

                if (!authenticated || liveUser == null || role !in setOf("buyer", "seller") || userId.isBlank() || userEmail.isBlank() || suspended) {
                    storage.clearSession()
                    return@withContext CloudflareResult.Failure(401, "SESSION_EXPIRED", "Session expired. Please sign in again.")
                }

                storage.saveSession(
                    token = existingToken,
                    sessionCookie = existingCookie,
                    userId = userId,
                    email = userEmail,
                    role = if (role == "seller") "seller" else "buyer",
                    sellerStatus = sellerStatus,
                    verified = verified,
                    suspended = suspended
                )
                fetchProfile()
                CloudflareResult.Success(currentSessionSnapshot())
            }
        }
    }

    suspend fun requestPasswordReset(email: String): CloudflareResult<String> = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        if (cleanEmail.length > 254 || !emailRegex.matches(cleanEmail)) {
            return@withContext CloudflareResult.Failure(400, "INVALID_EMAIL", "Enter a valid email address.")
        }
        val payload = JSONObject().put("email", cleanEmail).toString()
        when (val res = executeJson("POST", "/api/auth/request-reset", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(
                "If this account exists and is verified, a password reset email has been sent."
            )
        }
    }

    suspend fun resetPassword(
        token: String,
        newPassword: String
    ): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val cleanToken = token.trim().lowercase()
        if (!tokenHexRegex.matches(cleanToken)) {
            return@withContext CloudflareResult.Failure(400, "INVALID_TOKEN", "Enter a valid 64-character reset token.")
        }
        if (newPassword.length < CloudflareEndpoints.MIN_PASSWORD_LENGTH || newPassword.length > CloudflareEndpoints.MAX_PASSWORD_LENGTH) {
            return@withContext CloudflareResult.Failure(400, "INVALID_PASSWORD", "New password must be between 12 and 128 characters.")
        }
        val payload = JSONObject()
            .put("token", cleanToken)
            .put("password", newPassword)
            .toString()

        when (val res = executeJson("POST", "/api/auth/reset", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                storage.clearSession()
                CloudflareResult.Success(res.data.optBoolean("completed", true))
            }
        }
    }

    suspend fun signOut(): Unit = withContext(Dispatchers.IO) {
        runCatching {
            executeJson("POST", "/api/auth/logout", "{}")
        }
        storage.clearSession()
    }

    suspend fun fetchProfile(): CloudflareResult<CloudflareSessionSnapshot> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/profile", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val profile = res.data.optJSONObject("profile") ?: res.data
                val displayName = profile.optString("display_name", "")
                val bio = profile.optString("bio", "")
                val state = profile.optString("selected_state", "Lagos").ifBlank { "Lagos" }
                val role = profile.optString("role", storage.getRole()).lowercase().ifBlank { storage.getRole() }
                val sellerStatus = profile.optString("sellerStatus", profile.optString("seller_status", storage.getSellerStatus())).lowercase().ifBlank { storage.getSellerStatus() }
                val existingUserId = storage.getUserId()
                val existingEmail = storage.getEmail()
                if (existingUserId.isNotBlank() && existingEmail.isNotBlank()) {
                    runCatching {
                        storage.saveSession(
                            token = storage.getToken(),
                            sessionCookie = storage.getSessionCookie(),
                            userId = existingUserId,
                            email = existingEmail,
                            role = if (role == "seller") "seller" else "buyer",
                            sellerStatus = sellerStatus,
                            verified = storage.isVerified(),
                            suspended = storage.isSuspended()
                        )
                    }
                }
                storage.saveProfileMetadata(displayName, bio, state)
                CloudflareResult.Success(currentSessionSnapshot())
            }
        }
    }

    suspend fun updateProfile(
        displayName: String,
        bio: String,
        avatarUrl: String,
        selectedState: String
    ): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("displayName", displayName.trim())
            .put("bio", bio.trim())
            .put("avatarUrl", avatarUrl.trim())
            .put("selectedState", selectedState.trim())
            .toString()

        when (val res = executeJson("PUT", "/api/v1/profile", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                storage.saveProfileMetadata(displayName.trim(), bio.trim(), selectedState.trim())
                CloudflareResult.Success(res.data.optBoolean("updated", true))
            }
        }
    }

    suspend fun fetchCatalogProducts(): CloudflareResult<List<Product>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/products", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("products") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val title = obj.optString("name", obj.optString("title", "")).trim()
                        val productId = obj.optString("id", "").trim()
                        val priceNaira = when {
                            obj.has("price") -> obj.optLong("price", -1L)
                            obj.has("price_minor") -> obj.optLong("price_minor", -1L) / 100L
                            else -> obj.optLong("price_naira", -1L)
                        }
                        if (productId.isBlank() || title.isBlank() || priceNaira <= 0L) continue
                        val origPrice = when {
                            obj.has("compare_at") && obj.optLong("compare_at", 0L) > 0L -> obj.optLong("compare_at", priceNaira)
                            obj.has("original_price_naira") && obj.optLong("original_price_naira", 0L) > 0L -> obj.optLong("original_price_naira", priceNaira)
                            else -> priceNaira
                        }
                        val sellerId = obj.optString("store", obj.optString("seller_id", ""))
                        val sellerName = obj.optString("store_name", obj.optString("seller_name", sellerId))
                        val publication = obj.optString("publication", "")
                        val status = if (publication == "published") "active" else obj.optString("status", "active")
                        add(
                            Product(
                                id = productId,
                                sellerId = sellerId,
                                sellerName = sellerName,
                                title = title,
                                description = obj.optString("description", ""),
                                category = obj.optString("category", ""),
                                brand = obj.optString("brand", ""),
                                priceNaira = priceNaira,
                                originalPriceNaira = origPrice.coerceAtLeast(priceNaira),
                                stockCount = obj.optLong("stock", 0L),
                                rating = obj.optDouble("rating", 0.0),
                                reviewCount = obj.optLong("reviews_count", obj.optLong("review_count", 0L)),
                                imageKey = resolveMediaUrl(obj.optString("image", obj.optString("image_url", ""))),
                                revision = obj.optLong("revision", 1L),
                                status = status,
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchProductReviews(productId: String): CloudflareResult<List<ProductReview>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/reviews?product_id=${Uri.encode(productId)}", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("reviews") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            ProductReview(
                                id = obj.optString("id"),
                                productId = obj.optString("product_id", productId),
                                userId = obj.optString("user_id"),
                                userName = obj.optString("author_name", ""),
                                rating = obj.optLong("rating", 0L),
                                comment = obj.optString("comment", ""),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchStorefronts(): CloudflareResult<List<SellerStorefront>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/storefronts", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("storefronts") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            SellerStorefront(
                                id = obj.optString("id"),
                                ownerId = obj.optString("owner_id", obj.optString("id")),
                                businessName = obj.optString("name", ""),
                                tagline = obj.optString("description", ""),
                                stateLocation = obj.optString("location", ""),
                                verified = obj.optInt("verified", 0) == 1 || obj.optBoolean("verified", false),
                                rating = obj.optDouble("rating", 0.0),
                                followersCount = obj.optLong("followers_count", 0L),
                                status = obj.optString("status", "active")
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchAddresses(): CloudflareResult<List<BuyerAddress>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/addresses", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("addresses") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            BuyerAddress(
                                id = obj.optString("id"),
                                recipient = obj.optString("recipient", ""),
                                phone = obj.optString("phone", ""),
                                line = obj.optString("line", ""),
                                city = obj.optString("city", ""),
                                state = obj.optString("state", "Lagos")
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun saveAddress(
        recipient: String,
        phone: String,
        line: String,
        city: String,
        state: String
    ): CloudflareResult<BuyerAddress> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("recipient", recipient.trim())
            .put("phone", phone.trim())
            .put("line", line.trim())
            .put("city", city.trim())
            .put("state", state.trim())
            .toString()
        when (val res = executeJson("POST", "/api/addresses", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val addr = res.data.optJSONObject("address") ?: JSONObject()
                CloudflareResult.Success(
                    BuyerAddress(
                        id = addr.optString("id", ""),
                        recipient = addr.optString("recipient", recipient),
                        phone = addr.optString("phone", phone),
                        line = addr.optString("line", line),
                        city = addr.optString("city", city),
                        state = addr.optString("state", state)
                    )
                )
            }
        }
    }

    suspend fun fetchSellerApplication(): CloudflareResult<Pair<String, SellerApplication?>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/seller/application", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val sellerStatus = res.data.optString("sellerStatus", storage.getSellerStatus()).lowercase().ifBlank { "none" }
                val appObj = res.data.optJSONObject("application")
                val application = appObj?.let { parseSellerApplication(it) }
                CloudflareResult.Success(sellerStatus to application)
            }
        }
    }

    suspend fun submitSellerApplication(
        businessName: String,
        cacNumber: String,
        businessType: String,
        stateLocation: String,
        phone: String,
        description: String
    ): CloudflareResult<SellerApplication> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("businessName", businessName.trim())
            .put("cacNumber", cacNumber.trim())
            .put("businessType", businessType.trim())
            .put("stateLocation", stateLocation.trim())
            .put("phone", phone.trim())
            .put("description", description.trim())
            .toString()
        when (val res = executeJson("POST", "/api/v1/seller/application", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val appObj = res.data.optJSONObject("application") ?: JSONObject()
                CloudflareResult.Success(parseSellerApplication(appObj))
            }
        }
    }

    suspend fun fetchSellerProducts(): CloudflareResult<List<Product>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/seller/products", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("items") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val priceMinor = obj.optLong("price_minor", 0L)
                        val compareMinor = obj.optLong("compare_at_minor", 0L)
                        val priceNaira = priceMinor / 100L
                        val origNaira = if (compareMinor > priceMinor) compareMinor / 100L else priceNaira
                        add(
                            Product(
                                id = obj.optString("id"),
                                sellerId = obj.optString("owner"),
                                sellerName = storage.getDisplayName(),
                                title = obj.optString("name", ""),
                                description = obj.optString("description", ""),
                                category = obj.optString("category", ""),
                                brand = obj.optString("brand", ""),
                                priceNaira = priceNaira,
                                originalPriceNaira = origNaira,
                                stockCount = obj.optLong("stock", 0L),
                                imageKey = resolveMediaUrl(obj.optString("image_url", "")),
                                status = obj.optString("publication", "draft"),
                                revision = obj.optLong("revision", 1L),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchLivestreams(): CloudflareResult<List<Livestream>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/live", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("rooms") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            Livestream(
                                id = obj.optString("room_id"),
                                sellerId = obj.optString("seller_id"),
                                sellerName = obj.optString("seller_name", ""),
                                title = obj.optString("title", ""),
                                category = obj.optString("category", ""),
                                streamUrl = resolveMediaUrl(obj.optString("stream_url", "")),
                                status = obj.optString("status", "live"),
                                viewerCount = obj.optLong("viewer_count", 0L),
                                likesCount = obj.optLong("hearts_count", 0L),
                                pinnedProductId = obj.optString("pinned_product_id", ""),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchLiveComments(roomId: String): CloudflareResult<List<StreamMessage>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/live/comments?room_id=${Uri.encode(roomId)}", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("comments") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            StreamMessage(
                                id = obj.optString("id"),
                                streamId = obj.optString("room_id", roomId),
                                userId = obj.optString("user_id"),
                                userName = obj.optString("author_name", ""),
                                text = obj.optString("body", ""),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchVideos(): CloudflareResult<List<ShortVideo>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/videos", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("videos") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            ShortVideo(
                                id = obj.optString("id"),
                                sellerId = obj.optString("seller_id"),
                                sellerName = obj.optString("seller_name", ""),
                                sellerVerified = obj.optBoolean("seller_verified", false),
                                title = obj.optString("title", ""),
                                caption = obj.optString("caption", ""),
                                videoUrl = resolveMediaUrl(obj.optString("video_url", "")),
                                coverKey = resolveMediaUrl(obj.optString("cover_url", "")),
                                mimeType = obj.optString("mime_type", "video/mp4"),
                                productId = obj.optString("product_id", ""),
                                productTitle = obj.optString("product_name", ""),
                                productPriceNaira = obj.optLong("product_price_minor", 0L) / 100L,
                                productStock = obj.optLong("product_stock", 0L),
                                productImageUrl = resolveMediaUrl(obj.optString("product_image_url", "")),
                                category = obj.optString("product_category", ""),
                                likesCount = obj.optLong("likes_count", 0L),
                                commentsCount = obj.optLong("comments_count", 0L),
                                likedByViewer = obj.optBoolean("liked", false),
                                followingSeller = obj.optBoolean("following", false),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchVideoComments(videoId: String): CloudflareResult<List<VideoComment>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/videos/comments?video_id=${Uri.encode(videoId)}", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("comments") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            VideoComment(
                                id = obj.optString("id"),
                                videoId = obj.optString("video_id", videoId),
                                userId = obj.optString("user_id"),
                                userName = obj.optString("author_name", ""),
                                text = obj.optString("body", ""),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun uploadShortVideoWithProgress(
        contentResolver: ContentResolver,
        videoUri: Uri,
        title: String,
        caption: String,
        productId: String,
        cacheDir: File,
        onProgress: (Float) -> Unit
    ): CloudflareResult<ShortVideo> = withContext(Dispatchers.IO) {
        var tempFile: File? = null
        try {
            val mimeType = contentResolver.getType(videoUri)?.lowercase().orEmpty()
                .ifBlank { "video/mp4" }
            val allowedMimes = setOf("video/mp4", "video/webm", "video/quicktime")
            if (mimeType !in allowedMimes) {
                return@withContext CloudflareResult.Failure(
                    415,
                    "UNSUPPORTED_MEDIA_TYPE",
                    "Only MP4, WebM, or MOV video files are supported."
                )
            }
            var fileName = "upload.mp4"
            contentResolver.query(videoUri, null, null, null, null)?.use { cursor ->
                val nameCol = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (cursor.moveToFirst() && nameCol >= 0) {
                    fileName = cursor.getString(nameCol)?.takeIf { it.isNotBlank() } ?: fileName
                }
            }

            tempFile = File.createTempFile("cnc_vid_", ".tmp", cacheDir)
            var totalBytes = 0L
            contentResolver.openInputStream(videoUri)?.use { input ->
                tempFile.outputStream().use { output ->
                    val buf = ByteArray(16 * 1024)
                    while (true) {
                        val read = input.read(buf)
                        if (read <= 0) break
                        totalBytes += read
                        if (totalBytes > 50L * 1024L * 1024L) {
                            return@withContext CloudflareResult.Failure(
                                413,
                                "FILE_TOO_LARGE",
                                "Video must be 50MB or smaller."
                            )
                        }
                        output.write(buf, 0, read)
                    }
                }
            } ?: return@withContext CloudflareResult.Failure(
                400,
                "FILE_UNREADABLE",
                "Could not read the selected video file."
            )

            if (totalBytes < 16L) {
                return@withContext CloudflareResult.Failure(
                    400,
                    "EMPTY_VIDEO",
                    "Selected video file is empty or corrupted."
                )
            }

            onProgress(0.05f)

            val fileMediaType = mimeType.toMediaTypeOrNull() ?: "video/mp4".toMediaType()
            val progressBody = object : RequestBody() {
                override fun contentType(): MediaType = fileMediaType
                override fun contentLength(): Long = tempFile.length()
                override fun writeTo(sink: BufferedSink) {
                    val fileLen = tempFile.length().coerceAtLeast(1L)
                    var uploaded = 0L
                    val buf = ByteArray(16 * 1024)
                    FileInputStream(tempFile).use { fis ->
                        while (true) {
                            val read = fis.read(buf)
                            if (read <= 0) break
                            sink.write(buf, 0, read)
                            uploaded += read
                            onProgress((uploaded.toFloat() / fileLen.toFloat()).coerceIn(0.05f, 0.95f))
                        }
                    }
                }
            }

            val multipartBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("title", title.trim())
                .addFormDataPart("caption", caption.trim())
                .addFormDataPart("productId", productId.trim())
                .addFormDataPart("video", fileName, progressBody)
                .build()

            val request = newRequestBuilder("/api/v1/videos/upload")
                .post(multipartBody)
                .build()

            client.newCall(request).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                val obj = runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
                if (!res.isSuccessful) {
                    return@withContext CloudflareResult.Failure(
                        res.code,
                        obj.optString("code", "HTTP_${res.code}"),
                        obj.optString("error", "Video upload failed (${res.code})")
                    )
                }
                val vObj = obj.optJSONObject("video") ?: JSONObject()
                onProgress(1.0f)
                CloudflareResult.Success(
                    ShortVideo(
                        id = obj.optString("id", vObj.optString("id")),
                        sellerId = vObj.optString("seller_id", storage.getUserId()),
                        sellerName = vObj.optString("seller_name", storage.getDisplayName()),
                        title = vObj.optString("title", title.trim()),
                        caption = vObj.optString("caption", caption.trim()),
                        videoUrl = resolveMediaUrl(obj.optString("videoUrl", vObj.optString("video_url", ""))),
                        coverKey = resolveMediaUrl(vObj.optString("cover_url", "")),
                        mimeType = vObj.optString("mime_type", mimeType),
                        productId = vObj.optString("product_id", productId),
                        createdAtEpochMs = System.currentTimeMillis()
                    )
                )
            }
        } catch (t: Throwable) {
            CloudflareResult.Failure(0, "UPLOAD_FAILED", t.message ?: "Video upload failed")
        } finally {
            tempFile?.delete()
        }
    }

    suspend fun deleteVideo(videoId: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        when (val res = executeJson("DELETE", "/api/v1/videos/${Uri.encode(videoId)}", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optBoolean("deleted", true))
        }
    }

    suspend fun fetchWishlist(): CloudflareResult<List<WishlistItem>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/wishlist", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("wishlist") ?: JSONArray()
                val userId = storage.getUserId()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val pid = obj.optString("product_id", obj.optString("productId"))
                        if (pid.isBlank()) continue
                        add(
                            WishlistItem(
                                id = pid,
                                userId = userId,
                                productId = pid,
                                productTitle = obj.optString("title", ""),
                                priceNaira = obj.optLong("price_naira", 0L),
                                sellerName = obj.optString("seller_name", ""),
                                imageKey = resolveMediaUrl(obj.optString("image_url", ""))
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchFollows(): CloudflareResult<List<String>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/v1/follows", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("following") ?: JSONArray()
                val ids = buildList {
                    for (i in 0 until arr.length()) {
                        val id = arr.optJSONObject(i)?.optString("seller_id", "") ?: ""
                        if (id.isNotBlank()) add(id)
                    }
                }
                CloudflareResult.Success(ids)
            }
        }
    }

    suspend fun fetchOrders(): CloudflareResult<List<MarketplaceOrder>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/orders", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("orders") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val itemsArr = obj.optJSONArray("items") ?: JSONArray()
                        val summary = if (itemsArr.length() > 0) {
                            buildList {
                                for (j in 0 until itemsArr.length()) {
                                    val item = itemsArr.optJSONObject(j) ?: continue
                                    add("${item.optLong("quantity", 1L)}x ${item.optString("name")}")
                                }
                            }.joinToString(", ")
                        } else {
                            obj.optString("items_summary", "Order #${obj.optString("id")}")
                        }
                        val totalNaira = if (obj.has("total_minor")) {
                            obj.optLong("total_minor", 0L) / 100L
                        } else {
                            obj.optLong("total_naira", 0L)
                        }
                        add(
                            MarketplaceOrder(
                                id = obj.optString("id"),
                                buyerId = obj.optString("buyer", obj.optString("buyer_id", storage.getUserId())),
                                sellerId = itemsArr.optJSONObject(0)?.optString("seller").orEmpty(),
                                sellerName = obj.optString("seller_name", ""),
                                itemsSummary = summary,
                                totalNaira = totalNaira,
                                deliveryState = obj.optString("delivery_state", ""),
                                deliveryAddress = obj.optString("delivery_address", ""),
                                paymentStatus = obj.optString("payment_status", obj.optString("status", "awaiting_payment")),
                                orderStatus = obj.optString("status", "awaiting_payment"),
                                fulfilmentStatus = obj.optString("fulfilment_status", ""),
                                carrier = obj.optString("carrier", ""),
                                trackingNumber = obj.optString("tracking_number", ""),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun fetchSellerOrders(): CloudflareResult<List<MarketplaceOrder>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/seller/orders", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("orders") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            MarketplaceOrder(
                                id = obj.optString("id"),
                                buyerId = obj.optString("buyer", ""),
                                sellerId = storage.getUserId(),
                                itemsSummary = "Order ${obj.optString("id").take(8)}",
                                totalNaira = obj.optLong("total_minor", 0L) / 100L,
                                deliveryAddress = obj.optString("delivery_address", ""),
                                orderStatus = obj.optString("status", "awaiting_payment"),
                                fulfilmentStatus = obj.optString("fulfilment_status", ""),
                                carrier = obj.optString("carrier", ""),
                                trackingNumber = obj.optString("tracking_number", ""),
                                createdAtEpochMs = obj.optLong("created", 0L) * 1000L
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun saveSellerStore(name: String, description: String, location: String = "Lagos"): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("name", name.trim())
            .put("description", description.trim())
            .put("location", location.trim())
            .toString()
        when (val res = executeJson("POST", "/api/seller/store", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optBoolean("updated", false))
        }
    }

    suspend fun createSellerProductDraft(
        id: String,
        name: String,
        description: String = "",
        category: String = "electronics",
        brand: String = "",
        priceNaira: Long,
        compareAtNaira: Long = 0L,
        stock: Long,
        submitForReview: Boolean = false
    ): CloudflareResult<Product> = withContext(Dispatchers.IO) {
        if (priceNaira <= 0L || priceNaira > 10_000_000L || stock !in 0L..1_000_000L) {
            return@withContext CloudflareResult.Failure(400, "INVALID_PRODUCT", "Enter a valid price and stock")
        }
        val payload = JSONObject()
            .put("action", "create")
            .put("id", id)
            .put("name", name.trim())
            .put("description", description.trim())
            .put("category", category.trim().lowercase())
            .put("brand", brand.trim())
            .put("price_minor", priceNaira * 100L)
            .put("compare_at_minor", (compareAtNaira.coerceAtLeast(0L)) * 100L)
            .put("stock", stock)
            .put("submitForReview", submitForReview)
            .toString()
        when (val res = executeJson("POST", "/api/seller/products", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val item = res.data.optJSONObject("item")
                CloudflareResult.Success(
                    Product(
                        id = item?.optString("id") ?: id,
                        sellerId = item?.optString("owner") ?: storage.getUserId(),
                        sellerName = storage.getDisplayName(),
                        title = item?.optString("name") ?: name.trim(),
                        description = item?.optString("description") ?: description.trim(),
                        category = item?.optString("category") ?: category,
                        brand = item?.optString("brand") ?: brand,
                        priceNaira = priceNaira,
                        originalPriceNaira = compareAtNaira.coerceAtLeast(priceNaira),
                        stockCount = stock,
                        status = item?.optString("publication") ?: if (submitForReview) "pending" else "draft",
                        revision = item?.optLong("revision", 1L) ?: 1L
                    )
                )
            }
        }
    }

    suspend fun updateSellerProduct(
        id: String,
        revision: Long,
        name: String,
        description: String,
        category: String,
        brand: String,
        priceNaira: Long,
        compareAtNaira: Long,
        stock: Long
    ): CloudflareResult<Product> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("action", "update")
            .put("id", id)
            .put("revision", revision)
            .put("name", name.trim())
            .put("description", description.trim())
            .put("category", category.trim().lowercase())
            .put("brand", brand.trim())
            .put("price_minor", priceNaira * 100L)
            .put("compare_at_minor", compareAtNaira.coerceAtLeast(0L) * 100L)
            .put("stock", stock)
            .toString()
        when (val res = executeJson("POST", "/api/seller/products", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val item = res.data.optJSONObject("item") ?: JSONObject()
                CloudflareResult.Success(
                    Product(
                        id = item.optString("id", id),
                        sellerId = item.optString("owner", storage.getUserId()),
                        sellerName = storage.getDisplayName(),
                        title = item.optString("name", name),
                        description = item.optString("description", description),
                        category = item.optString("category", category),
                        brand = item.optString("brand", brand),
                        priceNaira = item.optLong("price_minor", priceNaira * 100L) / 100L,
                        stockCount = item.optLong("stock", stock),
                        status = item.optString("publication", "draft"),
                        revision = item.optLong("revision", revision + 1L)
                    )
                )
            }
        }
    }

    suspend fun changeSellerProductPublication(
        action: String,
        id: String,
        revision: Long
    ): CloudflareResult<Long> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("action", action)
            .put("id", id)
            .put("revision", revision)
            .toString()
        when (val res = executeJson("POST", "/api/seller/products", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val nextRev = res.data.optJSONObject("product")?.optLong("revision", revision + 1L) ?: (revision + 1L)
                CloudflareResult.Success(nextRev)
            }
        }
    }

    suspend fun fetchCart(): CloudflareResult<List<CartItem>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/cart", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val rows = res.data.optJSONArray("items")
                    ?: return@withContext CloudflareResult.Failure(502, "INVALID_CART_RESPONSE", "Cart response is missing items")
                val userId = storage.getUserId()
                val items = mutableListOf<CartItem>()
                for (i in 0 until rows.length()) {
                    val row = rows.optJSONObject(i)
                        ?: return@withContext CloudflareResult.Failure(502, "INVALID_CART_ITEM", "Cart item is malformed")
                    val pid = row.optString("product", "").trim()
                    val qty = row.optLong("quantity", -1L)
                    val details = row.optJSONObject("details")
                    if (pid.isBlank() || qty !in 1L..99L || details == null) {
                        return@withContext CloudflareResult.Failure(409, "CART_ITEM_UNAVAILABLE", "A cart product is unavailable; review it before checkout")
                    }
                    val name = details.optString("name", "").trim()
                    val price = details.optDouble("price", -1.0)
                    if (name.isBlank() || !price.isFinite() || price <= 0.0 || price > 10_000_000.0) {
                        return@withContext CloudflareResult.Failure(409, "CART_ITEM_UNAVAILABLE", "Cart pricing is unavailable; refresh the catalog")
                    }
                    items.add(
                        CartItem(
                            id = "${pid}_Standard",
                            userId = userId,
                            productId = pid,
                            sellerId = details.optString("sellerId", ""),
                            sellerName = details.optString("sellerName", ""),
                            productTitle = name,
                            unitPriceNaira = price.roundToLong(),
                            quantity = qty,
                            variantLabel = "Standard",
                            imageKey = resolveMediaUrl(details.optString("image", ""))
                        )
                    )
                }
                CloudflareResult.Success(items)
            }
        }
    }

    suspend fun updateCart(
        productId: String,
        quantity: Int,
        source: String = "mobile"
    ): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("id", productId)
            .put("quantity", quantity)
            .put("source", source)
            .toString()

        when (val res = executeJson("POST", "/api/cart", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(true)
        }
    }

    suspend fun checkoutCart(
        requestId: String,
        addressId: String
    ): CloudflareResult<String> = withContext(Dispatchers.IO) {
        if (!storage.getStagingFlags().paymentsEnabled) {
            return@withContext CloudflareResult.Failure(
                statusCode = 503,
                code = "PAYMENTS_DISABLED",
                message = "Checkout payments are currently disabled until a payment provider is verified."
            )
        }
        val payload = JSONObject()
            .put("request_id", requestId)
            .put("address_id", addressId)
            .toString()

        when (val res = executeJson("POST", "/api/checkout", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val orderId = res.data.optJSONObject("order")?.optString("id")
                    ?: res.data.optString("orderId", "")
                CloudflareResult.Success(orderId)
            }
        }
    }

    suspend fun initializePayment(orderId: String): CloudflareResult<String> = withContext(Dispatchers.IO) {
        if (!storage.getStagingFlags().paymentsEnabled) {
            return@withContext CloudflareResult.Failure(
                statusCode = 503,
                code = "PAYMENTS_DISABLED",
                message = "Online payments are currently disabled (PAYMENTS_ENABLED=false)."
            )
        }
        val payload = JSONObject().put("order_id", orderId).toString()
        when (val res = executeJson("POST", "/api/payments/initialize", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val checkoutUrl = res.data.optString("checkout_url", "")
                if (checkoutUrl.isBlank()) {
                    CloudflareResult.Failure(503, "PAYMENTS_DISABLED", "Payments temporarily unavailable")
                } else {
                    CloudflareResult.Success(checkoutUrl)
                }
            }
        }
    }

    suspend fun toggleWishlist(productId: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("productId", productId).toString()
        when (val res = executeJson("POST", "/api/v1/wishlist", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optBoolean("wishlisted", true))
        }
    }

    suspend fun toggleFollowSeller(sellerId: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("sellerId", sellerId).toString()
        when (val res = executeJson("POST", "/api/v1/follows", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optBoolean("following", true))
        }
    }

    suspend fun submitReview(productId: String, rating: Long, comment: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("productId", productId)
            .put("rating", rating.coerceIn(1L, 5L))
            .put("comment", comment.trim())
            .toString()
        when (val res = executeJson("POST", "/api/v1/reviews", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(true)
        }
    }

    suspend fun likeVideo(videoId: String): CloudflareResult<Pair<Boolean, Long>> = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("videoId", videoId).toString()
        when (val res = executeJson("POST", "/api/v1/videos/like", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(
                res.data.optBoolean("liked", true) to res.data.optLong("likesCount", 0L)
            )
        }
    }

    suspend fun commentVideo(videoId: String, body: String): CloudflareResult<VideoComment> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("videoId", videoId)
            .put("body", body.trim())
            .toString()
        when (val res = executeJson("POST", "/api/v1/videos/comments", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val c = res.data.optJSONObject("comment") ?: JSONObject()
                CloudflareResult.Success(
                    VideoComment(
                        id = c.optString("id", res.data.optString("id")),
                        videoId = c.optString("video_id", videoId),
                        userId = c.optString("user_id", storage.getUserId()),
                        userName = c.optString("author_name", storage.getDisplayName()),
                        text = c.optString("body", body.trim()),
                        createdAtEpochMs = c.optLong("created", System.currentTimeMillis() / 1000L) * 1000L
                    )
                )
            }
        }
    }

    suspend fun sendLiveComment(roomId: String, body: String): CloudflareResult<StreamMessage> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("roomId", roomId)
            .put("body", body.trim())
            .toString()
        when (val res = executeJson("POST", "/api/v1/live/comments", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val c = res.data.optJSONObject("comment") ?: JSONObject()
                CloudflareResult.Success(
                    StreamMessage(
                        id = c.optString("id", res.data.optString("id")),
                        streamId = roomId,
                        userId = c.optString("user_id", storage.getUserId()),
                        userName = c.optString("author_name", storage.getDisplayName()),
                        text = c.optString("body", body.trim()),
                        createdAtEpochMs = System.currentTimeMillis()
                    )
                )
            }
        }
    }

    suspend fun createLivestream(title: String, category: String, pinnedProductId: String?): CloudflareResult<Livestream> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("title", title.trim())
            .put("category", category)
            .put("pinnedProductId", pinnedProductId.orEmpty())
            .toString()
        when (val res = executeJson("POST", "/api/v1/live", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val room = res.data.optJSONObject("room") ?: JSONObject()
                CloudflareResult.Success(
                    Livestream(
                        id = res.data.optString("roomId", room.optString("room_id")),
                        sellerId = room.optString("seller_id", storage.getUserId()),
                        sellerName = room.optString("seller_name", storage.getDisplayName()),
                        title = room.optString("title", title.trim()),
                        category = room.optString("category", category),
                        status = room.optString("status", "live"),
                        pinnedProductId = room.optString("pinned_product_id", pinnedProductId.orEmpty()),
                        streamUrl = resolveMediaUrl(room.optString("stream_url", "")),
                        createdAtEpochMs = System.currentTimeMillis()
                    )
                )
            }
        }
    }

    suspend fun likeLivestream(roomId: String): CloudflareResult<Long> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("roomId", roomId)
            .put("action", "like")
            .toString()
        when (val res = executeJson("PATCH", "/api/v1/live", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optLong("heartsCount", 0L))
        }
    }

    suspend fun pinStreamProduct(roomId: String, productId: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("roomId", roomId)
            .put("action", "pin")
            .put("pinnedProductId", productId)
            .toString()
        when (val res = executeJson("PATCH", "/api/v1/live", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(true)
        }
    }

    suspend fun endLivestream(roomId: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("roomId", roomId)
            .put("action", "end")
            .toString()
        when (val res = executeJson("PATCH", "/api/v1/live", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(true)
        }
    }

    suspend fun fetchAuctions(): CloudflareResult<List<Auction>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/auctions", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val arr = res.data.optJSONArray("auctions") ?: JSONArray()
                val list = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val starting = obj.optString("startingBid", "0").toDoubleOrNull()?.roundToLong() ?: 0L
                        val currentStr = obj.optString("currentBid", "")
                        val current = currentStr.toDoubleOrNull()?.roundToLong() ?: starting
                        val endsAtMs = parseIsoTimestampMs(obj.optString("endsAt", ""))
                        val closedAtStr = obj.optString("closedAt", "")
                        val status = if (closedAtStr.isNotBlank() && closedAtStr != "null") "ended"
                        else if (endsAtMs in 1..System.currentTimeMillis()) "ended"
                        else "live"
                        add(
                            Auction(
                                id = obj.optString("id"),
                                sellerId = obj.optString("sellerId"),
                                sellerName = obj.optString("storefrontName", ""),
                                productId = obj.optString("productId"),
                                productTitle = obj.optString("title", ""),
                                productImageKey = resolveMediaUrl(obj.optString("image", "")),
                                startingBidNaira = starting,
                                currentBidNaira = current,
                                minIncrementNaira = 100L,
                                bidCount = obj.optLong("bidsCount", 0L),
                                highestBidderId = if (obj.optBoolean("winning", false)) storage.getUserId() else "",
                                highestBidderName = if (obj.optBoolean("winning", false)) "You" else "",
                                endsAtEpochMs = endsAtMs,
                                status = status,
                                winningOrderId = obj.optString("orderId", "")
                            )
                        )
                    }
                }
                CloudflareResult.Success(list)
            }
        }
    }

    suspend fun createAuction(
        productId: String,
        startingBidNaira: Long,
        durationMinutes: Long
    ): CloudflareResult<String> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("productId", productId)
            .put("startingBidKobo", startingBidNaira * 100L)
            .put("durationMinutes", durationMinutes)
            .toString()
        when (val res = executeJson("POST", "/api/auctions", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optString("auctionId", ""))
        }
    }

    suspend fun placeBid(auctionId: String, bidAmountNaira: Long): CloudflareResult<Long> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("action", "bid")
            .put("id", auctionId)
            .put("amountKobo", bidAmountNaira * 100L)
            .toString()
        when (val res = executeJson("PATCH", "/api/auctions", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optLong("currentBidKobo", bidAmountNaira * 100L) / 100L)
        }
    }

    suspend fun fetchCoins(): CloudflareResult<Pair<Long, List<WalletLedgerEntry>>> = withContext(Dispatchers.IO) {
        when (val res = executeJson("GET", "/api/coins", null)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> {
                val balance = res.data.optLong("balance", 0L)
                val arr = res.data.optJSONArray("activity") ?: JSONArray()
                val userId = storage.getUserId()
                val ledger = buildList {
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        add(
                            WalletLedgerEntry(
                                id = obj.optString("id"),
                                userId = userId,
                                coinDelta = obj.optLong("delta", 0L),
                                description = obj.optString("reason", ""),
                                createdAtEpochMs = parseIsoTimestampMs(obj.optString("createdAt", ""))
                            )
                        )
                    }
                }
                CloudflareResult.Success(balance to ledger)
            }
        }
    }

    suspend fun sendGift(requestId: String, recipientId: String, giftType: String): CloudflareResult<String> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("action", "gift")
            .put("requestId", requestId)
            .put("recipientId", recipientId)
            .put("gift", giftType)
            .toString()
        when (val res = executeJson("POST", "/api/coins", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.optString("giftId", ""))
        }
    }

    suspend fun fulfilSellerOrder(orderId: String, status: String, trackingNumber: String = ""): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("orderId", orderId)
            .put("status", status)
            .put("trackingNumber", trackingNumber)
            .toString()
        when (val res = executeJson("POST", "/api/v1/seller/orders/fulfil", payload)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(true)
        }
    }

    private fun parseSellerApplication(obj: JSONObject): SellerApplication {
        return SellerApplication(
            id = obj.optString("id"),
            userId = obj.optString("user_id", storage.getUserId()),
            businessName = obj.optString("business_name", ""),
            cacNumber = obj.optString("cac_number", ""),
            businessType = obj.optString("business_type", "Retail"),
            stateLocation = obj.optString("state_location", "Lagos"),
            phone = obj.optString("phone", ""),
            description = obj.optString("description", ""),
            status = obj.optString("status", "pending"),
            reviewerNotes = obj.optString("reviewer_notes", ""),
            createdAtEpochMs = obj.optLong("created", 0L) * 1000L,
            updatedAtEpochMs = obj.optLong("updated", 0L) * 1000L
        )
    }

    private fun parseIsoTimestampMs(raw: String): Long {
        if (raw.isBlank() || raw == "null") return 0L
        return runCatching {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            sdf.parse(raw)?.time ?: 0L
        }.getOrElse {
            runCatching {
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                sdf.parse(raw)?.time ?: 0L
            }.getOrDefault(0L)
        }
    }

    private fun extractSessionCookie(setCookieHeaders: List<String>): String? {
        val prefix = "${CloudflareEndpoints.SESSION_COOKIE_NAME}="
        for (header in setCookieHeaders) {
            val idx = header.indexOf(prefix)
            if (idx >= 0) {
                val afterPrefix = header.substring(idx + prefix.length)
                val endIdx = afterPrefix.indexOf(';')
                val rawVal = (if (endIdx >= 0) afterPrefix.substring(0, endIdx) else afterPrefix).trim()
                if (rawVal.isNotBlank()) return rawVal
            }
        }
        return null
    }

    private fun newRequestBuilder(path: String): Request.Builder {
        val builder = Request.Builder()
            .url("$normalizedBase$path")
            .header("Origin", normalizedBase)
            .header(CloudflareEndpoints.CLIENT_TYPE_HEADER, CloudflareEndpoints.CLIENT_TYPE_MOBILE)
            .header("Accept", "application/json")
        val token = storage.getToken()
        val cookie = storage.getSessionCookie()
        if (!token.isNullOrBlank()) {
            builder.header("Authorization", "Bearer $token")
        } else if (!cookie.isNullOrBlank()) {
            builder.header("Cookie", "${CloudflareEndpoints.SESSION_COOKIE_NAME}=$cookie")
        }
        return builder
    }

    private fun executeJson(
        method: String,
        path: String,
        jsonBody: String?
    ): CloudflareResult<JSONObject> {
        return when (val res = executeJsonWithHeaders(method, path, jsonBody)) {
            is CloudflareResult.Failure -> res
            is CloudflareResult.Success -> CloudflareResult.Success(res.data.first)
        }
    }

    private fun executeJsonWithHeaders(
        method: String,
        path: String,
        jsonBody: String?,
        sessionCookieOverride: String? = null
    ): CloudflareResult<Pair<JSONObject, List<String>>> {
        return try {
            val builder = newRequestBuilder(path)
            if (sessionCookieOverride != null) {
                require(tokenHexRegex.matches(sessionCookieOverride))
                builder.removeHeader("Authorization")
                builder.header("Cookie", "${CloudflareEndpoints.SESSION_COOKIE_NAME}=$sessionCookieOverride")
            }
            when (method) {
                "GET" -> builder.get()
                "POST" -> builder.post((jsonBody ?: "{}").toRequestBody(jsonMediaType))
                "PUT" -> builder.put((jsonBody ?: "{}").toRequestBody(jsonMediaType))
                "PATCH" -> builder.patch((jsonBody ?: "{}").toRequestBody(jsonMediaType))
                "DELETE" -> builder.delete((jsonBody ?: "{}").toRequestBody(jsonMediaType))
                else -> builder.method(method, jsonBody?.toRequestBody(jsonMediaType))
            }
            client.newCall(builder.build()).execute().use { res ->
                val raw = res.body?.string().orEmpty()
                val contentType = res.header("Content-Type").orEmpty()
                val parsed = runCatching {
                    if (raw.isNotBlank()) JSONObject(raw) else JSONObject()
                }
                if (res.isSuccessful && (!contentType.contains("json", ignoreCase = true) || parsed.isFailure || raw.isBlank())) {
                    return CloudflareResult.Failure(
                        statusCode = res.code,
                        code = "INVALID_RESPONSE",
                        message = "Server returned a non-JSON or empty API response"
                    )
                }
                val obj = parsed.getOrDefault(JSONObject())

                if (!res.isSuccessful) {
                    return CloudflareResult.Failure(
                        statusCode = res.code,
                        code = obj.optString("code", "HTTP_${res.code}"),
                        message = obj.optString("error", "Request failed (${res.code})")
                    )
                }
                CloudflareResult.Success(obj to res.headers.values("Set-Cookie"))
            }
        } catch (t: Throwable) {
            CloudflareResult.Failure(
                statusCode = 0,
                code = "NETWORK_ERROR",
                message = t.message ?: "Network error communicating with Cash N Carry server"
            )
        }
    }
}
