"""A normal pass delta is not a proof about its eligible end-growth window."""
import unittest
from unittest.mock import patch
import proxy_population_runtime as runtime
import proxy_population_unproved_priority as unresolved
import proxy_population_challenge_window as connected
import proxy_continuation_candidates as candidates
from test_proxy_population_runtime import initial
from test_proxy_population_end_predicates import end_fixture
from proxy_population_start_window import _context


def supplied():
 e,h,_=end_fixture('W-countryside');c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A']
 g['phase']='normal_action';c['response_context']=_context('A','A');c['response_context'].update(window_kind='after_normal_action',origin_event_seq=2,source_phase='normal_action')
 c['return_target']='normal_action_opportunity';e['event_seq']=2;h=h[:2];p['deck'].extend(p['hand']);p['hand']=[]
 return e,h


class PassEndUnknownTests(unittest.TestCase):
 def test_current_eligible_end_growth_keeps_pass_unknown_at_actual_entry(self):
  def run(forced):
   e,h=supplied();r=runtime._step(e,initial(),h,[],[e],forced);d=r['decision']
   proof=d.get('execution_evidence',{}).get('candidate_comparison_evidence',{})
   self.assertIn('pass',proof.get('unproved',{}));self.assertNotIn('pass',proof.get('proved_scores',{}))
   self.assertIn('pass',d['choice']['seeded_fallback_candidates']);self.assertEqual(r['evaluation']['legacy_116'],'excluded')
   self.assertFalse(d['execution_evidence']['policy_eligible'])
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_pass_is_still_legal_and_no_future_growth_value_is_supplied(self):
  def run(forced):
   e,h=supplied();inv=candidates.audit(e,h);self.assertIn('pass',inv['legal_candidate_ids'])
   with unresolved.scope():
    d=runtime._step(e,initial(),h,[],[e],forced)['decision']
   proof=d.get('execution_evidence',{}).get('candidate_comparison_evidence',{})
   self.assertIn('pass',proof.get('unproved',{}));self.assertNotIn('pass',proof.get('proved_scores',{}))
   return {}
  runtime.operation(initial(),run)

 def test_paid_candidate_is_not_excluded_by_unproved_pass_zero(self):
  def run(forced):
   e,h=supplied();g=e['legacy_continuation']['game_state'];p=g['players']['A']
   item=next(s for s in p['deck'] if g['cards'][s]['card_id']=='I-poop1');p['deck'].remove(item);p['hand'].append(item)
   d=runtime._step(e,initial(),h,[],[e],forced)['decision'];proof=d['execution_evidence']['candidate_comparison_evidence']
   target=next(a['candidate_id'] for a in d['inventory']['legal_candidate_details'] if a['source_instance_id']==item)
   self.assertIn(target,proof['proved_scores']);self.assertNotIn('pass',proof['proved_scores'])
   self.assertEqual(set(d['choice']['seeded_fallback_candidates']),{'pass',target})
   return {}
  with connected.contract_scope():runtime.operation(initial(),run)

 def test_absent_or_currently_false_source_does_not_invent_end_growth(self):
  def run(forced):
   for mode in ('two_cards','absent','other_owner'):
    e,h=supplied();g=e['legacy_continuation']['game_state'];p=g['players']['A']
    if mode=='two_cards':h.append(dict(h[-1],seq=3));e['event_seq']=3
    else:
     source=p['board']['world'];p['board']['world']=None
     if mode=='absent':p['discard'].append(source)
     else:
      p['discard'].append(source);other=g['players']['B'];source=next(s for s in other['hand']+other['deck'] if g['cards'][s]['card_id']=='W-countryside')
      (other['hand'] if source in other['hand'] else other['deck']).remove(source);other['board']['world']=source
    with self.subTest(mode=mode),unresolved.scope():
     d=runtime._step(e,initial(),h,[],[e],forced)['decision']
     self.assertEqual(d['choice']['resolution_mode'],'priority_unique')
   return {}
  runtime.operation(initial(),run)

 def test_comparison_scope_restores_and_source_failure_is_not_recast_as_unknown(self):
  import proxy_continuation_batch as batch
  def run(forced):
   e,h=supplied();native=candidates._scores
   with unresolved.scope():
    runtime._step(e,initial(),h,[],[e],forced);self.assertIs(candidates._scores,native)
    with patch.dict(batch.CAPABILITIES['W-countryside'],semantic_section_sha256='0'*64):
     with self.assertRaisesRegex(ValueError,'source|semantic'):
      runtime._step(e,initial(),h,[],[e],forced)
    self.assertIs(candidates._scores,native)
   self.assertIs(candidates._scores,native);return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
