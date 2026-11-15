#!/usr/bin/env python3
"""Align native staging Android requests with the Worker same-origin POST policy.

Only modifies the extracted staging build. No Worker security rules are relaxed.
"""
from pathlib import Path

repo = Path("integrated/app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt")
model = Path("integrated/app/src/main/java/com/example/data/remote/CloudflareApiModels.kt")
test = Path("integrated/app/src/test/java/com/example/data/remote/CloudflareSyncRepositoryTest.kt")
assert all(x.exists() for x in (repo, model, test)), "Missing expected Android source"
base = 'https://cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev'
assert base in model.read_text(), "API must already point to the verified staging Worker"

s = repo.read_text()
anchor = '''            .url("$normalizedBase$path")
            .header(CloudflareEndpoints.CLIENT_TYPE_HEADER, CloudflareEndpoints.CLIENT_TYPE_MOBILE)
            .header("Accept", "application/json")'''
replacement = '''            .url("$normalizedBase$path")
            // Worker requires an exact Origin for all auth POSTs, including native clients.
            // This reflects the same HTTPS staging API host; do not weaken Worker CSRF checks.
            .header("Origin", normalizedBase)
            .header(CloudflareEndpoints.CLIENT_TYPE_HEADER, CloudflareEndpoints.CLIENT_TYPE_MOBILE)
            .header("Accept", "application/json")'''
if anchor in s:
    s = s.replace(anchor, replacement, 1)
elif replacement not in s:
    raise AssertionError("Expected OkHttp request builder not found")
assert s.count('.header("Origin", normalizedBase)') == 1
repo.write_text(s)

t = test.read_text()
old_field = '''        val clientType: String?,
        val authorization: String?,'''
new_field = '''        val clientType: String?,
        val origin: String?,
        val authorization: String?,'''
if old_field in t:
    t = t.replace(old_field, new_field, 1)
elif new_field not in t:
    raise AssertionError("Expected RecordedCall fields missing")
# Add header to RecordedCall constructor using argument context, fail closed if source layout changed.
start = t.find("RecordedCall(")
calls = t.find("RecordedCall(", start+1)
assert calls > start, "Recording constructor not found"
fragment = t[calls:calls+1000]
if 'origin = exchange.requestHeaders.getFirst("Origin")' not in fragment:
    k = 'clientType = exchange.requestHeaders.getFirst("X-Client-Type"),'
    assert k in fragment, "Expected test HTTP record field missing"
    t = t.replace(k, k+'\n            origin = exchange.requestHeaders.getFirst("Origin"),', 1)
line = '''        assertEquals("mobile", loginCall.clientType)'''
assert line in t, "Expected login request test missing"
if 'assertEquals(baseUrl, loginCall.origin)' not in t:
    t = t.replace(line, line+'\n        assertEquals(baseUrl, loginCall.origin)', 1)
line = '''        assertEquals("newbuyer@example.ng", JSONObject(regCall.body).getString("email"))'''
assert line in t, "Expected registration request test missing"
if 'assertEquals(baseUrl, regCall.origin)' not in t:
    t = t.replace(line, line+'\n        assertEquals(baseUrl, regCall.origin)', 1)
test.write_text(t)
print("Android staging OkHttp Origin and MockWebServer regression assertions patched")
