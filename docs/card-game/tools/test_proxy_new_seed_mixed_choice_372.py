import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_372.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-372-20260929.json'
class Choice372Tests(unittest.TestCase):
 def test_proved_end_and_three_unique_passes(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
  raw=OUTPUT.read_bytes();report=json.loads(raw);rows={x['path_id']:x for x in report['results']}
  self.assertEqual(4,len(rows))
  self.assertEqual('turn_end',rows['probe-01-a-first']['selected_candidate'])
  for path in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):
   self.assertEqual('response-pass',rows[path]['selected_candidate'])
  self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
if __name__=='__main__':unittest.main()
