import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_355.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-355-20260929.json'
class MixedAudit355Tests(unittest.TestCase):
    def test_normal_response_and_two_end_histories(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();r=json.loads(raw);rows={x['path_id']:x for x in r['results']}
        self.assertEqual('normal_action',rows['probe-01-a-first']['next_opportunity'])
        self.assertEqual(['response-pass'],rows['probe-01-b-first']['candidate_ids'])
        for p in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('turn_end',rows[p]['next_opportunity'])
            self.assertTrue(rows[p]['turn_end_set_complete'])
            self.assertTrue(all(rows[p]['completeness_checks'].values()))
        self.assertEqual((json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
