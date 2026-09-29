import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_381.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-381-20260929.json'

class Audit381Tests(unittest.TestCase):
    def test_one_response_and_three_normal_actions(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
        raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
        self.assertEqual(['response-pass'],rows['probe-01-a-first']['candidate_ids'])
        for path in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):
            self.assertEqual('normal_action',rows[path]['next_opportunity'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual(['candidate-place-companion-B-012#1',
                          'candidate-play-main-B-001#1-birth',
                          'candidate-set_item-B-034#1','pass'],rows['probe-02-a-first']['candidate_ids'])
        self.assertEqual(['candidate-play-main-B-001#1-birth','pass'],rows['probe-02-b-first']['candidate_ids'])
        self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)

if __name__=='__main__':unittest.main()
