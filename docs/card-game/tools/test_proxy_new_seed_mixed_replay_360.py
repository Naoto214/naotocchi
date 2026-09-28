import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_360.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-360-20260929.json'
class MixedReplay360Tests(unittest.TestCase):
    def test_response_end_draw_and_seeded_eggs(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        self.assertEqual((5,5),(data['new_events'],data['new_snapshots']))
        self.assertEqual('response_pass',rows['probe-01-a-first']['new_events'][0]['action_type'])
        self.assertEqual(['turn_end_completed','turn_start_and_egg_draw'],
                         [e['action_type'] for e in rows['probe-01-b-first']['new_events']])
        for path in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('egg_exchange_bottom',rows[path]['new_events'][0]['action_type'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
