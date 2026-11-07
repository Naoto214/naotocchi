import json
from pathlib import Path
p=Path(__file__).parent
rows=json.loads((p/'evidence/final-clearance.json').read_text())['rows']
for r in rows:
 if r['variant']=='B' and r['number']==10:
  assert min(r[k] for k in ['silver','ticks','bezel'])>=8, ('10 requires >=8 design px',r)
