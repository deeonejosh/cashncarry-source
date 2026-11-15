#!/usr/bin/env python3
"""Apply two reviewed, fail-closed CI hotfixes to the Phase 1 ZIP extraction only.

The original committed ZIP is not modified by this script. Replace it with the
corrected ZIP for a reproducible source checkout; CI accepts either revision.
"""
from pathlib import Path

base = Path('integrated')
worker = base / 'web/deploy/chatgpt-sites/worker.ts'
android_test = base / 'app/src/test/java/com/example/data/remote/CloudflareSyncRepositoryTest.kt'
if not worker.is_file() or not android_test.is_file():
    raise SystemExit('Required integrated Phase 1 sources missing')

source = worker.read_text(encoding='utf-8')
old = "(route[1] === 'categories' && route[2]) || (route[1] === 'storefronts' && !route[2])"
new = "(route[1] === 'categories' && route[2])"
if source.count(old) == 1:
    source = source.replace(old, new, 1)
elif old in source or source.count(new) != 1:
    raise SystemExit('Unexpected storefront route source: refusing blind patch')
if "if (route[1] === 'storefronts' && !id)" not in source:
    raise SystemExit('Expected storefront list handler missing')
worker.write_text(source, encoding='utf-8')

source = android_test.read_text(encoding='utf-8')
old = 'storage.saveSession(token = "c".repeat(64), userId = "buyer-2", email = "amina@example.ng", role = "buyer")'
new = 'storage.saveSession(token = "c".repeat(64), sessionCookie = null, userId = "buyer-2", email = "amina@example.ng", role = "buyer")'
if source.count(old) == 2:
    source = source.replace(old, new)
elif old in source or source.count(new) != 2:
    raise SystemExit('Unexpected Android session test contract: refusing blind patch')
android_test.write_text(source, encoding='utf-8')
print('Reviewed storefront route and two session test fixtures verified')
