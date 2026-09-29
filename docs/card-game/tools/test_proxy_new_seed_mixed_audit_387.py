import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_387.py');OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-387-20260929.json'
class Audit387Tests(unittest.TestCase):
 def test_two_ends_two_responses(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
  for path in ('probe-01-a-first','probe-02-a-first'):
   self.assertTrue(rows[path]['turn_end_set_complete']);self.assertEqual([],rows[path]['contract_stop_codes'])
  for path in ('probe-01-b-first','probe-02-b-first'):self.assertEqual(['response-pass'],rows[path]['candidate_ids'])
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
