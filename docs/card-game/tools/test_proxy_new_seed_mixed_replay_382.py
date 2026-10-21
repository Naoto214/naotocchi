import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
AUDIT=Path(__file__).with_name('proxy_new_seed_mixed_audit_382.py')
REPLAY=Path(__file__).with_name('proxy_new_seed_mixed_replay_382.py')

class Replay382Tests(unittest.TestCase):
    def test_four_unique_response_passes(self):
        for script in (AUDIT,REPLAY):
            subprocess.run([sys.executable,str(script),'--check'],check=True)
        raw=(ROOT/'data/proxy-new-seed-mixed-replay-382-20260929.json').read_bytes()
        report=json.loads(raw);rows={r['path_id']:r for r in report['results']}
        self.assertEqual(4,len(rows))
        self.assertTrue(all(r['new_events'][0]['action_type']=='response_pass' for r in rows.values()))
        for path in ('probe-01-b-first','probe-02-b-first'):
            self.assertEqual('turn_end',rows[path]['final_continuation_state']['game_state']['phase'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)

if __name__=='__main__':unittest.main()
