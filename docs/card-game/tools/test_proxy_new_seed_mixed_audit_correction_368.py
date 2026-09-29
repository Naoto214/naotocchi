import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=Path(__file__).with_name('proxy_new_seed_mixed_audit_correction_368.py')
OUTPUT=ROOT/'data/proxy-new-seed-mixed-audit-correction-368-20260929.json'
class Correction368Tests(unittest.TestCase):
 def test_occupied_partner_slot(self):
  subprocess.run([sys.executable,str(SCRIPT),'--check'],check=True,capture_output=True,text=True)
  raw=OUTPUT.read_bytes();data=json.loads(raw);rows={x['path_id']:x for x in data['results']}
  self.assertEqual(['candidate-play-main-A-009#1-birth','pass'],rows['probe-02-a-first']['candidate_ids'])
  self.assertEqual('partner_slot_occupied',rows['probe-02-a-first']['corrected_exclusion']['reason_code'])
  self.assertEqual((json.dumps(data,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(),raw)
