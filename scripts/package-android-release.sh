#!/usr/bin/env bash
# Package an existing universal release build using the publisher's Android key.
set -euo pipefail
if [[ $# != 3 ]]; then
  echo 'Usage: scripts/package-android-release.sh vX.Y.Z BUILT_APK OUTPUT_DIRECTORY' >&2
  exit 2
fi
repo_root=$(cd "$(dirname "$0")/.." && pwd)
input_apk=$(realpath "$2")
mkdir -p "$3"
out_dir=$(realpath "$3")
cd "$repo_root"
tag=$1
: "${ANDROID_RELEASE_KEYSTORE:?Set to the private publisher PKCS12 file}"
: "${ANDROID_RELEASE_STORE_PASSWORD:?Set the publisher PKCS12 password}"
: "${ANDROID_RELEASE_CERT_SHA256:?Set the publisher certificate SHA-256 fingerprint}"
build_tools=${ANDROID_BUILD_TOOLS:-${ANDROID_HOME:-${ANDROID_SDK_ROOT:?Set ANDROID_HOME}}/build-tools/36.0.0}
signer="$build_tools/apksigner"
apk_name=Manage-Employees.apk
bridge=Manage-Employees-Migrate-Android9Plus.apk
python3 scripts/release/android_version.py "$tag"
tmp=$(mktemp -d "$out_dir/.publish.XXXXXXXX")
trap 'rm -rf -- "$tmp"' EXIT
"$build_tools/zipalign" -c -P 16 4 "$input_apk"
key=(--ks "$ANDROID_RELEASE_KEYSTORE" --ks-key-alias manage-employees --ks-pass env:ANDROID_RELEASE_STORE_PASSWORD)
"$signer" sign --v4-signing-enabled false --out "$tmp/$apk_name" "${key[@]}" "$input_apk"
"$signer" sign --min-sdk-version 28 --rotation-min-sdk-version 28 --lineage release/android/signing-lineage.bin \
  --v1-signing-enabled false --v2-signing-enabled false --v4-signing-enabled false \
  --out "$tmp/$bridge" "${key[@]}" "$input_apk"
verify_signer() {
  local file=$1 api=$2 cert
  cert=$("$signer" verify --min-sdk-version "$api" --max-sdk-version "$api" \
    --print-certs "$file" | sed -n 's/^Signer #[[:digit:]]* certificate SHA-256 digest: //p')
  if [[ $cert != "$ANDROID_RELEASE_CERT_SHA256" ]]; then
    echo "Unexpected APK signer on API $api: $(basename "$file")" >&2
    exit 1
  fi
}
"$signer" verify "$tmp/$apk_name"
"$signer" verify --min-sdk-version 28 "$tmp/$bridge"
for api in 24 28 35; do verify_signer "$tmp/$apk_name" "$api"; done
for api in 28 35; do verify_signer "$tmp/$bridge" "$api"; done
# Validate signature capabilities on the packaged artifact, after signing.
"$signer" lineage --in "$tmp/$bridge" --print-certs | \
  python3 scripts/release/verify_lineage.py "$ANDROID_RELEASE_CERT_SHA256"
for file in "$apk_name" "$bridge"; do "$build_tools/zipalign" -c -P 16 4 "$tmp/$file"; done
python3 scripts/release/android_version.py "$tag" --apk "$tmp/$apk_name" \
  --cert "$ANDROID_RELEASE_CERT_SHA256" --aapt "$build_tools/aapt"
for asset in "$apk_name" "$bridge" SHA256SUMS release.json; do
  mv -- "$tmp/$asset" "$out_dir/$asset"
done
