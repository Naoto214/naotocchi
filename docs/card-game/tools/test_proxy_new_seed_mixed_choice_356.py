import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_356.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-356-20260929.json'
class MixedChoice356Tests(unittest.TestCase):
    def test_free_placement_response_and_mandatory_ends(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
        self.assertEqual('candidate-place-companion-A-012#1',rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('safe_free_development',rows['probe-01-a-first']['resolution_mode'])
        self.assertEqual('response-pass',rows['probe-01-b-first']['selected_candidate'])
        for p in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('turn_end',rows[p]['selected_candidate'])
        self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
