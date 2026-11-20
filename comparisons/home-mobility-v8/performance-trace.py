"""Trace native game phases, including incremental helper search, on separate samples."""
import importlib.util
from pathlib import Path

path=Path(__file__).resolve().parents[1]/"home-mobility-v7/performance-clock.py"
spec=importlib.util.spec_from_file_location("clock",path)
clock=importlib.util.module_from_spec(spec)
spec.loader.exec_module(clock)
original=clock.native


def native(name,src,trace):
    src=original(name,src,trace)
    if not trace or "production-model" not in name:
        return src
    for phase in ["clearance","contactSegmentSafe"]:
        src=clock.wrap(src,phase,threshold=8)
    if "function stepRelief(flags) {" not in src:
        return src
    src=clock.replace(src,"function stepRelief(flags) {","function stepRelief(flags){")
    src=clock.wrap(src,"stepRelief",threshold=8)
    for generator,label in [("r.search","ambientPairSlice"),("request.pairSearch","dragPairSlice")]:
        anchor="result="+generator+".next();"
        src=clock.replace(src,anchor,
            "const timed=mobilityPerf.active,begin=timed?performance.now():0;"+anchor+
            "if(timed)mobilityPerf.finish('"+label+"',begin,8);")
    return src


if __name__=="__main__":
    clock.native=native
    clock.main()
