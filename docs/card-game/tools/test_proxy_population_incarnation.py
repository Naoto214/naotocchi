import copy,unittest
from test_proxy_population_departure import fixture
import proxy_population_incarnation as api

class IncarnationTests(unittest.TestCase):
 def root(self):
  e,s,_=fixture();p=api.game(e)['players']['A'];p['hand'].remove(s);p['board']['companions'].append(s)
  p['reservations']=[dict(source_instance_id=s,target_instance_ids=[s])]
  return e,s,api.create(e)
 def recover(self,e,s,j):
  before=copy.deepcopy(e);p=api.game(e)['players']['A'];p['board']['companions'].remove(s);p['hand'].append(s);return api.observe(j,before,e,[])
 def enter(self,e,s,j):
  before=copy.deepcopy(e);p=api.game(e)['players']['A'];p['hand'].remove(s);p['board']['companions'].append(s);a,t=api.rebind_entry(j,before,e,s);return a,t,api.observe(j,before,a,t)
 def test_recovery_and_repeated_actual_entry(self):
  e,s,j=self.root();physical=s.split('#')[0];j=self.recover(e,s,j);self.assertEqual(j['active'][physical],s)
  e,t,j=self.enter(e,s,j);self.assertEqual(t,[dict(card_copy_id=physical,from_instance_id=s,to_instance_id=physical+'#2',reason='zone_change')]);self.assertEqual(j['active'][physical],physical+'#2')
  j=self.recover(e,physical+'#2',j);e,t,j=self.enter(e,physical+'#2',j);self.assertEqual(j['active'][physical],physical+'#3')
 def test_old_references_and_full_metadata_survive_projection(self):
  e,s,j=self.root();reserved=copy.deepcopy(api.game(e)['players']['A']['reservations']);j=self.recover(e,s,j);e,t,j=self.enter(e,s,j);g=api.game(e)
  self.assertIn(s,g['cards']);self.assertEqual(g['players']['A']['reservations'],reserved)
  projected=api.project_game(j,g);self.assertNotIn(s,projected['cards']);self.assertEqual(api.restore_game(j,g,projected),g)
  bad=copy.deepcopy(projected);bad['cards'][s]=g['cards'][s]
  with self.assertRaises(ValueError):api.restore_game(j,g,bad)
 def test_bad_receipts_unrecorded_reentry_and_duplicates_are_atomic(self):
  e,s,j=self.root();j=self.recover(e,s,j);saved=copy.deepcopy(j);before=copy.deepcopy(e);p=api.game(e)['players']['A'];p['hand'].remove(s);p['board']['companions'].append(s)
  with self.assertRaises(ValueError):api.observe(j,before,e,[])
  after,t=api.rebind_entry(j,before,e,s);bad=copy.deepcopy(t);bad[0]['to_instance_id']=s.split('#')[0]+'#3'
  with self.assertRaises(ValueError):api.observe(j,before,after,bad)
  api.game(after)['players']['A']['hand'].append(s)
  with self.assertRaises(ValueError):api.observe(j,before,after,t)
  self.assertEqual(j,saved)
if __name__=='__main__':unittest.main()
