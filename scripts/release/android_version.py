#!/usr/bin/env python3
"""Validate a stable Android release against its source, APK and previous releases."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from zipfile import ZipFile

PACKAGE = 'com.manageemployees.app'
APK = 'Manage-Employees.apk'
BRIDGE = 'Manage-Employees-Migrate-Android9Plus.apk'
ABIS = {'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'}
STABLE_TAG = re.compile(r'v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)')


def stable(tag):
    match = STABLE_TAG.fullmatch(tag)
    if not match:
        raise ValueError(f'Expected a stable vX.Y.Z tag, got {tag!r}')
    return tuple(map(int, match.groups()))


def identity(config, tag):
    stable(tag)
    expo = config['expo']
    android = expo['android']
    code = android.get('versionCode')
    if expo['version'] != tag[1:] or android['package'] != PACKAGE:
        raise ValueError(f'{tag} disagrees with the Expo version or Android application ID')
    if type(code) is not int or not 1 <= code <= 2_100_000_000:
        raise ValueError('Android versionCode must be a positive release integer')
    return code


def current(tag):
    code = identity(json.loads(Path('app.json').read_text()), tag)
    package = json.loads(Path('package.json').read_text())
    lock = json.loads(Path('package-lock.json').read_text())
    if any(v != tag[1:] for v in [package['version'], lock['version'], lock['packages']['']['version']]):
        raise ValueError('Align package.json and package-lock.json with the release version')
    return code


def check_previous(tag, code, release_pages):
    for page in release_pages:
        for release in page:
            previous = release['tag_name']
            if release['draft'] or release['prerelease'] or previous == tag:
                continue
            if not STABLE_TAG.fullmatch(previous):
                continue  # Other release channels can have unrelated tag names.
            raw = subprocess.check_output(['git', 'show', f'refs/tags/{previous}:app.json'])
            old_code = identity(json.loads(raw), previous)
            if stable(previous) >= stable(tag) or old_code >= code:
                raise ValueError(f'{tag} ({code}) must exceed published {previous} ({old_code})')


def write_metadata(tag, code, apk, cert, aapt):
    badging = subprocess.check_output([aapt, 'dump', 'badging', str(apk)], text=True)
    package_line = next(line for line in badging.splitlines() if line.startswith('package:'))
    attrs = dict(re.findall(r"(\w+)='([^']*)'", package_line))
    if (attrs['name'], attrs['versionName'], attrs['versionCode']) != (PACKAGE, tag[1:], str(code)):
        raise ValueError('Built APK manifest disagrees with app.json')
    if "sdkVersion:'24'" not in badging.splitlines():
        raise ValueError('Standard APK must support Android 7.0 (API 24)')
    with ZipFile(apk) as archive:
        libs = {p.split('/')[1] for p in archive.namelist() if p.startswith('lib/') and p.endswith('.so')}
        if libs != ABIS:
            raise ValueError(f'Expected {sorted(ABIS)}, found {sorted(libs)}')
        for abi in ABIS:
            if f'lib/{abi}/libreactnative.so' not in archive.namelist():
                raise ValueError(f'APK is missing the React Native runtime for {abi}')
    if not re.fullmatch('[0-9a-f]{64}', cert):
        raise ValueError('Expected a lowercase SHA-256 publisher fingerprint')
    with apk.open('rb') as f:
        digest = hashlib.file_digest(f, 'sha256').hexdigest()
    metadata = {'applicationId': PACKAGE, 'version': tag[1:], 'versionCode': code,
                'file': APK, 'sha256': digest, 'signingCertificateSha256': cert}
    with apk.with_name(BRIDGE).open('rb') as f:
        bridge_digest = hashlib.file_digest(f, 'sha256').hexdigest()
    metadata['migration'] = {'file': BRIDGE, 'minSdk': 28, 'sha256': bridge_digest}
    apk.with_name('release.json').write_text(json.dumps(metadata, indent=2) + '\n')
    apk.with_name('SHA256SUMS').write_text(f'{digest}  {APK}\n{bridge_digest}  {BRIDGE}\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tag')
    parser.add_argument('--published-pages', help='JSON from gh api --paginate --slurp repos/OWNER/REPO/releases')
    parser.add_argument('--apk', type=Path)
    parser.add_argument('--cert')
    parser.add_argument('--aapt', default='aapt')
    args = parser.parse_args()
    code = current(args.tag)
    if args.published_pages:
        check_previous(args.tag, code, json.loads(Path(args.published_pages).read_text()))
    if args.apk:
        write_metadata(args.tag, code, args.apk, args.cert or '', args.aapt)
    print(f'{PACKAGE} {args.tag}, Android versionCode {code}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
