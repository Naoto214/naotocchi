import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_367.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-367-20260929.json'
class MixedAudit367Tests(unittest.TestCase):
    def test_four_boundaries(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        self.assertEqual(4,len(rows))
        for path in ('probe-01-a-first','probe-01-b-first'):
            self.assertEqual(['response-pass'],rows[path]['candidate_ids'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        for path in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('normal_action',rows[path]['next_opportunity'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
