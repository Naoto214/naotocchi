import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_363.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-363-20260929.json'
class MixedReplay363Tests(unittest.TestCase):
    def test_three_passes_and_seeded_egg(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        self.assertEqual((4,4),(data['new_events'],data['new_snapshots']))
        for path in ('probe-01-a-first','probe-02-a-first','probe-02-b-first'):
            self.assertEqual('response_pass',rows[path]['new_events'][0]['action_type'])
        self.assertEqual('normal_action',rows['probe-01-a-first']['final_continuation_state']['game_state']['phase'])
        self.assertEqual('egg_exchange_bottom',rows['probe-01-b-first']['new_events'][0]['action_type'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
