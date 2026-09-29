import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_364.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-364-20260929.json'
class MixedAudit364Tests(unittest.TestCase):
    def test_normal_and_three_responses(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        self.assertEqual('normal_action',rows['probe-01-a-first']['next_opportunity'])
        self.assertTrue(rows['probe-01-a-first']['candidate_set_complete'])
        for path in ('probe-01-b-first','probe-02-a-first','probe-02-b-first'):
            self.assertTrue(rows[path]['candidate_set_complete'])
            self.assertIn('response-pass',rows[path]['candidate_ids'])
        self.assertEqual(['response-activate-ability-A-015#1','response-pass',
                          'response-use-event-A-040#1-target-A-017#1'],
                         rows['probe-01-b-first']['candidate_ids'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
