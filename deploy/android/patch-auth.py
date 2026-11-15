from pathlib import Path
p = Path("android/app/src/main/java/com/example/ui/auth/AuthComponents.kt")
s = p.read_text()
if "import androidx.compose.material3.OutlinedTextField" not in s:
    s = s.replace("import androidx.compose.material3.Text\n", "import androidx.compose.material3.Text\nimport androidx.compose.material3.OutlinedTextField\n")
if "import androidx.compose.ui.text.input.PasswordVisualTransformation" not in s:
    s = s.replace("import androidx.compose.ui.text.font.FontWeight\n", "import androidx.compose.ui.text.font.FontWeight\nimport androidx.compose.ui.text.input.PasswordVisualTransformation\n")
if 'var email by remember { mutableStateOf("") }' not in s:
    anchor = '    var errorMessage by remember { mutableStateOf<String?>(null) }'
    assert anchor in s, "Authentication state anchor missing"
    s = s.replace(anchor, anchor + '\n    var email by remember { mutableStateOf("") }\n    var password by remember { mutableStateOf("") }', 1)
marker = "                    // Native email/password registration is separate from Google OAuth."
if marker not in s:
    marker = "                    Button(\n                        onClick = {\n                            isLoading = true\n"
    assert marker in s, "Google button anchor missing"
    registration = """                    // Native email/password registration is separate from Google OAuth.
                    if (authTab == 1) {
                        OutlinedTextField(value = email, onValueChange = { email = it },
                            label = { Text("Email address") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("register_email"))
                        OutlinedTextField(value = password, onValueChange = { password = it },
                            label = { Text("Password (at least 6 characters)") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("register_password"))
                        Button(onClick = {
                            if (!email.trim().contains("@") || password.length < 6) {
                                errorMessage = "Enter a valid email and password of at least 6 characters."
                            } else {
                                isLoading = true
                                errorMessage = null
                                scope.launch {
                                    try {
                                        Firebase.auth.createUserWithEmailAndPassword(email.trim(), password).await()
                                        onAuthSuccess()
                                    } catch (e: Exception) {
                                        errorMessage = e.localizedMessage ?: "Registration failed."
                                        Log.e("Auth", "Email registration failed", e)
                                    } finally { isLoading = false }
                                }
                            }
                        }, enabled = !isLoading,
                            modifier = Modifier.fillMaxWidth().height(54.dp).testTag("register_submit")
                        ) { Text("Create Account with Email") }
                    }

"""
    s = s.replace(marker, registration + marker, 1)
if 'testTag("login_submit")' not in s:
    assert marker in s, "Email form anchor missing"
    login = """                    if (authTab == 0) {
                        OutlinedTextField(value = email, onValueChange = { email = it },
                            label = { Text("Email address") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("login_email"))
                        OutlinedTextField(value = password, onValueChange = { password = it },
                            label = { Text("Password") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("login_password"))
                        Button(onClick = {
                            if (!email.trim().contains("@") || password.isBlank()) {
                                errorMessage = "Enter your email and password."
                            } else {
                                isLoading = true
                                errorMessage = null
                                scope.launch {
                                    try {
                                        Firebase.auth.signInWithEmailAndPassword(email.trim(), password).await()
                                        onAuthSuccess()
                                    } catch (e: Exception) {
                                        errorMessage = e.localizedMessage ?: "Sign-in failed."
                                        Log.e("Auth", "Email sign-in failed", e)
                                    } finally { isLoading = false }
                                }
                            }
                        }, enabled = !isLoading,
                            modifier = Modifier.fillMaxWidth().height(54.dp).testTag("login_submit")
                        ) { Text("Sign In with Email") }
                    }

"""
    s = s.replace(marker, login + marker, 1)
p.write_text(s)
print("Verified email login and registration controls are present")

# Stamp a unique APK version so the installed build is distinguishable.
gradle = Path("android/app/build.gradle.kts")
g = gradle.read_text()
assert 'versionCode = 1' in g and 'versionName = "1.0"' in g, "Unexpected version configuration"
g = g.replace('versionCode = 1', 'versionCode = 2', 1).replace('versionName = "1.0"', 'versionName = "1.0.1"', 1)
gradle.write_text(g)
# Avoid silently swallowing Google auth cancellation in the UI.
assert 'onAuthCancelled = {' in s, "Google cancellation handler not found"
