"""Other ordinary response event negatives reuse current trigger predicates."""
import copy,unittest
from test_proxy_population_arrival_predicates import fixture as arrival
from test_proxy_population_city_predicates import fixture as city
from test_proxy_population_relationship_predicates import relationship
from test_proxy_population_challenge_predicates import challenge_fixture
from test_proxy_population_response_pass_effect import origin
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_board_predicates as api
import proxy_continuation_quick as quick

CARDS=('M-antlion-04','M-antlion-05','M-beetle-01','W-city','P-cat_ceo','M-antlion-07','P-anglerfish')
def fixture(card,negative=False):
 if card.startswith('M-') and card not in ('M-antlion-07',):e,h,o,_=arrival(card,'time_skip' if card=='M-antlion-05' else 'birth')
 elif card=='W-city':e,h,o=city()
 elif card=='P-cat_ceo':e,h,o=relationship()
 else:e,h,o=challenge_fixture(card)
 last=h[-1]
 h[-1]=origin(e,'response_pass' if negative else last['action_type'],last['actor'],**{k:v for k,v in last.items() if k not in ('seq','actor','action_type')})
 return e,h,o

class ResponseEventPredicateTests(unittest.TestCase):
 def run_case(self,callback):
  with window.contract_scope():runtime.operation(initial(),lambda forced:callback())
 def test_all_seven_nonmatching_origins_are_checked_and_reoffers_rejected(self):
  def run():
   for card in CARDS:
    e,h,o=fixture(card,True);s=o['source_instance_id'];inv=quick.actions.response_inventory(e,initial(),h);out=api.audit_response(e,h,inv)
    self.assertEqual(out['errors'],[],card);self.assertIn(s,out['verified_source_ids'],card);self.assertEqual(out['event_negative_audits'][s]['verified_candidate_count'],0);self.assertFalse(out['all_rule_opportunities_proven'])
    bad=copy.deepcopy(inv);bad['legal_candidate_details'].append(dict(action_type='activate_board_ability',source_instance_id=s));self.assertTrue(api.audit_response(e,h,bad)['errors'])
   return {}
  self.run_case(run)
 def test_positive_omitted_and_ambiguous_origin_stay_unproved(self):
  def run():
   for card in CARDS:
    for negative in (False,True):
     e,h,o=fixture(card,negative);s=o['source_instance_id']
     if card=='P-cat_ceo' and not negative:
      with self.assertRaisesRegex(ValueError,'mandatory relationship trigger'):quick.actions.response_inventory(e,initial(),h)
      # Deliberately supplied empty inventory must not bypass forced dispatch.
      ctx=e['legacy_continuation']['response_context'];inv=dict(actor=ctx['priority_actor'],response_context=copy.deepcopy(ctx),legal_candidate_details=[])
     else:inv=quick.actions.response_inventory(e,initial(),h)
     histories=(h[:-1],h+[h[-1]]) if negative else (h,)
     for history in histories:
      for omitted in (False,True):
       bad=copy.deepcopy(inv)
       if omitted:bad['legal_candidate_details']=[r for r in bad['legal_candidate_details'] if r.get('source_instance_id')!=s]
       out=api.audit_response(e,history,bad);self.assertEqual(out['errors'],[],(card,negative));self.assertNotIn(s,out['verified_source_ids'],(card,negative));self.assertTrue(any(r['source_instance_id']==s for r in out['unproved_sources']))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
