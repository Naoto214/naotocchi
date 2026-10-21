import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_371.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-371-20260929.json'
class Audit371Tests(unittest.TestCase):
 def test_four_current_opportunities(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();report=json.loads(raw)
  rows={x['path_id']:x for x in report['results']}
  self.assertEqual(4,len(rows))
  self.assertTrue(rows['probe-01-a-first']['turn_end_set_complete'])
  for path in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):
   self.assertTrue(rows[path]['candidate_set_complete'])
   self.assertIn('response-pass',rows[path]['candidate_ids'])
  self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
