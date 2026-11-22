"""Draw a contact sheet from original paintings and recorded CSS-to-art projections."""

import argparse, json, gzip, base64
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

HERE = Path(__file__).resolve().parent


def main(a):
    art = json.loads((HERE / "map-data/art.json").read_text())
    canvas = Image.new("RGB", (7 * 186, 2 * 300), "#f6f5ed")
    dr = ImageDraw.Draw(canvas)
    for i, (region, spec) in enumerate(art.items()):
        f = a.raw / f"{region}-320-28.json.gz"
        x = (i % 7) * 186
        y = (i // 7) * 300
        if not f.is_file():
            continue
        d = json.loads(gzip.decompress(f.read_bytes()))
        g = d["geometry"]
        orig = Image.open(a.game / spec["image"]).convert("RGB").resize((180, 270))
        c = ImageDraw.Draw(orig, "RGBA")
        ox, oy = g["origin"]
        p = g["paint"]
        sx = 180 / p["width"]
        sy = 270 / p["height"]
        step = d["step"]
        cols = d["cols"]
        rows = d["rows"]
        mask = np.unpackbits(
            np.frombuffer(base64.b64decode(d["ground"]), dtype="u1"), bitorder="little"
        )[: cols * rows].reshape(rows, cols)
        coords = lambda xx, yy: ((xx + ox - p["left"]) * sx, (yy + oy - p["top"]) * sy)
        for row in range(rows):
            runs = np.flatnonzero(np.diff(np.pad(mask[row], 1))).reshape(-1, 2)
            for l, r in runs:
                c.rectangle(
                    [
                        *coords(l * step, row * step),
                        *coords(r * step, (row + 1) * step),
                    ],
                    fill=(253, 96, 150, 126),
                )
        for j, poly in enumerate([spec["ground"], *spec["exclude"]]):
            c.line(
                [(a * 180, b * 270) for a, b in poly + [poly[0]]],
                fill=(255, 244, 60, 255),
                width=1,
            )
        c.rectangle(
            [
                (-p["left"]) * sx,
                -p["top"] * sy,
                (d["width"] - p["left"]) * sx,
                (d["height"] - p["top"]) * sy,
            ],
            outline=(250, 250, 255, 255),
            width=1,
        )
        for actor in d["frames"][0]["actors"]:
            xx, yy = coords(actor["x"], actor["y"])
            c.ellipse([xx - 0.65, yy - 0.65, xx + 0.65, yy + 0.65], fill="black")
        canvas.paste(orig, (x, y))
        dr.text((x + 3, y + 272), region, fill="black")
    canvas.save(a.output, quality=90)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--game", type=Path, required=True)
    p.add_argument("--raw", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    main(p.parse_args())
