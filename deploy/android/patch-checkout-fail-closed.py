from pathlib import Path
p = Path("android/app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt")
s = p.read_text()
anchor = '''    suspend fun checkoutCart(
        requestId: String,
        addressId: String
    ): CloudflareResult<String> = withContext(Dispatchers.IO) {
        val payload = JSONObject()'''
replacement = '''    suspend fun checkoutCart(
        requestId: String,
        addressId: String
    ): CloudflareResult<String> = withContext(Dispatchers.IO) {
        if (!storage.getStagingFlags().paymentsEnabled) {
            return@withContext CloudflareResult.Failure(
                statusCode = 503,
                code = "PAYMENTS_DISABLED",
                message = "Checkout is unavailable while staging payments are disabled"
            )
        }
        val payload = JSONObject()'''
assert anchor in s, "Checkout guard anchor missing"
s = s.replace(anchor, replacement, 1)
p.write_text(s)
print("Checkout now fails closed without sending a request when payments are disabled")
