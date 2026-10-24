"""A 465 local frame carrying the active projection resolves to its full record."""
import copy,unittest
from unittest.mock import patch
import proxy_population_incarnation_runtime as incarnation
import proxy_population_incarnation as life
import test_proxy_population_history_incarnation_dispatch as dispatch


class ProjectionLookupTests(unittest.TestCase):
 def exercise(self,check):
  """Reuse the native I-sleepboost1 reentry fixture and its live connection."""
  host=dispatch.HistoryIncarnationDispatchTests('test_unrelated_classifiers_do_not_dereference_after_only_source');created=[]
  class Spy(incarnation.Connection):
   def __init__(self,*args,**kwargs):super().__init__(*args,**kwargs);created.append(self)
  def wrapped(before,after,event,history):
   c=created[-1];full=life.game(after);record=c.registry(full)
   self.assertEqual(len(record['metadata']),len(full['cards']));self.assertIn(event['instance_transitions'][0]['from_instance_id'],record['metadata'])
   check(c,record,full)
  with patch.object(incarnation,'Connection',Spy):host.exercise('I-sleepboost1',wrapped)

 def test_active_projection_resolves_to_the_full_record(self):
  def check(c,record,full):
   projected=life.project_game(record,full)
   self.assertNotEqual(len(projected['cards']),len(full['cards']))
   self.assertEqual(c.registry(projected),record)
   # The projected lookup never widens: unrelated maps still fail.
   unknown=copy.deepcopy(projected);unknown['cards'].pop(sorted(unknown['cards'])[0])
   with self.assertRaises(ValueError):c.registry(unknown)
   forged=copy.deepcopy(projected);forged['cards'][record['active'][event_copy(record)]]['card_id']='E-boss'
   with self.assertRaises(ValueError):c.registry(forged)
  self.exercise(check)

 def test_projection_shared_by_disagreeing_records_is_ambiguous(self):
  def check(c,record,full):
   projected=life.project_game(record,full)
   other=copy.deepcopy(record);retired=next(s for s in other['metadata'] if s not in other['active'].values());other['metadata'][retired]=dict(other['metadata'][retired],card_id='E-boss');other['current_envelope_sha256']='0'*64
   c.records['forged']=other
   with self.assertRaises(ValueError):c.registry(projected)
  self.exercise(check)


def event_copy(record):
 return next(copy_id for copy_id,source in record['active'].items() if source.endswith('#2'))


if __name__=='__main__':unittest.main()
