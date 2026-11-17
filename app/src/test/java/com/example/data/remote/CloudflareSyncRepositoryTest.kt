package com.example.data.remote

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class CloudflareSyncRepositoryTest {
    private lateinit var server: HttpServer
    private lateinit var baseUrl: String
    private lateinit var storage: SessionStorage
    private lateinit var repository: CloudflareSyncRepository

    private val recordedRequests = mutableListOf<RecordedCall>()
    private val usedResetTokens = mutableSetOf<String>()
    private var authMeAuthorized = true

    data class RecordedCall(
        val method: String,
        val path: String,
        val clientType: String?,
        val origin: String?,
        val authorization: String?,
        val cookie: String?,
        val body: String
    )

    @Before
    fun setUp() {
        recordedRequests.clear()
        usedResetTokens.clear()
        authMeAuthorized = true

        val context = ApplicationProvider.getApplicationContext<Context>()
        storage = InMemorySessionStorage().apply { clearSession() }
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        baseUrl = "http://127.0.0.1:${server.address.port}"

        server.createContext("/api/v1/wishlist") { exchange ->
            record(exchange)
            val html = "<!doctype html><html><body>SPA fallback</body></html>"
            val bytes = html.toByteArray(StandardCharsets.UTF_8)
            exchange.responseHeaders.set("Content-Type", "text/html")
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }

        server.createContext("/api/cart") { exchange ->
            record(exchange)
            respond(exchange, 200, """{"items":[{"product":"p1","quantity":2,"source":"legacy","details":{"name":"Studio Wireless Headphones","price":18500,"stock":12}}]}""")
        }
        server.createContext("/api/products") { exchange ->
            record(exchange)
            respond(exchange, 200, """{"products":[{"id":"p1","store":"obimart","name":"Studio Wireless Headphones","description":"Test description","category":"Electronics","price":18500,"stock":12,"image":"https://example.invalid/product.jpg"},{"id":"p-bad","store":"obimart","name":"No price product"}]}""")
        }
        server.createContext("/api/storefronts") { exchange ->
            record(exchange)
            respond(exchange, 200, """{"storefronts":[{"id":"obimart","name":"Obi Mart","description":"Nigerian tech","location":"Lagos","verified":1}]}""")
        }
        server.createContext("/api/health") { exchange ->
            record(exchange)
            respond(
                exchange,
                200,
                """{"ok":true,"service":"cashncarry-d1-staging-worker","environment":"staging","dbConnected":true,"authDbConnected":true,"staging":{"paymentsEnabled":false,"coinsPurchasesEnabled":false,"kycUploadsEnabled":false,"orderReservationsEnabled":true}}"""
            )
        }

        server.createContext("/api/auth/register") { exchange ->
            val body = record(exchange)
            val json = JSONObject(body)
            val email = json.optString("email")
            if (email.isBlank() || !email.contains("@")) {
                respond(exchange, 400, """{"error":"Valid email required","code":"INVALID_EMAIL"}""")
            } else {
                respond(exchange, 200, """{"registered":true}""")
            }
        }

        server.createContext("/api/auth/verify") { exchange ->
            val body = record(exchange)
            val json = JSONObject(body)
            val token = json.optString("token")
            val password = json.optString("password")
            val role = json.optString("role")
            when {
                token == "e".repeat(64) -> respond(exchange, 400, """{"error":"Verification token expired","code":"TOKEN_EXPIRED"}""")
                password.length < 12 -> respond(exchange, 400, """{"error":"Password too short","code":"WEAK_PASSWORD"}""")
                role == "admin" -> respond(exchange, 403, """{"error":"Forbidden role","code":"FORBIDDEN_ROLE"}""")
                else -> respond(exchange, 200, """{"completed":true}""")
            }
        }

        server.createContext("/api/auth/login") { exchange ->
            val body = record(exchange)
            val json = JSONObject(body)
            val email = json.optString("email")
            when (email) {
                "admin@cashncarryng.com" -> respond(
                    exchange,
                    200,
                    """{"signedIn":true,"token":"${"a".repeat(64)}","user":{"id":"admin-1","email":"admin@cashncarryng.com","role":"admin"}}"""
                )
                "cookiebuyer@cashncarryng.com" -> {
                    val cookieVal = "d".repeat(64)
                    exchange.responseHeaders.add(
                        "Set-Cookie",
                        "${CloudflareEndpoints.SESSION_COOKIE_NAME}=$cookieVal; Path=/; HttpOnly; Secure; SameSite=Lax"
                    )
                    respond(
                        exchange,
                        200,
                        """{"signedIn":true}"""
                    )
                }
                else -> respond(
                    exchange,
                    200,
                    """{"signedIn":true,"token":"${"b".repeat(64)}","user":{"id":"buyer-1","email":"$email","role":"buyer"}}"""
                )
            }
        }

        server.createContext("/api/auth/me") { exchange ->
            record(exchange)
            val expectedCookie = "${CloudflareEndpoints.SESSION_COOKIE_NAME}=${"d".repeat(64)}"
            if (!authMeAuthorized || exchange.requestHeaders.getFirst("Cookie") != expectedCookie) {
                respond(exchange, 401, """{"authenticated":false,"error":"Session revoked","code":"UNAUTHORIZED"}""")
            } else {
                respond(
                    exchange,
                    200,
                    """{"user":{"id":"cookie-buyer-1","email":"cookiebuyer@cashncarryng.com","role":"buyer"}}"""
                )
            }
        }

        server.createContext("/api/auth/request-reset") { exchange ->
            record(exchange)
            respond(exchange, 200, """{"sent":true}""")
        }

        server.createContext("/api/auth/reset") { exchange ->
            val body = record(exchange)
            val json = JSONObject(body)
            val token = json.optString("token")
            if (token == "f".repeat(64) || usedResetTokens.contains(token)) {
                respond(exchange, 400, """{"error":"Reset token invalid or already used","code":"TOKEN_INVALID"}""")
            } else {
                usedResetTokens.add(token)
                respond(exchange, 200, """{"completed":true}""")
            }
        }

        server.createContext("/api/v1/profile") { exchange ->
            record(exchange)
            if (exchange.requestMethod == "GET") {
                respond(exchange, 200, """{"profile":{"user_id":"buyer-1","display_name":"Chidi Lagos","bio":"Market VIP","selected_state":"Abuja (FCT)"}}""")
            } else {
                respond(exchange, 200, """{"updated":true}""")
            }
        }

        server.createContext("/api/checkout") { exchange ->
            record(exchange)
            respond(exchange, 201, """{"order":{"id":"CNC-2026-8841","status":"awaiting_payment"}}""")
        }

        server.createContext("/api/payments/initialize") { exchange ->
            record(exchange)
            respond(exchange, 503, """{"error":"Payments temporarily unavailable","code":"PAYMENTS_DISABLED"}""")
        }

        server.createContext("/api/auth/logout") { exchange ->
            record(exchange)
            respond(exchange, 200, """{"signedOut":true}""")
        }

        server.start()
        repository = CloudflareSyncRepository(storage = storage, baseUrl = baseUrl)
    }

    @After
    fun tearDown() {
        server.stop(0)
    }

    @Test
    fun cartRestore_readsD1ItemsWithRealNamesAndPrices() = runBlocking {
        val result = repository.fetchCart()
        assertTrue(result is CloudflareResult.Success)
        val items = (result as CloudflareResult.Success).data
        assertEquals(1, items.size)
        assertEquals("p1", items[0].productId)
        assertEquals("Studio Wireless Headphones", items[0].productTitle)
        assertEquals(18500L, items[0].unitPriceNaira)
        assertEquals(2L, items[0].quantity)
    }

    @Test
    fun catalog_readsRealWorkerFieldsAndNeverInventsMissingPrices() = runBlocking {
        val response = repository.fetchCatalogProducts()
        assertTrue(response is CloudflareResult.Success)
        val products = (response as CloudflareResult.Success).data
        assertEquals(1, products.size)
        assertEquals("p1", products[0].id)
        assertEquals("obimart", products[0].sellerId)
        assertEquals("Studio Wireless Headphones", products[0].title)
        assertEquals(18500L, products[0].priceNaira)
        assertEquals(12L, products[0].stockCount)
        assertEquals("https://example.invalid/product.jpg", products[0].imageKey)
        assertEquals(0L, products[0].reviewCount)
    }

    @Test
    fun storefronts_onlyShowRealWorkerResults() = runBlocking {
        val response = repository.fetchStorefronts()
        assertTrue(response is CloudflareResult.Success)
        val sellers = (response as CloudflareResult.Success).data
        assertEquals(1, sellers.size)
        assertEquals("Obi Mart", sellers[0].businessName)
        assertEquals("Lagos", sellers[0].stateLocation)
        assertTrue(sellers[0].verified)
        assertEquals(0.0, sellers[0].rating, 0.0)
    }

    @Test
    fun apiSuccessWithSpaHtml_isRejectedInsteadOfAccepted() = runBlocking {
        val result = repository.toggleWishlist("p-1")
        assertTrue(result is CloudflareResult.Failure)
        assertEquals("INVALID_RESPONSE", (result as CloudflareResult.Failure).code)
    }

    @Test
    fun checkoutCart_whenPaymentsDisabled_makesNoNetworkRequest() = runBlocking {
        val before = recordedRequests.size
        val result = repository.checkoutCart("staging-request", "staging-address")
        assertTrue(result is CloudflareResult.Failure)
        assertEquals("PAYMENTS_DISABLED", (result as CloudflareResult.Failure).code)
        assertEquals(before, recordedRequests.size)
    }

    @Test
    fun fetchHealth_persistsFailClosedStagingFlags() = runBlocking {
        val health = repository.fetchHealth()
        assertTrue(health.ok)
        assertEquals("cashncarry-d1-staging-worker", health.service)
        assertFalse(health.staging.paymentsEnabled)
        assertFalse(health.staging.coinsPurchasesEnabled)
        assertFalse(health.staging.kycUploadsEnabled)
        assertFalse(storage.getStagingFlags().paymentsEnabled)
    }

    @Test
    fun twoStageRegistration_validatesEmailTokenAnd12CharPassword() = runBlocking {
        val badEmail = repository.registerAccount("not-an-email")
        assertTrue(badEmail is CloudflareResult.Failure)

        val regRes = repository.registerAccount("NewBuyer@Example.NG")
        assertTrue(regRes is CloudflareResult.Success)
        val regCall = recordedRequests.last { it.path == "/api/auth/register" }
        assertEquals("newbuyer@example.ng", JSONObject(regCall.body).getString("email"))
        assertEquals(baseUrl, regCall.origin)

        val shortPwd = repository.verifyEmailAndSetPassword("1".repeat(64), "short123", "buyer")
        assertTrue(shortPwd is CloudflareResult.Failure)
        assertEquals("INVALID_PASSWORD", (shortPwd as CloudflareResult.Failure).code)

        val badToken = repository.verifyEmailAndSetPassword("short-token", "ValidPassword#2026", "buyer")
        assertTrue(badToken is CloudflareResult.Failure)
        assertEquals("INVALID_TOKEN", (badToken as CloudflareResult.Failure).code)

        val verifyOk = repository.verifyEmailAndSetPassword("2".repeat(64), "ValidPassword#2026", "seller")
        assertTrue(verifyOk is CloudflareResult.Success)
        val verifyCall = recordedRequests.last { it.path == "/api/auth/verify" }
        assertEquals("buyer", JSONObject(verifyCall.body).getString("role"))

        // Attempting role="admin" from client must coerce safely to buyer and never allow admin
        val verifyAdminAttempt = repository.verifyEmailAndSetPassword("3".repeat(64), "ValidPassword#2026", "admin")
        assertTrue(verifyAdminAttempt is CloudflareResult.Success)
        val coercedCall = recordedRequests.last { it.path == "/api/auth/verify" }
        assertEquals("buyer", JSONObject(coercedCall.body).getString("role"))
    }

    @Test
    fun signInWithPassword_supportsCookieSessionAndRestoresViaAuthMe() = runBlocking {
        val loginRes = repository.signInWithPassword("cookiebuyer@cashncarryng.com", "StrongBuyerPass#2026")
        val firstMe = recordedRequests.first { it.path == "/api/auth/me" }
        assertEquals("${CloudflareEndpoints.SESSION_COOKIE_NAME}=${"d".repeat(64)}", firstMe.cookie)
        assertNull(firstMe.authorization)
        assertTrue(loginRes is CloudflareResult.Success)
        val snap = (loginRes as CloudflareResult.Success).data
        assertTrue(snap.signedIn)
        assertTrue(snap.hasCookieSession)
        assertFalse(snap.hasBearerToken)
        assertEquals("d".repeat(64), storage.getSessionCookie())
        assertNull(storage.getToken())

        val meResult = repository.restoreSession()
        assertTrue(meResult is CloudflareResult.Success)
        val meCall = recordedRequests.last { it.path == "/api/auth/me" }
        assertEquals("${CloudflareEndpoints.SESSION_COOKIE_NAME}=${"d".repeat(64)}", meCall.cookie)
        assertNull(meCall.authorization)

        // Revoked session (401) must wipe persisted credentials cleanly
        authMeAuthorized = false
        val revokedResult = repository.restoreSession()
        assertTrue(revokedResult is CloudflareResult.Failure)
        assertFalse(repository.currentSessionSnapshot().signedIn)
        assertNull(storage.getSessionCookie())
    }

    @Test
    fun signInWithPassword_cookieLoginWithoutVerifiedMe_failsClosedAndDoesNotSaveCredential() = runBlocking {
        authMeAuthorized = false
        val result = repository.signInWithPassword("cookiebuyer@cashncarryng.com", "StrongBuyerPass#2026")
        assertTrue(result is CloudflareResult.Failure)
        assertEquals("SESSION_INVALID", (result as CloudflareResult.Failure).code)
        assertNull(storage.getSessionCookie())
        assertNull(storage.getToken())
        assertFalse(repository.currentSessionSnapshot().signedIn)
    }

    @Test
    fun signInWithPassword_storesMobileBearerTokenAndRejectsAdminRole() = runBlocking {
        val buyerResult = repository.signInWithPassword("chidi@example.ng", "StagingPass#2026!")
        assertTrue(buyerResult is CloudflareResult.Success)
        val snapshot = (buyerResult as CloudflareResult.Success).data
        assertTrue(snapshot.signedIn)
        assertTrue(snapshot.hasBearerToken)
        assertEquals("b".repeat(64), storage.getToken())
        assertEquals("Abuja (FCT)", snapshot.selectedState)

        val loginCall = recordedRequests.first { it.path == "/api/auth/login" }
        assertEquals("mobile", loginCall.clientType)
        assertEquals(baseUrl, loginCall.origin)

        storage.clearSession()
        val adminResult = repository.signInWithPassword("admin@cashncarryng.com", "AdminPass#2026!")
        assertTrue(adminResult is CloudflareResult.Failure)
        assertNull(storage.getToken())
    }

    @Test
    fun passwordRecoveryFlow_requestsReset_resetsPassword_andRejectsReusedTokens() = runBlocking {
        storage.saveSession(token = "c".repeat(64), sessionCookie = null, userId = "buyer-2", email = "amina@example.ng", role = "buyer")

        val reqRes = repository.requestPasswordReset("amina@example.ng")
        assertTrue(reqRes is CloudflareResult.Success)

        val invalidToken = repository.resetPassword("bad", "NewStrongPassword#2026")
        assertTrue(invalidToken is CloudflareResult.Failure)

        val resetToken = "9".repeat(64)
        val resetOk = repository.resetPassword(resetToken, "NewStrongPassword#2026")
        assertTrue(resetOk is CloudflareResult.Success)
        // Resetting password must clear local session so user re-authenticates
        assertFalse(repository.currentSessionSnapshot().signedIn)
        assertNull(storage.getToken())

        // Reusing same token must fail
        val reuseRes = repository.resetPassword(resetToken, "AnotherStrongPassword#2026")
        assertTrue(reuseRes is CloudflareResult.Failure)
    }

    @Test
    fun signOut_callsLogoutEndpointAndClearsSession() = runBlocking {
        storage.saveSession(token = "c".repeat(64), sessionCookie = "d".repeat(64), userId = "buyer-2", email = "amina@example.ng", role = "buyer")
        assertTrue(repository.currentSessionSnapshot().signedIn)

        repository.signOut()

        assertFalse(repository.currentSessionSnapshot().signedIn)
        assertNull(storage.getToken())
        assertNull(storage.getSessionCookie())
        assertTrue(recordedRequests.any { it.path == "/api/auth/logout" && it.method == "POST" })
    }

    @Test
    fun updateProfile_sendsBearerTokenAndCheckoutFailsClosedInStaging() = runBlocking {
        storage.saveSession(token = "c".repeat(64), sessionCookie = null, userId = "buyer-2", email = "amina@example.ng", role = "buyer")

        val profResult = repository.updateProfile(
            displayName = "Amina Bello",
            bio = "Lagos luxury fashion buyer",
            avatarUrl = "https://cdn.example/a.png",
            selectedState = "Rivers"
        )
        assertTrue(profResult is CloudflareResult.Success)
        val profCall = recordedRequests.last { it.path == "/api/v1/profile" }
        assertEquals("Bearer ${"c".repeat(64)}", profCall.authorization)
        assertNull(profCall.cookie)
        assertEquals("mobile", profCall.clientType)
        assertEquals("Rivers", JSONObject(profCall.body).getString("selectedState"))

        val checkoutRes = repository.checkoutCart(requestId = "req-idem-001", addressId = "addr-1")
        assertTrue(checkoutRes is CloudflareResult.Failure)
        assertEquals("PAYMENTS_DISABLED", (checkoutRes as CloudflareResult.Failure).code)
        assertTrue(recordedRequests.none { it.path == "/api/checkout" })
    }

    @Test
    fun initializePayment_failsClosedWhenPaymentsDisabledInStaging() = runBlocking {
        repository.fetchHealth()
        val result = repository.initializePayment("CNC-2026-8841")
        assertTrue(result is CloudflareResult.Failure)
        val failure = result as CloudflareResult.Failure
        assertEquals(503, failure.statusCode)
        assertEquals("PAYMENTS_DISABLED", failure.code)
    }

    private fun record(exchange: HttpExchange): String {
        val body = exchange.requestBody.readBytes().toString(StandardCharsets.UTF_8)
        recordedRequests += RecordedCall(
            method = exchange.requestMethod,
            path = exchange.requestURI.path,
            clientType = exchange.requestHeaders.getFirst(CloudflareEndpoints.CLIENT_TYPE_HEADER),
            origin = exchange.requestHeaders.getFirst("Origin"),
            authorization = exchange.requestHeaders.getFirst("Authorization"),
            cookie = exchange.requestHeaders.getFirst("Cookie"),
            body = body
        )
        return body
    }

    private fun respond(exchange: HttpExchange, status: Int, jsonBody: String) {
        val bytes = jsonBody.toByteArray(StandardCharsets.UTF_8)
        exchange.responseHeaders.add("Content-Type", "application/json")
        exchange.sendResponseHeaders(status, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }
}
