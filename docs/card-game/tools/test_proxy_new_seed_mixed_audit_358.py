import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_358.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-358-20260929.json'
class MixedAudit358Tests(unittest.TestCase):
    def test_response_end_and_eggs(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();report=json.loads(raw);rows={r['path_id']:r for r in report['results']}
        self.assertEqual(['response-pass'],rows['probe-01-a-first']['candidate_ids'])
        self.assertTrue(rows['probe-01-b-first']['turn_end_set_complete'])
        for path in ('probe-02-a-first','probe-02-b-first'):
            self.assertEqual('mandatory_egg_exchange',rows[path]['next_opportunity'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
