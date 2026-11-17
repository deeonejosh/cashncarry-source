package com.example.data.remote

import com.example.BuildConfig

object CloudflareEndpoints {
    val DEFAULT_BASE_URL: String
        get() = BuildConfig.CNC_API_BASE_URL
    const val CLIENT_TYPE_HEADER = "X-Client-Type"
    const val CLIENT_TYPE_MOBILE = "mobile"
    const val SESSION_COOKIE_NAME = "__Host-cnc_session"
    const val MIN_PASSWORD_LENGTH = 12
    const val MAX_PASSWORD_LENGTH = 128
}

data class StagingFeatureFlags(
    val paymentsEnabled: Boolean = false,
    val coinsPurchasesEnabled: Boolean = false,
    val kycUploadsEnabled: Boolean = false,
    val orderReservationsEnabled: Boolean = true,
    val liveStreamingConfigured: Boolean = false,
    val videoUploadsEnabled: Boolean = true,
    val streamConfigured: Boolean = false,
    val r2Configured: Boolean = false
)

data class CloudflareHealthSnapshot(
    val ok: Boolean = false,
    val service: String = "cashncarry-api",
    val environment: String = "production",
    val dbConnected: Boolean = false,
    val authDbConnected: Boolean = false,
    val authenticated: Boolean = false,
    val staging: StagingFeatureFlags = StagingFeatureFlags(),
    val error: String? = null
)

data class CloudflareSessionSnapshot(
    val signedIn: Boolean = false,
    val userId: String = "",
    val email: String = "",
    val role: String = "buyer",
    val sellerStatus: String = "none",
    val verified: Boolean = false,
    val suspended: Boolean = false,
    val displayName: String = "",
    val bio: String = "",
    val selectedState: String = "Lagos",
    val hasCookieSession: Boolean = false,
    val hasBearerToken: Boolean = false
) {
    val isApprovedSeller: Boolean
        get() = signedIn &&
            role.equals("seller", ignoreCase = true) &&
            sellerStatus.equals("approved", ignoreCase = true) &&
            verified &&
            !suspended
}

sealed interface CloudflareResult<out T> {
    data class Success<T>(val data: T) : CloudflareResult<T>
    data class Failure(
        val statusCode: Int,
        val code: String,
        val message: String
    ) : CloudflareResult<Nothing>
}
