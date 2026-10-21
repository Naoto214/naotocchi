import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_choice_347.py')
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-choice-347-20260928.json'
class MixedChoice347Tests(unittest.TestCase):
    def test_four_unique_passes_are_selected_without_events(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw)
        self.assertEqual(4,len(report['results']))
        self.assertEqual(0,report['new_events'])
        self.assertTrue(all(x['candidate_ids']==['response-pass'] and x['selected_candidate']=='response-pass' and x['resolution_mode']=='response_unique' for x in report['results']))
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
