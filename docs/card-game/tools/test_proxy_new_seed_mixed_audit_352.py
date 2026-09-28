import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_352.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-352-20260929.json'
class MixedAudit352Tests(unittest.TestCase):
    def test_first_date_resolution_normal_and_end_responses_are_proved(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw)
        rows={x['path_id']:x for x in report['results']}
        self.assertEqual(4,len(rows))
        self.assertEqual('chain_resolution',rows['probe-01-a-first']['next_opportunity'])
        self.assertTrue(rows['probe-01-a-first']['effect_preconditions_proved'])
        self.assertEqual('normal_action',rows['probe-01-b-first']['next_opportunity'])
        for p in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual(['response-pass'],rows[p]['candidate_ids'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
