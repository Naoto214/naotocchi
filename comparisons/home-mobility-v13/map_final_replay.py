"""Repeat the forest atlas on a pinned final guard; keep archived actor inputs and native geometry separate."""

import argparse, contextlib, functools, gzip, hashlib, http.server, json, os, threading
from pathlib import Path
from urllib.parse import urlencode, urlparse
from playwright.sync_api import sync_playwright
from map_capture import HERE, HEIGHT, matrix_frames


def sha(b):
    return hashlib.sha256(b).hexdigest()


def poses(trace):
    d = json.loads(gzip.decompress(trace.read_bytes()))
    initial = d["initial"]["actors"]
    axes = {r["key"]: (r["w"], r["h"]) for r in initial}
    final_axes = {r["key"]: (r["w"], r["h"]) for r in d["baseline"]["residents"]}
    if axes != final_axes:
        raise ValueError(
            f"Intermediate tape does not store sizes for changed residents: {trace}"
        )
    middle = min(d["trajectory"], key=lambda f: abs(f["clock"] - 300))
    fields = ("key", "x", "y", "w", "h")
    frames = [
        dict(phase="opening", time=0, feet=[[r[k] for k in fields] for r in initial]),
        dict(
            phase="300",
            time=middle["clock"],
            feet=[[r[0], r[1], r[2], *axes[r[0]]] for r in middle["actors"]],
        ),
        dict(
            phase="600",
            time=d["baseline"]["modelSeconds"],
            feet=[[r[k] for k in fields] for r in d["baseline"]["residents"]],
        ),
    ]
    return frames, sha(trace.read_bytes()), d


class QuietServer(http.server.ThreadingHTTPServer):
    request_queue_size = 128


@contextlib.contextmanager
def native_server(dist):
    source = (HERE / "map-probe.js").read_text()
    marker = "      if(arrange){clearRelief();"
    digests = {}
    memo = {}

    class Handler(http.server.SimpleHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *_):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "public, max-age=3600")
            super().end_headers()

        def do_GET(self):
            path = urlparse(self.path).path
            if not (
                path.startswith("/game/home-production-model-mobility-v13-")
                and path.endswith(".js")
            ):
                return super().do_GET()
            name = Path(path).name
            if name not in memo:
                raw = (dist / "game" / name).read_bytes()
                text = raw.decode()
                assert text.count(marker) == 1
                digests[name] = sha(raw)
                memo[name] = text.replace(
                    marker, "      if(scene.navigation){" + source + "}\n" + marker
                ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript")
            self.send_header("Content-Length", str(len(memo[name])))
            self.end_headers()
            self.wfile.write(memo[name])

    server = QuietServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=str(dist))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_port}", digests
    finally:
        server.shutdown()
        server.server_close()


VIEW = """() => {
 const rect=document.getElementById('castStage').getBoundingClientRect();
 return {origin:[rect.x,rect.y],paint:HomeBeauty.paintRect,region:'forest',people:HomeCastTrial.inspect().map(a=>{
   const node=document.querySelector('[data-diorama-actor="'+a.key+'"] img.character-asset'),r=node.getBoundingClientRect(),s=getComputedStyle(node);
   return {key:a.key,label:a.label,asset:a.asset,rect:[r.x,r.y,r.width,r.height],flip:s.scale,origin:s.transformOrigin,src:node.getAttribute('src'),x:a.x,y:a.y,w:a.w,h:a.h,foot:a.foot};})};
}"""


def jobs(args):
    if args.group == "matrix":
        for arm in ("b", "c", "d"):
            for w in HEIGHT:
                for count in (28, 1, 4, 10, 20):
                    if arm == "d" and (w != 375 or count != 28):
                        continue
                    frames, checksum = matrix_frames("forest", w, count, args.archives)
                    yield f"forest-{w}-{count}-{arm}", w, HEIGHT[
                        w
                    ], count, arm, False, (None if arm == "d" else frames), checksum, {}
    if args.group == "fixed":
        for arm in ("b", "c", "d"):
            for w in HEIGHT:
                if arm == "d" and w != 375:
                    continue
                for seats in ("fixed", "reference"):
                    yield f"forest-{w}-28-long-{seats}-{arm}", w, 792, 28, arm, seats == "reference", None, "native-opening", {}
    if args.group == "living":
        for trace in sorted(args.traces.glob("*-v13-*/forest28.json.gz")):
            bits = trace.parent.name.split("-")
            w = int(bits[0])
            seats = bits[3]
            arm = "-".join(bits[6:])
            frames, checksum, record = poses(trace)
            filenames = {
                k: v["source"]
                for k, v in record["sources"].items()
                if isinstance(v, dict)
                and v.get("source")
                and (
                    "model-mobility" in k
                    or "home-production-world" in k
                    or "visible-ground-navigation" in k
                )
            }
            filenames.update(record.get("projectionSources", {}))
            entry = "v13-" + arm + ("-reference" if seats == "reference" else "")
            model = f"home-production-model-mobility-{entry}.js"
            if args.version == "final":
                assert filenames[model] == sha(
                    (args.dist / "game" / model).read_bytes()
                ), trace
                for filename, source_hash in record["projectionSources"].items():
                    assert (
                        sha((args.dist / "game" / filename).read_bytes()) == source_hash
                    ), (trace, filename)
            yield f"forest-{w}-28-living-{seats}-{arm}", w, record["opening"][
                "height"
            ], 28, arm, seats == "reference", frames, checksum, {
                "traceVersion": args.version,
                "traceName": trace.parent.name,
                "traceSources": filenames,
            }


def main(args):
    args.out.mkdir(parents=True, exist_ok=True)
    nav = args.dist / "game/home-visible-ground-navigation-v13.mjs"
    native_sha = sha(nav.read_bytes())
    assert native_sha == args.navigation_sha
    with native_server(args.dist) as (base, digests), sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path="/usr/bin/chromium",
            args=["--disable-dev-shm-usage", "--disk-cache-size=33554432"],
        )
        context = browser.new_context(
            viewport={"width": 320, "height": 792},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            timezone_id="Asia/Tokyo",
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        for name, w, h, count, arm, reference, frames, checksum, additional in jobs(
            args
        ):
            out = args.out / (name + ".json.gz")
            if out.exists():
                continue
            assert (
                sha(nav.read_bytes()) == native_sha
            ), "Candidate changed during collection"
            errors.clear()
            page.set_viewport_size({"width": w, "height": h})
            suffix = "-reference" if reference else ""
            stem = "v13-" + arm + suffix
            url = (
                base
                + "/game/mobility-"
                + stem
                + ".html?"
                + urlencode(
                    dict(
                        region="forest",
                        time="day",
                        count=count,
                        paused=1,
                        clock=0,
                        ground="on",
                        paired=1,
                        variant="B",
                        season="autumn",
                        weather="sunny",
                    )
                )
            )
            page.goto(url, wait_until="domcontentloaded", timeout=120000)
            page.wait_for_function(
                "window.HomeCastTrial?.ready && HomeDragTrial.opening() && window.spaceAtlas && HomeBeauty.paintRect?.width",
                timeout=100000,
            )
            geometry = page.evaluate(VIEW)
            if frames is None:
                frames = [
                    {
                        "phase": "opening",
                        "time": 0,
                        "feet": [
                            [p[k] for k in ("key", "x", "y", "w", "h")]
                            for p in geometry["people"]
                        ],
                    }
                ]
            result = page.evaluate("p=>spaceAtlas(p)", dict(frames=frames))
            assert not errors, errors
            result.update(
                region="forest",
                width=w,
                height=h,
                count=count,
                poseDigest=checksum,
                geometry=geometry,
                source=digests["home-production-model-mobility-" + stem + ".js"],
                guardSHA=native_sha,
                engine=browser.version,
                errors=[],
                **additional,
            )
            tmp = out.with_suffix(".tmp")
            tmp.write_bytes(
                gzip.compress(
                    json.dumps(result, separators=(",", ":")).encode(), mtime=0
                )
            )
            os.replace(tmp, out)
            print(name, flush=True)
        browser.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dist", type=Path, required=True)
    p.add_argument("--archives", type=Path, required=True)
    p.add_argument("--traces", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--navigation-sha", required=True)
    p.add_argument("--group", choices=["matrix", "fixed", "living"], required=True)
    p.add_argument("--version", default="final")
    main(p.parse_args())
