"""Run normal authored life in an attended browser and retain V12 yield events in its tape."""

import argparse
import asyncio
from pathlib import Path
import sys

base = Path(__file__).resolve().parents[1] / "home-mobility-v11"
sys.path.insert(0, str(base))
import forest_observe as baseline

original_observer = baseline.observe_model


def observe(source):
    observed = original_observer(source)
    anchor = "globalThis.HomeGoalDiagnostics={proposal("
    # The native trial sends diagnostics only when a subscriber exists. This
    # passive copy never invokes planning or mutates an actor, goal or reservation.
    return baseline.replace_once(observed, anchor, """
    forestRecords.curvedYields=[];
    globalThis.HomeV12ForestEvent=(event)=>forestRecords.curvedYields.push({
      clock, ...structuredClone(event)
    });
    """ + anchor)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("url", "arm", "chromium"):
        parser.add_argument("--" + name, required=True)
    for name in ("width", "seed", "order"):
        parser.add_argument("--" + name, type=int, required=True)
    parser.add_argument("--seconds", type=int, default=600)
    parser.add_argument("--attended", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    baseline.observe_model = observe
    asyncio.run(baseline.run(parser.parse_args()))
