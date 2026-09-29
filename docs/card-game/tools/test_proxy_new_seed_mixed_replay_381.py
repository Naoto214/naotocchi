import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_381.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-381-20260929.json'

class Replay381Tests(unittest.TestCase):
    def test_four_selected_transitions(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw);rows={r['path_id']:r for r in report['results']}
        self.assertEqual('response_pass',rows['probe-01-a-first']['new_events'][0]['action_type'])
        self.assertEqual('place_companion',rows['probe-02-a-first']['new_events'][0]['action_type'])
        for path in ('probe-01-b-first','probe-02-b-first'):
            self.assertEqual('normal_pass_end_request',rows[path]['new_events'][0]['action_type'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)

if __name__=='__main__':unittest.main()
