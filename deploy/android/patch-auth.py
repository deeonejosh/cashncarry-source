from pathlib import Path
p=Path("android/app/src/main/java/com/example/ui/auth/AuthComponents.kt")
s=p.read_text()
s=s.replace("import androidx.compose.material3.Text\n","import androidx.compose.material3.Text\nimport androidx.compose.material3.OutlinedTextField\n")
s=s.replace("import androidx.compose.ui.text.font.FontWeight\n","import androidx.compose.ui.text.font.FontWeight\nimport androidx.compose.ui.text.input.PasswordVisualTransformation\n")
s=s.replace('    var errorMessage by remember { mutableStateOf<String?>(null) }','    var errorMessage by remember { mutableStateOf<String?>(null) }\n    var email by remember { mutableStateOf("") }\n    var password by remember { mutableStateOf("") }')
anchor="                    Button(\n                        onClick = {\n                            isLoading = true\n"
assert anchor in s
insert='''                    if (authTab == 1) {
                        OutlinedTextField(value = email, onValueChange = { email = it },
                            label = { Text("Email address") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("register_email"))
                        OutlinedTextField(value = password, onValueChange = { password = it },
                            label = { Text("Password (at least 6 characters)") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().testTag("register_password"))
                        Button(onClick = {
                            if (!email.contains("@") || password.length < 6) {
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

'''
s=s.replace(anchor,insert+anchor,1)
s=s.replace('                                onAuthCancelled = {\n                                    isLoading = false\n                                }','                                onAuthCancelled = {\n                                    isLoading = false\n                                    errorMessage = "Google sign-in was cancelled. If no account picker appeared, check Google Play Services and signing configuration."\n                                }')
p.write_text(s)
print("Patched Android registration UI")
