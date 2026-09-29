import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_365.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-365-20260929.json'
class MixedChoice365Tests(unittest.TestCase):
    def test_normal_pass_first_date_and_unique_responses(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        self.assertEqual('pass',rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual(2,len(rows['probe-01-a-first']['paid_comparisons']))
        self.assertEqual('response-use-event-A-040#1-target-A-017#1',rows['probe-01-b-first']['selected_candidate'])
        for path in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('response-pass',rows[path]['selected_candidate'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
