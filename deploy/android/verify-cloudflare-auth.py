#!/usr/bin/env python3
"""Non-destructive Cash N Carry staging auth contract probe.
Does not create users, send passwords, or modify production data.
"""
import json
import urllib.error
import urllib.request

BASE = "https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev"
checks = [
    ("GET", "/api/health"),
    ("GET", "/api/v1/profile"),
    ("OPTIONS", "/api/auth/login"),
    ("OPTIONS", "/api/auth/register"),
    ("OPTIONS", "/api/auth/google"),
    ("OPTIONS", "/api/auth/logout"),
]
for method, path in checks:
    req = urllib.request.Request(BASE + path, method=method,
        headers={"User-Agent": "CashNCarry-Staging-Auth-Contract-Check/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            code = res.status
            body = res.read(1024).decode("utf-8", "replace") if method == "GET" else ""
    except urllib.error.HTTPError as exc:
        code = exc.code
        body = exc.read(1024).decode("utf-8", "replace") if method == "GET" else ""
    except Exception as exc:
        print(json.dumps({"method":method,"path":path,"error":str(exc)}))
        continue
    print(json.dumps({"method":method,"path":path,"http_status":code,
        "allow":res.headers.get("Allow","") if 200<=code<400 else "",
        "health_ok":('"ok":true' in body.replace(" ","")) if path=="/api/health" else None}))
