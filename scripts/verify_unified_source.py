#!/usr/bin/env python3
"""Source-only contract checks for an offline handoff. Not a build or E2E test."""
from pathlib import Path
import sys
r=Path(__file__).resolve().parents[1]
files=['app/build.gradle.kts','app/src/main/java/com/example/data/remote/CloudflareApiModels.kt',
       'app/src/main/java/com/example/data/remote/CloudflareSyncRepository.kt',
       'web/wrangler.jsonc','web/package.json','web/src/App.tsx',
       'CLAUDE_MASTER_PROMPT.md','web/deploy/chatgpt-sites/migrations/0017_unified_mobile_sync.sql']
for path in files:
    assert (r/path).is_file(), path
android=(r/files[1]).read_text()
repo=(r/files[2]).read_text()
gradle=(r/files[0]).read_text()
web=(r/files[3]).read_text()
assert 'cashncarry-mobile-staging-api' in android
assert 'cashncarryng.com/api' not in android
assert 'sessionCookieOverride' in repo and '"/api/auth/me"' in repo
assert '.header("Origin", normalizedBase)' in repo
assert 'applicationIdSuffix = ".staging"' in gradle
assert web.count('"PAYMENTS_ENABLED": "false"')>=2
assert web.count('"COINS_PURCHASES_ENABLED": "false"')>=2
assert '"FLW_MODE": "live"' not in web
assert (r/'web/public/robots.txt').read_text().strip()=='User-agent: *\nDisallow: /'
assert not list(r.rglob('*.keystore'))
assert not list(r.rglob('*.jks'))
assert not list(r.rglob('*.ttf'))
assert not list(r.rglob('*.otf'))
print('Unified offline source contract checks passed; full CI build/E2E still required')
