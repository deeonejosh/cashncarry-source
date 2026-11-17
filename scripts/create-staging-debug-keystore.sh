#!/usr/bin/env bash
# Local, disposable staging-only signing key; never use for production signing.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -e debug.keystore ]; then
  echo 'Staging debug keystore already exists. Refusing to replace it.' >&2
  exit 0
fi
keytool -genkeypair -noprompt -keystore debug.keystore \
  -storepass android -alias androiddebugkey -keypass android \
  -keyalg RSA -keysize 3072 \
  -dname 'CN=Cash N Carry Staging,OU=Android Testing,O=Cash N Carry,C=NG' -validity 3650
chmod 600 debug.keystore
echo 'Created disposable debug.keystore (not included in source ZIP).'
