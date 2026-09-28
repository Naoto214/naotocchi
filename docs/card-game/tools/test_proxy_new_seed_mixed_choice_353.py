import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_353.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-353-20260929.json'
class MixedChoice353Tests(unittest.TestCase):
    def test_mandatory_date_normal_pass_and_unique_responses(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
        self.assertEqual('resolve_event',rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('pass',rows['probe-01-b-first']['selected_candidate'])
        self.assertEqual(3,len(rows['probe-01-b-first']['paid_comparisons']))
        for p in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('response-pass',rows[p]['selected_candidate'])
        self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
