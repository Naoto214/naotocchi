"""E-final-time's timing verdict is conditional on the designated full-delta audit of the same event."""
import copy,unittest
import proxy_population_timing_occurrence as api
from proxy_population_resolution_semantics import event_digest


def resolution(valid=True):
 """Shape of group-006-A-first 275 / group-101-A-first: own E-final-time resolving under M-antlion-06."""
 event=dict(seq=275,action_type='resolve_event',actor='A',source_instance_id='A-039#1',chain_link_id='response-link-272-A-039#1',payment=dict(time=2),
  result=dict(target_instance_id='A-033#1',target_valid_at_resolution=valid,returned_discard_to_deck_bottom='A-033#1' if valid else None,drawn_instance_ids=['A-027#1','A-034#1'] if valid else [],hand_bottom_instance_id='A-027#1' if valid else None,source_destination='discard',growth_added=0))
 link=dict(card_id='E-final-time',actor='A',action_type='use_event',source_instance_id='A-039#1',link_id='response-link-272-A-039#1')
 return event,link


def record(events,audits,positive=False):
 obligations=[]
 for event,link in events:api.application(None,None,event,link,obligations)
 audit=dict(deferred_application_obligations=obligations)
 runtime=dict(positive_timing_proofs=[dict(independent_timing_audit=audit)]) if positive else dict(supplied_trigger_coverage=None,supported_trigger_coverage=dict(timing_occurrence_audits=[audit]))
 return dict(runtime=runtime),dict(designated_effect_audits=audits)


def verified(event,ok=True,kind='final_time_hand_bottom'):
 return dict(event_sha256=event_digest(event),supplied_designated_effect_verified=ok,choice_contract_id=kind)


class DeferredFinalTimeTests(unittest.TestCase):
 def test_receipt_verdict_is_returned_only_with_an_obligation(self):
  for valid in (True,False):
   event,link=resolution(valid);rows=[]
   self.assertIs(api.application(None,None,event,link,rows),valid)
   self.assertEqual([(r['contract'],r['event_sha256'],r['verdict']) for r in rows],[('designated_full_delta_required',event_digest(event),valid)])
  event,link=resolution()
  with self.assertRaises(ValueError):api.application(None,None,event,link)
  bad=copy.deepcopy(event);bad['result'].pop('target_valid_at_resolution')
  with self.assertRaises(ValueError):api.application(None,None,bad,link,[])
  other=copy.deepcopy(event);other['action_type']='resolve_item'
  with self.assertRaises(ValueError):api.application(None,None,other,link,[])

 def test_record_requires_a_verified_designated_audit_of_the_same_event(self):
  event,link=resolution()
  for positive in (False,True):
   rec,opp=record([(event,link)],[verified(event)],positive)
   self.assertEqual(api.require_deferred(rec,opp)['obligation_count'],1)
   for audits in ([],[verified(event,ok=False)],[verified(event,kind='hand_bottom')],[verified(dict(event,seq=999))]):
    rec,opp=record([(event,link)],audits,positive)
    with self.assertRaises(ValueError):api.require_deferred(rec,opp)
  forged=copy.deepcopy(event);forged['result']['target_valid_at_resolution']=False
  rec,opp=record([(forged,link)],[verified(event)])
  with self.assertRaises(ValueError):api.require_deferred(rec,opp)

 def test_records_without_obligations_pass_unchanged(self):
  rec,opp=record([],[])
  self.assertEqual(api.require_deferred(rec,opp)['obligation_count'],0)


if __name__=='__main__':unittest.main()
