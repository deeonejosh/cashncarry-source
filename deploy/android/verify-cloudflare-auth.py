#!/usr/bin/env python3
"""Read-only staging API contract checks. Never send credentials or create accounts."""
import json
import sys
import urllib.error
import urllib.request

BASE = "https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev"
checks = [("GET", "/api/health"), ("GET", "/api/v1/profile"),
          ("POST", "/api/auth/login"), ("POST", "/api/auth/register"),
          ("POST", "/api/auth/request-reset"), ("POST", "/api/auth/reset"),
          ("POST", "/api/auth/logout"), ("GET", "/api/auth/me")]
failed = False
for method, path in checks:
    req = urllib.request.Request(BASE + path, method=method,
        data=b"{}" if method == "POST" else None,
        headers={"Accept": "application/json", "Content-Type": "application/json",
                 "Origin": BASE, "User-Agent": "CashNCarry-Auth-Contract/2.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            status, ctype, body = res.status, res.headers.get("Content-Type", ""), res.read(4096)
    except urllib.error.HTTPError as exc:
        status, ctype, body = exc.code, exc.headers.get("Content-Type", ""), exc.read(4096)
    except Exception as exc:
        print(json.dumps({"path":path,"error":str(exc)}))
        failed = True
        continue
    try:
        parsed = json.loads(body)
        is_json = isinstance(parsed, dict)
    except (ValueError, UnicodeError):
        parsed, is_json = {}, False
    is_html = b"<html" in body.lower() or b"<!doctype html" in body.lower()
    valid = is_json and not is_html and "json" in ctype.lower()
    if path == "/api/health":
        staging = parsed.get("staging") or {}
        valid = (valid
                 and status == 200
                 and parsed.get("ok") is True
                 and parsed.get("authDbConnected") is True
                 and parsed.get("dbConnected") is True
                 and parsed.get("environment") == "staging"
                 and staging.get("paymentsEnabled") is False
                 and staging.get("coinsPurchasesEnabled") is False
                 and staging.get("kycUploadsEnabled") is False)
    if method == "POST":
        # An empty request must not successfully authenticate or create a user.
        valid = valid and status in (400, 401, 403, 405, 422)
    print(json.dumps({"method":method,"path":path,"status":status,
                      "content_type":ctype,"json_contract":is_json,
                      "valid":valid}))
    if not valid: failed = True
if failed:
    print("FAILED: staging endpoints did not establish a valid JSON authentication contract.")
    sys.exit(1)
