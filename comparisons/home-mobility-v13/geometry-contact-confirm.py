"""Count every new opaque-foot intersection on exact pair boundaries at quarter-pixel spacing."""
import argparse
import collections
import hashlib
import itertools
import json
import math
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
spec = spec_from_file_location('contact', HERE / 'geometry-contact.py')
contact = module_from_spec(spec)
spec.loader.exec_module(contact)
SPACING = .25


def grid_centres(low, high):
    start = math.ceil(low / SPACING - .5)
    stop = math.floor(high / SPACING - .5) + 1
    return (np.arange(start, stop) + .5) * SPACING


def shape(person, game):
    alpha = np.asarray(Image.open(game / person['asset']).convert('RGBA'))[:, :, 3]
    rows = np.nonzero((alpha >= 128).any(axis=1))[0]
    band = rows[-1] + 1 - math.ceil((rows[-1] + 1 - rows[0]) * .15)
    height, width = alpha.shape
    left, top, sx, sy, mirror = contact.projection(person, alpha)

    def lookup(x, y):
        ix = np.floor((x - left) / sx).astype(int)
        iy = np.floor((y - top) / sy).astype(int)
        if mirror:
            ix = width - 1 - ix
        valid = (ix >= 0) & (ix < width) & (iy >= band) & (iy < height)
        mask = np.zeros(ix.shape, dtype=bool)
        mask[valid] = alpha[iy[valid], ix[valid]] >= 128
        return mask

    xs = grid_centres(left, left + width * sx)
    ys = grid_centres(top + band * sy, top + (rows[-1] + 1) * sy)
    xx, yy = np.meshgrid(xs, ys)
    opaque = lookup(xx, yy)
    return xx[opaque], yy[opaque], lookup


def verify(raw, game):
    data = contact.geometry_record(raw)
    people = contact.rendered_roster(data)
    sx, sy = (data['scale'][axis] for axis in ('x', 'y'))
    shapes = [shape(person, game) for person in people]
    angles = np.arange(96) * math.tau / 96
    cs, sn = np.cos(angles), np.sin(angles)
    witnesses = {m: [] for m in (8, 5, 0)}
    for i, j in itertools.combinations(range(len(people)), 2):
        first, second = people[i], people[j]
        xx, yy, _ = shapes[i]
        lookup = shapes[j][2]
        for margin in (10, 8, 5, 0):
            dx = cs * ((first['w'] + second['w']) * .5 + margin) * sx
            dy = sn * ((first['h'] + second['h']) * .38 + margin) * sy
            overlap = lookup(xx[None, :] - dx[:, None], yy[None, :] - dy[:, None]).sum(axis=1)
            if margin == 10:
                original, old_dx, old_dy = overlap, dx, dy
                continue
            for index in np.nonzero((overlap > 0) & (original == 0))[0]:
                witnesses[margin].append({
                    'actors': [first['key'], second['key']], 'bearing': index * 3.75,
                    'areaCSS2': float(overlap[index]) * SPACING ** 2,
                    'offsetCSS': [float(dx[index]), float(dy[index])],
                    'oldOffsetCSS': [float(old_dx[index]), float(old_dy[index])],
                })
    results = {}
    for margin, rows in witnesses.items():
        roles = collections.Counter('/'.join(sorted(key.split(':')[0] for key in row['actors'])) for row in rows)
        results[margin] = {'count': len(rows), 'rolePairs': dict(roles),
                           'examples': sorted(rows, key=lambda row: -row['areaCSS2'])[:3]}
    return {'inputSHA256': hashlib.sha256(raw.read_bytes()).hexdigest(),
            'width': data['width'], 'height': data['height'], 'alpha': 128,
            'spacingCSS': SPACING, 'boundaryPosesPerMargin': len(angles) * math.comb(len(people), 2),
            'sampling': 'all pair bearings, exact ellipse offsets, quarter CSS pixel grid fixed to first foot, both lower opaque bands',
            'results': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('raw', type=Path)
    parser.add_argument('game', type=Path)
    parser.add_argument('out', type=Path)
    args = parser.parse_args()
    args.out.write_text(json.dumps(verify(args.raw, args.game), indent=2) + '\n')
