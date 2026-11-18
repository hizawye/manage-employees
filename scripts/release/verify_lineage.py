#!/usr/bin/env python3
"""Check the migration APK's embedded signing history reported by Android apksigner."""
import re
import sys

LEGACY_CERT = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'
LEGACY_CAPABILITIES = {
    'installed data': 'true',
    'permission': 'true',  # AndroidX redeclares an existing same-package signature permission.
    'shared UID': 'false',
    'rollback': 'false',
    'auth': 'false',
}


def verify(report, publisher_cert):
    blocks = re.split(r'^Signer #\d+ in lineage certificate DN:.*$', report, flags=re.M)
    if len(blocks) != 3:
        raise ValueError('Expected exactly the original signer followed by the publisher')
    for block, expected in zip(blocks[1:], [LEGACY_CERT, publisher_cert]):
        digests = re.findall(r'^Signer #\d+ in lineage certificate SHA-256 digest: ([0-9a-f]{64})$', block, re.M)
        if digests != [expected]:
            raise ValueError('Unexpected certificate in migration signing history')
    flags = re.findall(r'^Has (.+?) capability\s*:\s*(true|false)$', blocks[1], re.M)
    if len(flags) != len(LEGACY_CAPABILITIES) or dict(flags) != LEGACY_CAPABILITIES:
        raise ValueError('Legacy signing capabilities must grant installed data and permission only')


if __name__ == '__main__':
    try:
        verify(sys.stdin.read(), sys.argv[1])
    except (ValueError, IndexError) as error:
        sys.exit(str(error))
