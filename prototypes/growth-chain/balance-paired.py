"""Paired-seed bootstrap; descriptive intervals, no multiplicity adjustment."""
import json
import pathlib
import random
root = pathlib.Path(__file__).resolve().parent
rng = random.Random(20261014)
output = []
for folder, policies in [('balance-results-20261014', ['life','active','cycle']), ('balance-followup-20261014',['life2'])]:
    summary = json.loads((root / folder / 'summary.json').read_text())
    for policy in policies:
        for egg in [0, 1]:
            a, b = [summary[f'{policy}-{unit}-egg{egg}'] for unit in [8, 12]]
            aa, bb = [{x['seed']: x['drops'] for x in row['paired']} for row in [a,b]]
            assert aa.keys() == bb.keys()
            diffs = [aa[k]-bb[k] for k in sorted(aa)]
            samples = sorted(sum(rng.choices(diffs, k=len(diffs)))/len(diffs) for _ in range(2000))
            output.append(dict(condition=f'{policy}-8_vs_12-egg{egg}',meanDropDifference=sum(diffs)/len(diffs),pairedBootstrap95=[samples[50],samples[1950]],wins8=sum(x>0 for x in diffs),wins12=sum(x<0 for x in diffs),ties=sum(x==0 for x in diffs),reach08=[a['reach08'],b['reach08']],death=[a['death'],b['death']]))
(root/'balance-qa-20261014/paired-comparison.json').write_text(json.dumps(output,indent=2)+'\n')
