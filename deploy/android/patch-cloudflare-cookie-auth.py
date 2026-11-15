from pathlib import Path
p = Path("android/app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt")
s = p.read_text()
assert 'val token = obj.optString("token", "")' in s, "Unexpected Cloudflare login code"
s = s.replace('    private val normalizedBase = baseUrl.trimEnd(\'/\')',
'''    private val normalizedBase = baseUrl.trimEnd('/')
    private var lastAuthCookie: String? = null''', 1)
s = s.replace('''                val token = obj.optString("token", "")
                val userObj = obj.optJSONObject("user") ?: JSONObject()
                val userId = userObj.optString("id", "")
                val userEmail = userObj.optString("email", email.trim())
                val role = userObj.optString("role", "buyer")

                if (!signedIn || token.length != 64 || role == "admin") {''',
'''                val cookie = lastAuthCookie.orEmpty()
                if (!signedIn || cookie.isBlank()) {
                    return@withContext CloudflareResult.Failure(401, "SESSION_MISSING", "Worker did not issue a session")
                }
                val account = executeJson("GET", "/api/auth/me", null)
                if (account !is CloudflareResult.Success) {
                    return@withContext CloudflareResult.Failure(401, "SESSION_INVALID", "Unable to validate Worker session")
                }
                val userObj = account.data.optJSONObject("user") ?: JSONObject()
                val userId = userObj.optString("id", "")
                val userEmail = userObj.optString("email", email.trim())
                val role = userObj.optString("role", "")

                if (!signedIn || userId.isBlank() || role !in setOf("buyer", "seller")) {''', 1)
s = s.replace('storage.saveSession(token, userId, userEmail, role)', 'storage.saveSession(cookie, userId, userEmail, role)', 1)
s = s.replace('''        storage.clearSession()
    }''', '''        storage.clearSession()
        lastAuthCookie = null
    }''', 1)
s = s.replace('''            .url("$normalizedBase$path")
            .header(CloudflareEndpoints.CLIENT_TYPE_HEADER, CloudflareEndpoints.CLIENT_TYPE_MOBILE)
        storage.getToken()?.let { token ->
            builder.header("Authorization", "Bearer $token")
        }''',
'''            .url("$normalizedBase$path")
            .header("Origin", normalizedBase)
            .header("Accept", "application/json")
            .header(CloudflareEndpoints.CLIENT_TYPE_HEADER, CloudflareEndpoints.CLIENT_TYPE_MOBILE)
        (lastAuthCookie ?: storage.getToken())?.let { cookie ->
            if (cookie.matches(Regex("^[A-Za-z0-9_-]{20,256}$"))) {
                builder.header("Cookie", "__Host-cnc_session=$cookie")
            }
        }''', 1)
s = s.replace('''                val obj = runCatching {
                    if (raw.isNotBlank()) JSONObject(raw) else JSONObject()
                }.getOrDefault(JSONObject())

                if (!res.isSuccessful) {''',
'''                val obj = runCatching { JSONObject(raw) }.getOrNull()
                if (obj == null || !res.header("Content-Type").orEmpty().contains("application/json", ignoreCase = true)) {
                    return CloudflareResult.Failure(res.code, "INVALID_API_RESPONSE", "Worker returned HTML or invalid JSON")
                }
                if (path == "/api/auth/login" && res.isSuccessful) {
                    val setCookie = res.headers.values("Set-Cookie").firstOrNull { it.startsWith("__Host-cnc_session=") }
                    lastAuthCookie = setCookie?.substringAfter("__Host-cnc_session=")?.substringBefore(';')?.takeIf { it.isNotBlank() }
                }
                if (!res.isSuccessful) {''', 1)
assert 'lastAuthCookie = setCookie?' in s, "Session cookie patch failed"
p.write_text(s)
print("Cloudflare auth client now supports Worker cookie sessions and rejects HTML fallbacks")
