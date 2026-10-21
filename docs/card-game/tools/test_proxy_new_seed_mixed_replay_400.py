import json, subprocess, sys, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = Path(__file__).with_name('proxy_new_seed_mixed_replay_400.py')
AUDIT = ROOT / 'data/proxy-new-seed-mixed-audit-400-20260929.json'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-400-20260929.json'

class Replay400Tests(unittest.TestCase):
    def test_four_proven_routes(self):
        subprocess.run([sys.executable, str(SCRIPT), '--check'], check=True)
        a, r = json.loads(AUDIT.read_bytes()), json.loads(OUTPUT.read_bytes())
        proofs = {x['path_id']: x for x in a['results']}
        rows = {x['path_id']: x for x in r['results']}
        self.assertEqual(['candidate-place_world-B-020#1','candidate-place_world-B-022#1','pass'], proofs['probe-01-a-first']['candidate_ids'])
        self.assertEqual('pass', rows['probe-01-a-first']['new_decisions'][0]['selected_candidate'])
        self.assertEqual(10, len(proofs['probe-01-b-first']['candidate_ids']))
        self.assertEqual(['response-pass'], proofs['probe-02-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'], proofs['probe-02-b-first']['candidate_ids'])
        self.assertEqual((4,4), (r['new_events'],r['new_snapshots']))
        for path, value in ((AUDIT,a),(OUTPUT,r)):
            self.assertEqual((json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),path.read_bytes())
