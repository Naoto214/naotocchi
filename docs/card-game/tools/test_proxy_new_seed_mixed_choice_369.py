import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_369.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-369-20260929.json'
class Choice369Tests(unittest.TestCase):
 def test_four_choices(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
  raw=OUTPUT.read_bytes();data=json.loads(raw);rows={x['path_id']:x for x in data['results']}
  self.assertEqual(4,len(rows))
  for path in ('probe-01-a-first','probe-01-b-first'):
   self.assertEqual('response-pass',rows[path]['selected_candidate'])
  for path in ('probe-02-a-first','probe-02-b-first'):
   self.assertEqual('pass',rows[path]['selected_candidate'])
  self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
