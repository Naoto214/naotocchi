import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_374.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-374-20260929.json'
class Audit374Tests(unittest.TestCase):
 def test_egg_chain_and_two_proved_ends(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
  self.assertEqual(4,len(rows))
  self.assertEqual('mandatory_egg_exchange',rows['probe-01-a-first']['next_opportunity'])
  self.assertEqual('chain_resolution',rows['probe-01-b-first']['next_opportunity'])
  for p in ('probe-02-a-first','probe-02-b-first'):
   self.assertTrue(rows[p]['turn_end_set_complete'])
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
