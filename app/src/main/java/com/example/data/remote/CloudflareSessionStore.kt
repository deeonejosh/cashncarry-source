package com.example.data.remote

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

interface SessionStorage {
    fun getToken(): String?
    fun getSessionCookie(): String?
    fun getUserId(): String
    fun getEmail(): String
    fun getRole(): String
    fun getSellerStatus(): String
    fun isVerified(): Boolean
    fun isSuspended(): Boolean
    fun getDisplayName(): String
    fun getBio(): String
    fun getSelectedState(): String
    fun getStagingFlags(): StagingFeatureFlags
    fun saveSession(
        token: String?,
        sessionCookie: String?,
        userId: String,
        email: String,
        role: String,
        sellerStatus: String = "none",
        verified: Boolean = true,
        suspended: Boolean = false
    )
    fun saveProfileMetadata(displayName: String, bio: String, selectedState: String)
    fun saveStagingFlags(flags: StagingFeatureFlags)
    fun clearSession()
}

private object ProtectedSecretCipher {
    private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
    private const val KEY_ALIAS = "cnc_api_session_aes_key"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val PREFIX_ENC = "enc_v1:"

    private fun getOrCreateKey(): SecretKey? {
        return runCatching {
            val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
            val existing = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
            if (existing != null) return@runCatching existing

            val keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
            val spec = KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
            keyGen.init(spec)
            keyGen.generateKey()
        }.getOrNull()
    }

    fun protect(plain: String): String {
        if (plain.isEmpty()) return ""
        val key = getOrCreateKey()
        if (key != null) {
            val encrypted = runCatching {
                val cipher = Cipher.getInstance(TRANSFORMATION)
                cipher.init(Cipher.ENCRYPT_MODE, key)
                val iv = cipher.iv
                val ct = cipher.doFinal(plain.toByteArray(StandardCharsets.UTF_8))
                val combined = ByteArray(1 + iv.size + ct.size)
                combined[0] = iv.size.toByte()
                System.arraycopy(iv, 0, combined, 1, iv.size)
                System.arraycopy(ct, 0, combined, 1 + iv.size, ct.size)
                PREFIX_ENC + Base64.encodeToString(combined, Base64.NO_WRAP)
            }.getOrNull()
            if (encrypted != null) return encrypted
        }
        // Never downgrade session credentials to recoverable Base64/plaintext.
        throw IllegalStateException("Android Keystore unavailable: refusing to store session credentials")
    }

    fun unprotect(stored: String?): String? {
        if (stored.isNullOrBlank()) return null
        if (stored.startsWith(PREFIX_ENC)) {
            val key = getOrCreateKey() ?: return null
            return runCatching {
                val raw = Base64.decode(stored.removePrefix(PREFIX_ENC), Base64.NO_WRAP)
                val ivLen = raw[0].toInt() and 0xFF
                val iv = raw.copyOfRange(1, 1 + ivLen)
                val ct = raw.copyOfRange(1 + ivLen, raw.size)
                val cipher = Cipher.getInstance(TRANSFORMATION)
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
                String(cipher.doFinal(ct), StandardCharsets.UTF_8)
            }.getOrNull()
        }
        return null
    }
}

class SharedPreferencesSessionStorage(context: Context) : SessionStorage {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override fun getToken(): String? =
        ProtectedSecretCipher.unprotect(prefs.getString(KEY_TOKEN, null))?.takeIf { it.isNotBlank() }

    override fun getSessionCookie(): String? =
        ProtectedSecretCipher.unprotect(prefs.getString(KEY_SESSION_COOKIE, null))?.takeIf { it.isNotBlank() }

    override fun getUserId(): String = prefs.getString(KEY_USER_ID, "").orEmpty()

    override fun getEmail(): String = prefs.getString(KEY_EMAIL, "").orEmpty()

    override fun getRole(): String = prefs.getString(KEY_ROLE, "buyer").orEmpty()

    override fun getSellerStatus(): String = prefs.getString(KEY_SELLER_STATUS, "none").orEmpty()

    override fun isVerified(): Boolean = prefs.getBoolean(KEY_VERIFIED, false)

    override fun isSuspended(): Boolean = prefs.getBoolean(KEY_SUSPENDED, false)

    override fun getDisplayName(): String = prefs.getString(KEY_DISPLAY_NAME, "").orEmpty()

    override fun getBio(): String = prefs.getString(KEY_BIO, "").orEmpty()

    override fun getSelectedState(): String = prefs.getString(KEY_STATE, "Lagos").orEmpty()

    override fun getStagingFlags(): StagingFeatureFlags {
        return StagingFeatureFlags(
            paymentsEnabled = prefs.getBoolean(KEY_PAYMENTS, false),
            coinsPurchasesEnabled = prefs.getBoolean(KEY_COINS, false),
            kycUploadsEnabled = prefs.getBoolean(KEY_KYC, false),
            orderReservationsEnabled = prefs.getBoolean(KEY_RESERVATIONS, true),
            liveStreamingConfigured = prefs.getBoolean(KEY_LIVE_CONFIGURED, false),
            videoUploadsEnabled = prefs.getBoolean(KEY_VIDEO_UPLOADS, true),
            streamConfigured = prefs.getBoolean(KEY_STREAM, false),
            r2Configured = prefs.getBoolean(KEY_R2, false)
        )
    }

    override fun saveSession(
        token: String?,
        sessionCookie: String?,
        userId: String,
        email: String,
        role: String,
        sellerStatus: String,
        verified: Boolean,
        suspended: Boolean
    ) {
        // Admin accounts are strictly prohibited from persisting mobile sessions
        if (role.equals("admin", ignoreCase = true)) return
        val encryptedToken = token?.takeIf { it.isNotBlank() }?.let(ProtectedSecretCipher::protect)
        val encryptedCookie = sessionCookie?.takeIf { it.isNotBlank() }?.let(ProtectedSecretCipher::protect)
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_SESSION_COOKIE)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_EMAIL, email)
            .putString(KEY_ROLE, role)
            .putString(KEY_SELLER_STATUS, sellerStatus)
            .putBoolean(KEY_VERIFIED, verified)
            .putBoolean(KEY_SUSPENDED, suspended)
            .apply {
                if (encryptedToken != null) putString(KEY_TOKEN, encryptedToken)
                if (encryptedCookie != null) putString(KEY_SESSION_COOKIE, encryptedCookie)
            }
            .apply()
    }

    override fun saveProfileMetadata(displayName: String, bio: String, selectedState: String) {
        prefs.edit()
            .putString(KEY_DISPLAY_NAME, displayName)
            .putString(KEY_BIO, bio)
            .putString(KEY_STATE, selectedState)
            .apply()
    }

    override fun saveStagingFlags(flags: StagingFeatureFlags) {
        prefs.edit()
            .putBoolean(KEY_PAYMENTS, flags.paymentsEnabled)
            .putBoolean(KEY_COINS, flags.coinsPurchasesEnabled)
            .putBoolean(KEY_KYC, flags.kycUploadsEnabled)
            .putBoolean(KEY_RESERVATIONS, flags.orderReservationsEnabled)
            .putBoolean(KEY_LIVE_CONFIGURED, flags.liveStreamingConfigured)
            .putBoolean(KEY_VIDEO_UPLOADS, flags.videoUploadsEnabled)
            .putBoolean(KEY_STREAM, flags.streamConfigured)
            .putBoolean(KEY_R2, flags.r2Configured)
            .apply()
    }

    override fun clearSession() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_SESSION_COOKIE)
            .remove(KEY_USER_ID)
            .remove(KEY_EMAIL)
            .remove(KEY_ROLE)
            .remove(KEY_SELLER_STATUS)
            .remove(KEY_VERIFIED)
            .remove(KEY_SUSPENDED)
            .remove(KEY_DISPLAY_NAME)
            .remove(KEY_BIO)
            .apply()
    }

    private companion object {
        const val PREFS_NAME = "cnc_api_session_prefs"
        const val KEY_TOKEN = "bearer_token"
        const val KEY_SESSION_COOKIE = "host_cnc_session_cookie"
        const val KEY_USER_ID = "user_id"
        const val KEY_EMAIL = "email"
        const val KEY_ROLE = "role"
        const val KEY_SELLER_STATUS = "seller_status"
        const val KEY_VERIFIED = "verified"
        const val KEY_SUSPENDED = "suspended"
        const val KEY_DISPLAY_NAME = "display_name"
        const val KEY_BIO = "bio"
        const val KEY_STATE = "selected_state"
        const val KEY_PAYMENTS = "flag_payments_enabled"
        const val KEY_COINS = "flag_coins_enabled"
        const val KEY_KYC = "flag_kyc_enabled"
        const val KEY_RESERVATIONS = "flag_order_reservations"
        const val KEY_LIVE_CONFIGURED = "flag_live_configured"
        const val KEY_VIDEO_UPLOADS = "flag_video_uploads"
        const val KEY_STREAM = "flag_stream_configured"
        const val KEY_R2 = "flag_r2_configured"
    }
}

class InMemorySessionStorage : SessionStorage {
    private var token: String? = null
    private var sessionCookie: String? = null
    private var userId: String = ""
    private var email: String = ""
    private var role: String = "buyer"
    private var sellerStatus: String = "none"
    private var verified: Boolean = false
    private var suspended: Boolean = false
    private var displayName: String = ""
    private var bio: String = ""
    private var selectedState: String = "Lagos"
    private var flags: StagingFeatureFlags = StagingFeatureFlags()

    override fun getToken(): String? = token
    override fun getSessionCookie(): String? = sessionCookie
    override fun getUserId(): String = userId
    override fun getEmail(): String = email
    override fun getRole(): String = role
    override fun getSellerStatus(): String = sellerStatus
    override fun isVerified(): Boolean = verified
    override fun isSuspended(): Boolean = suspended
    override fun getDisplayName(): String = displayName
    override fun getBio(): String = bio
    override fun getSelectedState(): String = selectedState
    override fun getStagingFlags(): StagingFeatureFlags = flags

    override fun saveSession(
        token: String?,
        sessionCookie: String?,
        userId: String,
        email: String,
        role: String,
        sellerStatus: String,
        verified: Boolean,
        suspended: Boolean
    ) {
        if (role.equals("admin", ignoreCase = true)) return
        if (!token.isNullOrBlank()) this.token = token
        if (!sessionCookie.isNullOrBlank()) this.sessionCookie = sessionCookie
        this.userId = userId
        this.email = email
        this.role = role
        this.sellerStatus = sellerStatus
        this.verified = verified
        this.suspended = suspended
    }

    override fun saveProfileMetadata(displayName: String, bio: String, selectedState: String) {
        this.displayName = displayName
        this.bio = bio
        this.selectedState = selectedState
    }

    override fun saveStagingFlags(flags: StagingFeatureFlags) {
        this.flags = flags
    }

    override fun clearSession() {
        token = null
        sessionCookie = null
        userId = ""
        email = ""
        role = "buyer"
        sellerStatus = "none"
        verified = false
        suspended = false
        displayName = ""
        bio = ""
    }
}
