"""Rebuild lossless comparison images from original browser captures + DOM crops."""
import json
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1] / 'docs/qa/home-v17'
for row in json.loads((root / 'captures.json').read_text()):
    images = []
    for version in ('before', 'after'):
        spec = row[version]
        images.append(Image.open(root / spec['file']).crop(spec['crop']).convert('RGB'))
    a, b = images
    result = Image.new('RGB', (a.width + b.width + 20, max(a.height, b.height) + 35), '#e7eee9')
    result.paste(a, (0, 35)); result.paste(b, (a.width + 20, 35))
    draw = ImageDraw.Draw(result)
    draw.text((8, 10), 'V16 / 320px', fill='#21443b')
    draw.text((a.width + 28, 10), 'V17 / 320px', fill='#21443b')
    result.save(root / ('compare-' + row['key'] + '.webp'), lossless=True)
