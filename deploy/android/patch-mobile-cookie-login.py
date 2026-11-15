#!/usr/bin/env python3
"""Validate cookie-only Worker login via /api/auth/me before storing the session.

Staging Android extraction only. Does not modify Cloudflare or production.
"""
from pathlib import Path

repo = Path('integrated/app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt')
test = Path('integrated/app/src/test/java/com/example/data/remote/CloudflareSyncRepositoryTest.kt')
assert repo.is_file() and test.is_file(), 'Staging source/test missing'
s = repo.read_text(encoding='utf-8')
old = '''                val userObj = obj.optJSONObject("user") ?: JSONObject()
                val userId = userObj.optString("id", "")
                val userEmail = userObj.optString("email", cleanEmail).ifBlank { cleanEmail }
                val role = userObj.optString("role", "buyer").lowercase()

                if (!signedIn || role !in setOf("buyer", "seller") || userId.isBlank() || (token == null && cookieValue == null)) {'''
new = '''                // The Worker returns {"signedIn":true} plus an HttpOnly cookie.
                // Authenticate that cookie via /api/auth/me BEFORE persisting it.
                if (!signedIn || (token == null && cookieValue == null)) {
                    storage.clearSession()
                    return@withContext CloudflareResult.Failure(
                        401, "SESSION_MISSING", "Cloudflare login did not issue a session."
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
                                "Cloudflare could not validate the new session."
                            )
                        }
                        is CloudflareResult.Success ->
                            current.data.first.optJSONObject("user") ?: JSONObject()
                    }
                } else {
                    // Preserve bearer-token compatibility if the Worker includes a user.
                    obj.optJSONObject("user") ?: JSONObject()
                }
                val userId = userObj.optString("id", "")
                val userEmail = userObj.optString("email", cleanEmail).ifBlank { cleanEmail }
                val role = userObj.optString("role", "").lowercase()

                if (role !in setOf("buyer", "seller") || userId.isBlank() || userEmail != cleanEmail) {'''
assert s.count(old) == 1, 'Unexpected staging sign-in layout'
s = s.replace(old, new, 1)
old = '''    private fun executeJsonWithHeaders(
        method: String,
        path: String,
        jsonBody: String?
    ): CloudflareResult<Pair<JSONObject, List<String>>> {
        return try {
            val builder = newRequestBuilder(path)
            when (method) {'''
new = '''    private fun executeJsonWithHeaders(
        method: String,
        path: String,
        jsonBody: String?,
        sessionCookieOverride: String? = null
    ): CloudflareResult<Pair<JSONObject, List<String>>> {
        return try {
            val builder = newRequestBuilder(path)
            if (sessionCookieOverride != null) {
                // Never send any previously saved bearer token alongside a fresh cookie.
                require(tokenHexRegex.matches(sessionCookieOverride))
                builder.removeHeader("Authorization")
                builder.header("Cookie", "${CloudflareEndpoints.SESSION_COOKIE_NAME}=$sessionCookieOverride")
            }
            when (method) {'''
assert s.count(old) == 1, 'Expected JSON execution method not found'
s = s.replace(old, new, 1)
repo.write_text(s, encoding='utf-8')

t = test.read_text(encoding='utf-8')
old = '''                        """{"signedIn":true,"user":{"id":"cookie-buyer-1","email":"$email","role":"buyer"}}"""'''
new = '''                        """{"signedIn":true}"""'''
assert t.count(old) == 1, 'Expected cookie login mock response not found'
t = t.replace(old, new, 1)
old = '''        server.createContext("/api/auth/me") { exchange ->
            record(exchange)
            if (!authMeAuthorized) {'''
new = '''        server.createContext("/api/auth/me") { exchange ->
            record(exchange)
            val expectedCookie = "${CloudflareEndpoints.SESSION_COOKIE_NAME}=${"d".repeat(64)}"
            if (!authMeAuthorized || exchange.requestHeaders.getFirst("Cookie") != expectedCookie) {'''
assert t.count(old) == 1, 'Expected /me mock handler missing'
t = t.replace(old, new, 1)
old = '''        val loginRes = repository.signInWithPassword("cookiebuyer@cashncarryng.com", "StrongBuyerPass#2026")
        assertTrue(loginRes is CloudflareResult.Success)'''
new = '''        val loginRes = repository.signInWithPassword("cookiebuyer@cashncarryng.com", "StrongBuyerPass#2026")
        // The real Worker does not include the user in the login response.
        val firstMe = recordedRequests.first { it.path == "/api/auth/me" }
        assertEquals("${CloudflareEndpoints.SESSION_COOKIE_NAME}=${"d".repeat(64)}", firstMe.cookie)
        assertNull(firstMe.authorization)
        assertTrue(loginRes is CloudflareResult.Success)'''
assert t.count(old) == 1, 'Expected cookie login test body missing'
t = t.replace(old, new, 1)
marker = '''    @Test
    fun signInWithPassword_storesMobileBearerTokenAndRejectsAdminRole() = runBlocking {'''
insert = '''    @Test
    fun signInWithPassword_cookieLoginWithoutVerifiedMe_failsClosedAndDoesNotSaveCredential() = runBlocking {
        authMeAuthorized = false
        val result = repository.signInWithPassword("cookiebuyer@cashncarryng.com", "StrongBuyerPass#2026")
        assertTrue(result is CloudflareResult.Failure)
        assertEquals("SESSION_INVALID", (result as CloudflareResult.Failure).code)
        assertNull(storage.getSessionCookie())
        assertNull(storage.getToken())
        assertFalse(repository.currentSessionSnapshot().signedIn)
    }

'''
assert t.count(marker) == 1, 'Test insertion point missing'
t = t.replace(marker, insert + marker, 1)
test.write_text(t, encoding='utf-8')
print('Applied Cloudflare cookie-only login fix and two regression paths')
