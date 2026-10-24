"""Pinned inputs for the historical card design, independent of the live pet game.

See data/design-source-20260917/README.md for provenance/extraction. Fail closed
if either input changes; these hashes are evidence, not regeneration outputs.
"""
import hashlib
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / 'data/design-source-20260917'
MASTER_BLOB = '062cf5bcaea5f78742af8cc66194f7c0e1a84c54'
ITEM_ARRAYS_SHA256 = '00dc1a11e53695b5790cfc34674c7c3b252b76a478c4bd07a78ac504f07501f5'


def verified_sources(directory=SOURCE):
    master = (directory / 'character-world-master.v1.js').read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(master)).encode() + b'\0' + master).hexdigest()
    if blob != MASTER_BLOB:
        raise ValueError('Historical design master Git blob mismatch')
    items = (directory / 'legacy-item-arrays.js').read_bytes()
    if hashlib.sha256(items).hexdigest() != ITEM_ARRAYS_SHA256:
        raise ValueError('Historical 38-item source extract mismatch')
    return directory / 'character-world-master.v1.js', items.decode('utf-8')
