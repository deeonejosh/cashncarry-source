#!/usr/bin/env python3
"""Use the dedicated JSON-only staging API Worker for Android builds (never production)."""
from pathlib import Path

file = Path("integrated/app/src/main/java/com/example/data/remote/CloudflareApiModels.kt")
source = file.read_text(encoding="utf-8")
old = 'https://cashncarry-d1-staging-worker.cashncarry-workforce-2026.workers.dev'
new = 'https://cashncarry-mobile-staging-api.cashncarry-workforce-2026.workers.dev'
assert source.count(old) == 1, "Unexpected staging endpoint layout; abort rather than change an unrelated URL"
assert 'STAGING_BASE_URL' in source
assert 'cashncarryng.com/api' not in source, "Production API must not be configured for this build"
file.write_text(source.replace(old, new), encoding="utf-8")
assert new in file.read_text(encoding="utf-8")
print("Android API target now uses dedicated JSON-only Cloudflare staging Worker")
