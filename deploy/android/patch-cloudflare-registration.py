from pathlib import Path
p = Path("android/app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt")
s = p.read_text()
anchor = "    suspend fun signInWithPassword("
assert anchor in s, "Login method not found"
addition = '''    /**
     * Registration is a two-stage Worker flow: request verification email, then
     * submit the one-time verification token and a new password.
     * Do not treat an email-request acknowledgement as an authenticated session.
     */
    suspend fun requestRegistration(email: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        val normalized = email.trim().lowercase()
        if (!normalized.contains("@") || normalized.length > 254) {
            return@withContext CloudflareResult.Failure(400, "INVALID_EMAIL", "Enter a valid email address")
        }
        when (val result = executeJson("POST", "/api/auth/register", JSONObject().put("email", normalized).toString())) {
            is CloudflareResult.Success -> CloudflareResult.Success(true)
            is CloudflareResult.Failure -> result
        }
    }

    suspend fun verifyRegistration(token: String, password: String): CloudflareResult<Boolean> = withContext(Dispatchers.IO) {
        if (token.isBlank() || password.length < 12) {
            return@withContext CloudflareResult.Failure(400, "INVALID_VERIFICATION", "A verification token and 12-character password are required")
        }
        val body = JSONObject().put("token", token.trim()).put("password", password).toString()
        when (val result = executeJson("POST", "/api/auth/verify", body)) {
            is CloudflareResult.Success -> CloudflareResult.Success(true)
            is CloudflareResult.Failure -> result
        }
    }

'''
s = s.replace(anchor, addition + anchor, 1)
p.write_text(s)
print("Added two-stage Cloudflare registration and email verification methods")
