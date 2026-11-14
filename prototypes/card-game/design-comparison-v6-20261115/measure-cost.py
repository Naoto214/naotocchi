"""Independent raster check of the captured cost badge specimen (Pillow)."""
import json
from pathlib import Path
from PIL import Image

p = Path(__file__).parent
im = Image.open(p / 'cost-digits.jpg').convert('RGB')
rows = json.loads((p / 'cost-regions.json').read_text())
for row in rows:
    x, y, w, h = (row[k] for k in ('x', 'y', 'width', 'height'))
    points = []
    for py in range(round(y + 8), round(y + h - 8)):
        for px in range(round(x + 8), round(x + w - 8)):
            r, g, b = im.getpixel((px, py))
            if max(r, g, b) < 140:
                points.append((px, py))
    assert points, row
    cx = (min(t[0] for t in points) + max(t[0] for t in points) + 1) / 2
    cy = (min(t[1] for t in points) + max(t[1] for t in points) + 1) / 2
    row['inkOffset'] = {'x': round(cx - (x + w / 2), 2), 'y': round(cy - (y + h / 2), 2)}
report = {'method': 'Independent JPEG dark-ink bounding-box sampling inside 50px circles; dark-ink threshold inside the circle and 1px raster tolerance; no hue gate because JPEG chroma blending turns thin glyph edges brown. Chrome fonts only; not physical iPhone or subjective optical certification.', 'rows': rows}
(p / 'cost-ink-results.json').write_text(json.dumps(report, indent=2) + '\n')
refined = [r for r in rows if r['variant'] == 'refined']
maximum = max(abs(v) for r in refined for v in r['inkOffset'].values())
print(json.dumps({'digits': len(refined), 'maxV6InkOffsetPx': maximum}))
assert maximum <= 1, report
