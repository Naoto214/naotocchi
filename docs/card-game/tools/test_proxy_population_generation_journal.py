"""Durable sampling protocol with supplied historical bytes, no OS randomness."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from proxy_population_material_protocol import Cursor
import proxy_population_contract as old
try:import proxy_population_generation_journal as api
except ImportError:api=None

def cursor():
 f=old.load_json(old.ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
 return Cursor(dict(known_shuffle_seeds=[],order_pairs=[]),{p['player_id']:p['deck_order_top_to_bottom'] for p in f['input']['players']},group_count=1)

def supplied():
 f=old.load_json(old.ROOT/'data/proxy-normal-decision-first-choice-plan-115-20260918.json')['orders'][0]
 return [p['seed'].to_bytes(16,'big') for p in f['players']]+[bytes(32),bytes(32)]

class GenerationJournalTests(unittest.TestCase):
 def test_intent_and_return_are_durable_before_consume_and_no_overwrite(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'journal.jsonl';c=cursor();values=iter(supplied());seen=[]
   def read(size):
    records=[json.loads(s) for s in path.read_text().splitlines()]
    self.assertEqual(records[-1]['event']['kind'],'request')
    self.assertEqual(records[-1]['event']['request'],c.request())
    raw=next(values);self.assertEqual(size,len(raw));seen.append(size);return raw
   result=api.collect_supplied(c,path,read)
   self.assertTrue(result['complete']);self.assertEqual(seen,[16,16,32,32])
   self.assertFalse(result['provenance_verified']);self.assertFalse(result['input_lock_verified'])
   self.assertTrue(api.audit_journal(path,c.record())['journal_consistent'])
   with self.assertRaises(FileExistsError):api.collect_supplied(cursor(),path,lambda n:self.fail('no redraw'))
 def test_interrupted_request_cannot_be_converted_to_a_return_or_redrawn(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'journal.jsonl';c=cursor()
   def fail(size):raise OSError('synthetic read failure')
   with self.assertRaises(OSError):api.collect_supplied(c,path,fail)
   proof=api.audit_journal(path,c.record())
   self.assertFalse(proof['complete']);self.assertEqual(proof['pending_request'],c.request());self.assertFalse(proof['resume_allowed'])
   with self.assertRaises(FileExistsError):api.collect_supplied(c,path,lambda n:self.fail('no redraw'))
 def test_hash_chain_and_material_binding_are_not_self_reported_flags(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'journal.jsonl';c=cursor();values=iter(supplied());api.collect_supplied(c,path,lambda n:next(values));material=c.record()
   bad=copy.deepcopy(material);bad['calls'][0]['raw_hex']='ff'*16
   self.assertFalse(api.audit_journal(path,bad)['journal_consistent'])
   rows=path.read_text().splitlines();row=json.loads(rows[1]);row['event']['raw_hex']='ff'*16;rows[1]=json.dumps(row);path.write_text('\n'.join(rows)+'\n')
   self.assertFalse(api.audit_journal(path,material)['journal_consistent'])
 def test_directory_entry_and_file_intent_are_synced_before_read(self):
  import os
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'journal.jsonl';values=iter(supplied());synced=[];real=api.os.fsync
   def sync(fd):synced.append(os.fstat(fd).st_ino);return real(fd)
   def read(n):
    self.assertIn(path.parent.stat().st_ino,synced)
    self.assertIn(path.stat().st_ino,synced)
    return next(values)
   with patch.object(api.os,'fsync',side_effect=sync):api.collect_supplied(cursor(),path,read)

 def test_persistence_failure_prevents_the_entropy_read(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'journal.jsonl'
   with patch.object(api.os,'fsync',side_effect=OSError('synthetic persistence failure')):
    with self.assertRaises(OSError):api.collect_supplied(cursor(),path,lambda n:self.fail('read before durable intent'))

if __name__=='__main__':unittest.main()
