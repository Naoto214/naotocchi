"""Turn-end provenance uses the verified first-date growth, not the static +5."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_growth_runtime as growth
from test_proxy_population_runtime import initial
from test_proxy_population_first_date_effect import actual


class FirstDateProvenanceTests(unittest.TestCase):
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)

 def test_certified_growth_follows_actual_target_legality(self):
  def run(forced):
   for stage,mode,expected in ((0,'normal',5),(1,'normal',0),(0,'stale1',0),(0,'departed',0)):
    b,a,ev=actual(forced,stage,growth=20,mode=mode)
    rows=growth.first_date_proofs([ev],[b,a],set())
    with self.subTest(stage=stage,mode=mode):
     self.assertEqual(len(rows),1);row=rows[0]
     self.assertEqual((row['event_seq'],row['kind'],row['card_id'],row['duration']),(ev['seq'],'resolve_event','E-first-date','none'))
     self.assertEqual(row['certain_growth_difference'],expected)
     self.assertEqual(a['legacy_continuation']['game_state']['players']['A']['growth']-b['legacy_continuation']['game_state']['players']['A']['growth'],expected)
   b,a,ev=actual(forced,0,growth=98);self.assertEqual(growth.first_date_proofs([ev],[b,a],set())[0]['certain_growth_difference'],2)
   return {}
  self.run_case(run)

 def test_forged_resolution_or_duplicate_provenance_fails_closed(self):
  def run(forced):
   b,a,ev=actual(forced,1,growth=20)
   for mutate in (lambda e,x:e['result'].update(growth_added=5),lambda e,x:x['legacy_continuation']['game_state']['players']['A'].update(growth=25),
                  lambda e,x:e['result']['target_recheck'].update(legal=True)):
    event=copy.deepcopy(ev);after=copy.deepcopy(a);mutate(event,after)
    with self.assertRaises(ValueError):growth.first_date_proofs([event],[b,after],set())
   with self.assertRaises(ValueError):growth.first_date_proofs([ev],[b,a],{ev['seq']})
   return {}
  self.run_case(run)

 def test_other_events_are_ignored(self):
  def run(forced):
   b,a,ev=actual(forced)
   other=dict(ev,action_type='resolve_item');self.assertEqual(growth.first_date_proofs([other],[b,a],set()),[])
   self.assertEqual(growth.first_date_proofs([ev],[a],set()),[])
   return {}
  self.run_case(run)


if __name__=='__main__':unittest.main()
