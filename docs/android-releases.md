# Publishing an Android update

The Android app checks the latest stable release in `hizawye/manage-employees`. Its download button opens the official `Manage-Employees.apk` asset for that tag. Android asks the user to confirm installation.

## Ship a release

Commit the app changes on `main`, then run these commands in a clean working tree. The npm version hook updates the Expo version and increments the Android version code. `npm version` creates a release commit and annotated tag.

```bash
npm version patch
git push --follow-tags origin main
```

Use `npm version minor` for a minor release or pass the desired stable version. The [release workflow](../.github/workflows/android-release.yml) accepts `vX.Y.Z` tags pointing to `main` history. It checks the version against previous stable releases, runs the app tests and builds one universal APK for ARM and x86 on both 32-bit and 64-bit devices. A separate publication job uploads the signed files to a draft, compares their GitHub-provided SHA-256 digests and publishes the release as latest. A retry verifies an existing published release without replacing the assets.

For release highlights, add `release/notes/vX.Y.Z.md` before tagging. If the file is absent, GitHub supplies generated release notes. Installation instructions are appended in both cases.

To retry an existing tag, rerun the failed Actions job or dispatch the workflow against the tag. For example:

```bash
gh workflow run android-release.yml --ref v1.1.1
```

## APK choices

| Installation | File |
| --- | --- |
| New install on Android 7.0 or newer, or update to a publisher-signed install | `Manage-Employees.apk` |
| One-time upgrade of an original development install on Android 9.0 or newer, retaining its local workspace | `Manage-Employees-Migrate-Android9Plus.apk` |

For an original development installation, install the migration APK, then **immediately install `Manage-Employees.apk` from the same release**. Both confirmations are required, including when Android shows the same version name. The first installation preserves app data and transfers ownership of its existing AndroidX signature permission. The second installation completes the transition to the private publisher certificate. These two steps were verified on a Samsung Galaxy S23 Ultra. Use `Manage-Employees.apk` for every later update. Android 7 and 8 cannot use signing-key rotation to migrate the historical development install in place. Uninstalling the old app deletes its local data.

Both APKs use the same compiled app. `release.json` records package, version, version code, the publisher certificate fingerprint and the APK hashes. `SHA256SUMS` contains the checksums for both downloads.

## Signing and recovery

GitHub Actions uses the encrypted repository secrets `ANDROID_RELEASE_KEYSTORE_B64` and `ANDROID_RELEASE_STORE_PASSWORD`, and the repository variable `ANDROID_RELEASE_CERT_SHA256`. The PKCS12 alias is `manage-employees`. Keep an independent private backup of the publisher keystore and its password. GitHub cannot return their values after upload. The [signing lineage](../release/android/signing-lineage.bin) contains public certificates and proof of key rotation.

A manual release can use the same package and publish scripts. Build from the intended tag using Java 17, the Android SDK and Build Tools 36.0.0, with Python 3.11+ and GitHub CLI available. Complete the project tests, then run:

```bash
npx expo prebuild --platform android --no-install
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64)
```

Set `ANDROID_RELEASE_KEYSTORE` to the private PKCS12 path, set `ANDROID_RELEASE_STORE_PASSWORD` through your secret manager, and set `ANDROID_RELEASE_CERT_SHA256` to the publisher's lowercase SHA-256 certificate fingerprint. Package and publish from the same checkout:

```bash
scripts/package-android-release.sh v1.1.1 android/app/build/outputs/apk/release/app-release.apk dist/release
GH_REPO=hizawye/manage-employees scripts/release/publish-android.sh v1.1.1 dist/release
```

Android's signing model and GitHub's release endpoints are documented in the [Android apksigner reference](https://developer.android.com/tools/apksigner) and [GitHub Releases API](https://docs.github.com/en/rest/releases/releases).
