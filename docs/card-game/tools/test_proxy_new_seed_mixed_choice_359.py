import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_359.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-359-20260929.json'
class MixedChoice359Tests(unittest.TestCase):
    def test_unique_response_proved_end_seeded_eggs(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        self.assertEqual('response-pass',rows['probe-01-a-first']['selected_candidate'])
        self.assertEqual('turn_end',rows['probe-01-b-first']['selected_candidate'])
        for path in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('seeded_fallback',rows[path]['resolution_mode'])
            self.assertIn(rows[path]['selected_candidate'],rows[path]['candidate_ids'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
