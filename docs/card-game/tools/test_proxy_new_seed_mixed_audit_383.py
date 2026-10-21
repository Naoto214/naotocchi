import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_383.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-383-20260929.json'

class Audit383Tests(unittest.TestCase):
    def test_two_ends_and_two_other_opportunities(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw);rows={r['path_id']:r for r in report['results']}
        self.assertEqual('normal_action',rows['probe-01-a-first']['next_opportunity'])
        self.assertEqual(['response-pass'],rows['probe-02-a-first']['candidate_ids'])
        for path in ('probe-01-b-first','probe-02-b-first'):
            self.assertTrue(rows[path]['turn_end_set_complete'])
            self.assertEqual([],rows[path]['contract_stop_codes'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)

if __name__=='__main__':unittest.main()
