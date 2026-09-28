import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_choice_362.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-362-20260929.json'
class MixedChoice362Tests(unittest.TestCase):
    def test_three_unique_passes_and_seeded_egg(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        for path in ('probe-01-a-first','probe-02-a-first','probe-02-b-first'):
            self.assertEqual('response-pass',rows[path]['selected_candidate'])
        chosen=rows['probe-01-b-first']
        self.assertEqual('seeded_fallback',chosen['resolution_mode'])
        self.assertIn(chosen['selected_candidate'],chosen['candidate_ids'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
