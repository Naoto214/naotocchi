import json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_386.py');OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-386-20260929.json'
class Audit386Tests(unittest.TestCase):
 def test_four_response_windows(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
  self.assertEqual(['response-activate-ability-B-015#1','response-pass'],rows['probe-01-b-first']['candidate_ids'])
  for path in ('probe-01-a-first','probe-02-a-first','probe-02-b-first'):self.assertEqual(['response-pass'],rows[path]['candidate_ids'])
  self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
