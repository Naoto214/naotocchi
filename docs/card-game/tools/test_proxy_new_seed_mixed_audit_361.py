import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_361.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-361-20260929.json'
class MixedAudit361Tests(unittest.TestCase):
    def test_three_responses_and_one_egg(self):
        subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
        raw=OUTPUT.read_bytes();data=json.loads(raw);rows={r['path_id']:r for r in data['results']}
        for path in ('probe-01-a-first','probe-02-a-first','probe-02-b-first'):
            self.assertEqual(['response-pass'],rows[path]['candidate_ids'])
            self.assertTrue(rows[path]['candidate_set_complete'])
        self.assertEqual('mandatory_egg_exchange',rows['probe-01-b-first']['next_opportunity'])
        self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
