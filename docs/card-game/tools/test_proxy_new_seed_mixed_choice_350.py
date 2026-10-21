import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_350.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-350-20260929.json'
class MixedChoice350Tests(unittest.TestCase):
    def test_unique_response_and_paid_normal_choices(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw)
        rows={x['path_id']:x for x in report['results']}
        self.assertEqual(4,len(rows))
        for p in ('probe-01-a-first','probe-01-b-first'):
            self.assertEqual('response-pass',rows[p]['selected_candidate'])
        for p,n in [('probe-02-a-first',2),('probe-02-b-first',1)]:
            self.assertEqual('pass',rows[p]['selected_candidate'])
            self.assertEqual(n,len(rows[p]['paid_comparisons']))
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
