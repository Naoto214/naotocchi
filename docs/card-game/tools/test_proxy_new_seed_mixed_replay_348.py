import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_replay_348.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-348-20260928.json'
class MixedReplay348Tests(unittest.TestCase):
    def test_four_passes_preserve_unresolved_first_date(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw)
        self.assertEqual((4,4,4),(report['new_decisions'],report['new_events'],report['new_snapshots']))
        rows={x['path_id']:x for x in report['results']}
        self.assertTrue(all(x['new_events'][0]['action_type']=='response_pass' for x in rows.values()))
        first=rows['probe-01-a-first']['final_continuation_state']
        self.assertEqual('building',first['response_context']['chain_status'])
        self.assertEqual('E-first-date',first['activation_zone'][0]['card_id'])
        self.assertEqual('B',first['response_context']['priority_actor'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
