package com.example.ui.auth

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import com.example.data.remote.CloudflareSyncRepository
import com.example.data.remote.InMemorySessionStorage
import com.example.ui.theme.CashNCarryTheme
import com.sun.net.httpserver.HttpServer
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class AuthComponentsTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var server: HttpServer
    private lateinit var syncRepo: CloudflareSyncRepository

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val storage = InMemorySessionStorage().apply { clearSession() }

        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/api/auth/register") { exchange ->
            reply(exchange, 200, """{"registered":true}""")
        }
        server.createContext("/api/auth/verify") { exchange ->
            reply(exchange, 200, """{"completed":true}""")
        }
        server.createContext("/api/auth/request-reset") { exchange ->
            reply(exchange, 200, """{"sent":true}""")
        }
        server.createContext("/api/auth/reset") { exchange ->
            reply(exchange, 200, """{"completed":true}""")
        }
        server.start()

        syncRepo = CloudflareSyncRepository(
            storage = storage,
            baseUrl = "http://127.0.0.1:${server.address.port}"
        )
    }

    @After
    fun tearDown() {
        server.stop(0)
    }

    @Test
    fun sessionLoadingScreen_displaysRestoringBanner() {
        composeRule.setContent {
            CashNCarryTheme {
                SessionLoadingScreen()
            }
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("session_loading_screen").assertIsDisplayed()
        composeRule.onNodeWithText("Restoring your Cash N Carry session...").assertIsDisplayed()
    }

    @Test
    fun authScreen_enforces12CharPasswordValidation() {
        composeRule.setContent {
            CashNCarryTheme {
                AuthScreen(cloudflareSyncRepo = syncRepo, onAuthSuccess = {})
            }
        }
        composeRule.waitForIdle()

        composeRule.onNodeWithTag("login_email_input").performTextInput("buyer@cashncarryng.com")
        composeRule.onNodeWithTag("login_password_input").performTextInput("short123")
        composeRule.onNodeWithTag("login_submit_button").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithTag("auth_error_banner").assertExists()
        composeRule.onNodeWithTag("auth_error_banner").performScrollTo()
        composeRule.onNodeWithTag("auth_error_banner").assertIsDisplayed()
    }

    @Test
    fun authScreen_navigatesTwoStageRegistrationAndFourStepRecovery() {
        composeRule.setContent {
            CashNCarryTheme {
                AuthScreen(cloudflareSyncRepo = syncRepo, onAuthSuccess = {})
            }
        }
        composeRule.waitForIdle()

        // Switch to Create Account tab -> Verify Email step
        composeRule.onNodeWithTag("auth_tab_create_account").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("already_have_verify_token_button").performScrollTo()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("already_have_verify_token_button").assertIsDisplayed()
        composeRule.onNodeWithTag("already_have_verify_token_button").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("verify_token_input").assertIsDisplayed()

        // Switch back to Login -> Forgot Password -> Enter Reset Token
        composeRule.onNodeWithTag("auth_tab_sign_in").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("forgot_password_link").performScrollTo()
        composeRule.onNodeWithTag("forgot_password_link").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("forgot_email_input").performScrollTo()
        composeRule.onNodeWithTag("forgot_email_input").performTextInput("buyer@cashncarryng.com")
        composeRule.onNodeWithTag("forgot_submit_button").performScrollTo()
        composeRule.onNodeWithTag("forgot_submit_button").performClick()
        composeRule.waitUntil(timeoutMillis = 3000) {
            runCatching {
                composeRule.onNodeWithTag("email_sent_confirmation_screen").assertIsDisplayed()
                true
            }.getOrDefault(false)
        }

        composeRule.onNodeWithTag("proceed_to_reset_password_button").performScrollTo()
        composeRule.onNodeWithTag("proceed_to_reset_password_button").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("reset_token_input").performScrollTo()
        composeRule.onNodeWithTag("reset_token_input").performTextInput("a".repeat(64))
        composeRule.onNodeWithTag("reset_new_password_input").performScrollTo()
        composeRule.onNodeWithTag("reset_new_password_input").performTextInput("NewStrongPassword#2026")
        composeRule.onNodeWithTag("reset_confirm_password_input").performScrollTo()
        composeRule.onNodeWithTag("reset_confirm_password_input").performTextInput("NewStrongPassword#2026")
        composeRule.onNodeWithTag("reset_submit_button").performScrollTo()
        composeRule.onNodeWithTag("reset_submit_button").performClick()
        composeRule.waitUntil(timeoutMillis = 3000) {
            runCatching {
                composeRule.onNodeWithTag("password_reset_success_screen").assertIsDisplayed()
                true
            }.getOrDefault(false)
        }
    }

    @Test
    fun logoutConfirmationDialog_invokesConfirmCallback() {
        var confirmed = false
        composeRule.setContent {
            CashNCarryTheme {
                LogoutConfirmationDialog(
                    onConfirmLogout = { confirmed = true },
                    onDismiss = {}
                )
            }
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("confirm_logout_button").performClick()
        assertTrue(confirmed)
    }

    private fun reply(exchange: com.sun.net.httpserver.HttpExchange, status: Int, body: String) {
        val bytes = body.toByteArray(StandardCharsets.UTF_8)
        exchange.responseHeaders.add("Content-Type", "application/json")
        exchange.sendResponseHeaders(status, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }
}
