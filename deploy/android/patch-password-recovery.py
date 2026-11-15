from pathlib import Path
p = Path("android/app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt")
s = p.read_text()
anchor = "    suspend fun signOut(): Unit = withContext(Dispatchers.IO) {"
assert anchor in s, "Cloudflare repository logout anchor missing"
addition = '''    /**
     * Request a one-time password-reset email. The Worker should return a generic
     * acknowledgement whether or not the address exists to prevent enumeration.
     */
    suspend fun requestPasswordReset(email: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val normalized = email.trim().lowercase()
        if (!normalized.contains("@") || normalized.length > 254) {
            return@withContext CloudflareResult.Failure(400, "INVALID_EMAIL", "Enter a valid email address")
        }
        val payload = JSONObject().put("email", normalized).toString()
        when (val result = executeJson("POST", "/api/auth/request-reset", payload)) {
            is CloudflareResult.Success -> CloudflareResult.Success(true)
            is CloudflareResult.Failure -> result
        }
    }

    /** Complete reset using the one-time token received by email. */
    suspend fun resetPassword(token: String, newPassword: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        if (token.isBlank() || newPassword.length < 12) {
            return@withContext CloudflareResult.Failure(400, "INVALID_RESET", "A valid reset token and 12-character password are required")
        }
        val payload = JSONObject().put("token", token.trim()).put("password", newPassword).toString()
        when (val result = executeJson("POST", "/api/auth/reset", payload)) {
            is CloudflareResult.Success -> CloudflareResult.Success(true)
            is CloudflareResult.Failure -> result
        }
    }

'''
s = s.replace(anchor, addition + anchor, 1)
p.write_text(s)
print("Added Cloudflare password-reset request and completion methods")
