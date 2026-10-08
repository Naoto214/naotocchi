"""91 first-date target operands and full supplied resolution delta."""
import copy
import proxy_continuation_state as state
import proxy_population_start_obligations as starts
import proxy_population_resolution_delta as tail
import proxy_population_effective_application as application
import proxy_population_effect_application_runtime as ruling
from proxy_population_incarnation_runtime import active_cards
from proxy_mandatory_policy_contract import canonical

def audit(before,after,event):
 errors=[];applicable=False;reference=None;legal=None
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  applicable=(ctx['chain_status']=='resolving' and link is not None and link.get('card_id')=='E-first-date') or (str(event.get('action_type','')).startswith('resolve') and claimed=='E-first-date')
  if applicable:
   reference=starts.catalog()['cards']['E-first-date']['reference'];ruling.verify_source()
   if not link or link.get('card_id')!='E-first-date' or event.get('action_type')!='resolve_event' or ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links] or c['pending_triggers']:raise ValueError('first-date dispatch differs')
   actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];p=g['players'][actor];targets=link['target_instance_ids']
   if actor not in ('A','B') or link.get('source_zone','hand')!='hand' or link['action_type']!='use_event' or type(targets) is not list or len(targets)!=1 or link['candidate_variant'] is not None or canonical(link['payment'])!=canonical(dict(time=1)):raise ValueError('first-date link differs')
   if g['cards'][source]['card_id']!='E-first-date' or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('first-date physical identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id'] or canonical(event['payment'])!=canonical(dict(time=1)):raise ValueError('first-date receipt identity differs')
   target=targets[0];partner=p['board']['partner'];stage=p['board']['partner_stage'];active=active_cards(g['cards'])
   if partner is None:
    if stage is not None:raise ValueError('first-date absent partner stage differs')
   elif not ((type(stage) is int and 0<=stage<=3) or stage=='married'):raise ValueError('first-date stage operand differs')
   legal=partner==target and type(stage) is int and stage==0 and target in g['cards'] and active.get(g['cards'][target]['card_copy_id'])==target
   expected=copy.deepcopy(before);expected['event_seq']=seq;ep=expected['legacy_continuation']['game_state']['players'][actor];drawn=[]
   if legal and ep['deck']:drawn.append(ep['deck'].pop(0));ep['hand'].extend(drawn)
   growth=application.growth(p['growth'],5 if legal else 0);ep['growth']=growth['after'];ep['discard'].append(source)
   parts=[growth,dict(operation='draw',instance_ids=drawn,status='applied' if drawn else 'not_applied')];status=application.classify(parts,True)
   receipt=dict(target_recheck=dict(target_instance_id=target,current_partner_instance_id=partner,relationship_stage=stage,legal=legal),effect_applied=status=='applied',drawn_instance_ids=drawn,growth_added=growth['actual_delta'],growth_requested=growth['requested_delta'],source_destination='discard')
   evidence=dict(contract='effective_application_474.v1',source_sha256=ruling.RULING_SHA,source_instance_id=source,chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=source,origin_authenticated=False),parts=parts,parts_complete=True,status=status)
   if canonical(event['result'])!=canonical(receipt):raise ValueError('first-date result differs')
   if canonical(event['application_evidence'])!=canonical(evidence):raise ValueError('first-date application evidence differs')
   tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('first-date changed unrelated state or wrong effect')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_first_date_semantics.v1',applicable=applicable,errors=errors,supplied_first_date_verified=applicable and not errors,target_legal=legal,source_reference=reference,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,incarnation_origin_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,legacy_reservation_closure_proven=False,policy_eligible=None,balance_admitted=None)
