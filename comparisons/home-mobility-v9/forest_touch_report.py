"""Summarize physical input to the intended resident at the opening and from aged native feet."""
import argparse
import csv
import json
from pathlib import Path

def summarize(files, destination):
    rows = []
    for file in files:
        data = json.loads(file.read_bytes())
        for arm,record in data['arms'].items():
            assert len(record['rows']) == len({r['key'] for r in record['rows']}) == 28
            for r in record['rows']:
                assert r['trusted'] and not r['unsafeSteps'] and not r['sweptViolations']
                rows.append(dict(household=file.stem,footprint_sha256=data['feetSHA256'],model_clock=round(data['clock'],3),
                    arm=arm,resident=r['key'],input_received=int(r['issued']),selected=int(r['selected']),
                    arrived_at_route_end=int(r['terminalArrived']),within_4_css_px=int(r['terminalNear4']),
                    moved_css_px=round(r['endDistanceCss'],2),finger_error_css_px=round(r['endFingerErrorCss'],2),
                    checked_steps=r['stepCount'],unsafe_steps=r['unsafeSteps'],unsafe_segments=r['sweptViolations']))
    with destination.open('w') as out:
        writer = csv.DictWriter(out,fieldnames=rows[0],lineterminator='\n')
        writer.writeheader();writer.writerows(rows)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('files',nargs='+',type=Path)
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args();summarize(a.files,a.out)
