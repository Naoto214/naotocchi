"""Current06/93 suppression of already activated scorpion/cat effects while egg.

Reuse native draw/chain/event machinery with zero draw operations. Never hide
or change game state, erase activation history, or amend historical source pins.
Cat cycle suppression reuses the same native zero-draw branch; live cycles remain native.
"""
import hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_triggers as triggers
import proxy_population_start_obligations as starts
from proxy_population_resolution_order import SOURCE,SOURCE_SHA
from proxy_mandatory_policy_contract import ROOT

CARD='P-desert_scorpion'
CYCLE_CARD='P-cat_ceo'
_LOCK=Lock()


def verify_source():
 if hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('partner suppression06 source changed')
 starts.catalog()


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('partner draw scope concurrency/reentry forbidden')
 original=triggers.resolve
 def resolve(current,initial):
  links=current['activation_zone'];link=links[-1] if links else None
  if not link or link.get('card_id') not in (CARD,CYCLE_CARD) or link.get('source_zone')!='board' or current['game_state']['players'][link['actor']]['board']['main'] is not None:return original(current,initial)
  verify_source();draws=triggers.DRAW_EFFECTS;cycles=triggers.CYCLE_EFFECTS;card=link['card_id']
  if card==CARD and draws.get(CARD)!=1:raise ValueError('native partner one-draw descriptor differs')
  if card==CYCLE_CARD and (card not in cycles or card in draws):raise ValueError('native partner cycle descriptor differs')
  try:
   triggers.DRAW_EFFECTS=dict(draws,**{card:0})
   if card==CYCLE_CARD:triggers.CYCLE_EFFECTS=cycles-{card}
   return original(current,initial)
  finally:triggers.DRAW_EFFECTS=draws;triggers.CYCLE_EFFECTS=cycles
 try:
  triggers.resolve=resolve;yield
 finally:triggers.resolve=original;_LOCK.release()


def audit_cycle(before,after,event,decisions):
 """Only the suppressed cat route; live choice/effect proof remains separate."""
 import copy
 import proxy_continuation_state as state
 import proxy_population_resolution_delta as tail
 from proxy_mandatory_policy_contract import canonical
 errors=[];applicable=False
 try:
  c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];links=c['activation_zone'];link=links[-1] if links else None
  claimed=g['cards'].get(event.get('source_instance_id'),{}).get('card_id')
  candidate=(ctx['chain_status']=='resolving' and link is not None and link.get('card_id')==CYCLE_CARD) or (event.get('action_type')=='resolve_board_ability' and claimed==CYCLE_CARD)
  actor=link['actor'] if link else event.get('actor')
  applicable=candidate and g['players'][actor]['board']['main'] is None
  if applicable:
   verify_source();reference=starts.catalog()['cards'][CYCLE_CARD]['reference']
   if not link or link['card_id']!=CYCLE_CARD or event['action_type']!='resolve_board_ability' or ctx['chain_status']!='resolving' or ctx['consecutive_passes']!=2 or ctx['chain_links']!=[r['link_id'] for r in links]:raise ValueError('suppressed partner dispatch differs')
   source=link['source_instance_id'];physical=g['cards'][source];seq=event['seq']
   if link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['target_instance_ids']!=[] or link['candidate_variant'] is not None or canonical(link['payment'])!=canonical(dict(time=0)) or physical['card_id']!=CYCLE_CARD or physical['card_copy_id']!=link['card_copy_id']:raise ValueError('suppressed partner link identity differs')
   #06/93 independently forbids every effect operation while egg, hence
   # no selection. Do not pass retained historical metadata to raw465 here.
   # Existing incarnation_policy owns registry-bound projection/choice proof.
   if canonical(decisions)!=canonical([]):raise ValueError('suppressed partner choice differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['source_instance_id']!=source or event['source_zone']!='board' or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('suppressed partner receipt identity differs')
   if canonical(event['result'])!=canonical(dict(drawn_instance_ids=[],hand_bottom_instance_id=None,target_instance_id=None,growth_added=0)):raise ValueError('suppressed partner result differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;tail.finish(expected,before,event)
   if canonical(after)!=canonical(expected):raise ValueError('suppressed partner changed effect state')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_partner_cycle_suppression.v1',applicable=applicable,errors=errors,supplied_suppression_verified=applicable and not errors,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  activation_proven=False,origin_authenticated=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
