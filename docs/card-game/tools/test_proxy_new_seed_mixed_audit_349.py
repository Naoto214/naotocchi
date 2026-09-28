import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_349.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-349-20260928.json'
class MixedAudit349Tests(unittest.TestCase):
    def test_two_response_and_two_normal_opportunities_are_complete(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw)
        rows={x['path_id']:x for x in report['results']}
        self.assertEqual(4,len(rows))
        self.assertEqual(['response-pass'],rows['probe-01-a-first']['candidate_ids'])
        self.assertEqual(['response-pass'],rows['probe-01-b-first']['candidate_ids'])
        for path in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('normal_action',rows[path]['next_opportunity'])
            self.assertTrue(rows[path]['candidate_set_complete'])
            self.assertTrue(all(rows[path]['completeness_checks'].values()))
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
