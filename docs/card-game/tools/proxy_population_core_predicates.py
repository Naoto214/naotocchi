"""01/02 core normal verdict audit, separate from full candidate completeness.

Checks all supplied core alternatives, including exclusions. Registered target
expansion, card-specific quick/ability conditions and actual information use
remain separate obligations. Reuses native identity and payment mechanisms;
never selects a candidate or executes a transition.
"""
import hashlib
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_payments as payments
from proxy_population_trigger_effects import relationship_payment
from proxy_population_candidate_expansions import TABLE_PATH,TABLE_SHA
from proxy_mandatory_policy_contract import ROOT,canonical
SOURCES={'01-core-rules.md':'d95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71','02-main-system.md':'6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127','06-action-chain-checkpoint.md':'7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67',TABLE_PATH:TABLE_SHA}
CORE={'pass','challenge','relationship','play_main','place_companion','place_partner','place_world','attach_item','set_item'}

def _predicates(envelope,row,table):
 g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor];b=p['board'];other=g['players']['B' if actor=='A' else 'A'];kind=row['action_type'];variant=row['candidate_variant'];targets=row['target_instance_ids'];reasons=[];cost=None
 def require(condition,reason):
  if not condition:reasons.append(reason)
 families={'pass':'standing_pass','challenge':'normal_challenge','relationship':'relationship_progress'}
 if row['source_family']!=families.get(kind,'hand_card_action'):raise ValueError('core source family differs')
 if kind in families:
  if targets or row['source_instance_id'] is not None or row['card_id'] is not None:raise ValueError('synthetic core identity differs')
 elif row['source_instance_id'] not in p['hand'] or g['cards'][row['source_instance_id']]['card_id']!=row['card_id']:raise ValueError('core hand identity differs')
 if kind=='pass':
  if variant!='pass':raise ValueError('pass variant differs')
 elif kind=='challenge':
  if variant not in ('power','wisdom'):raise ValueError('challenge variant differs')
  require(b['main'] is not None and other['board']['main'] is not None,'challenge_participant_missing');require(not p['challenge_used'],'challenge_limit_used')
 elif kind=='relationship':
  stage=b['partner_stage'];expected='no_partner' if stage is None else 'terminal' if stage=='married' else ('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]
  if variant!=expected:raise ValueError('relationship variant differs')
  require(b['partner'] is not None,'relationship_partner_absent');require(b['main'] is not None,'relationship_blocked_while_egg');require(not p['relationship_progressed'],'relationship_limit_used');require(stage!='married','relationship_state_terminal')
  payment=relationship_payment(envelope);cost=payment['payment_time'];require(p['time']>=cost,'insufficient_time')
  if payment['payment_effect_ids']:
   if canonical(row['evidence'])!=canonical(payment):raise ValueError('relationship current payment evidence differs')
  elif any(k in row['evidence'] and canonical(row['evidence'][k])!=canonical(v) for k,v in payment.items()):raise ValueError('relationship unsupported payment evidence')
 else:
  entry=table[row['card_id']];template=next(a for a in entry['actions'] if a['action_type']==kind)
  if variant not in template['candidate_variants'] or template['timing']!='normal_action_opportunity':raise ValueError('core registered template differs')
  if kind=='play_main':
   allowed={k for k,v in table.items() if v['card_type']=='main'};current=g['cards'][b['main']]['card_id'] if b['main'] else None
   proof=rules.main_transition(current,row['card_id'],variant,p['time'],allowed)
   proof=payments.adjust_payment(envelope,row,proof)
   if targets:raise ValueError('main transition target grammar differs')
   if canonical(row['evidence'])!=canonical(proof):raise ValueError('main transition predicate/payment evidence differs')
   reasons=proof['reason_codes'];cost=proof['payment_time']
  else:
   cost=template['base_time_cost']
   if type(cost) is not int or cost<0:raise ValueError('core printed payment unproved')
   if kind in ('place_companion','place_partner'):require(not p['person_placed'],'person_placement_limit_used')
   if kind=='place_partner':
    if targets:raise ValueError('partner target grammar differs')
    require(b['partner'] is None,'partner_slot_occupied')
   elif kind=='place_companion':
    if variant=='empty_slot':
     if targets:raise ValueError('empty companion target differs')
     require(len(b['companions'])<3,'required_target_absent')
    elif variant=='replace_each_legal_companion':
     if targets not in ([[s] for s in b['companions']] or [[]]):raise ValueError('companion replacement target differs')
     require(len(b['companions'])>=3,'required_target_absent')
    else:raise ValueError('companion variant unproved')
   elif kind=='place_world':
    if variant=='empty_world_slot':
     if targets:raise ValueError('empty world target differs')
     require(b['world'] is None,'required_target_absent')
    elif variant=='replace_current_world':
     if targets!=([b['world']] if b['world'] else []):raise ValueError('world replacement target differs')
     require(b['world'] is not None,'required_target_absent')
    else:raise ValueError('world variant unproved')
   elif kind in ('attach_item','set_item'):
    if kind=='attach_item':
     target_pool=[s for s in (b['main'],*b['companions'],b['partner']) if s] if variant=='each_legal_own_person' else list(b['companions']) if variant=='each_legal_own_companion' else [b['main']] if variant=='single_own_main' and b['main'] else [] if variant=='single_own_main' else None
     if target_pool is None:raise ValueError('attachment target mechanism unproved')
     if targets not in ([[s] for s in target_pool] or [[]]):raise ValueError('attachment current target differs')
     require(bool(targets),'required_target_absent')
    elif targets:raise ValueError('preparation target grammar differs')
    require(len(b['prepared'])<3,'preparation_slots_full')
    option={k:row['evidence'][k] for k in ('payment_time','cost_modifiers')}
    if canonical(option) not in list(map(canonical,rules.cost_options(envelope,row,cost))):raise ValueError('item payment evidence differs')
    cost=option['payment_time']
   require(p['time']>=cost,'insufficient_time')
 return sorted(reasons),cost


def audit_normal(envelope,inventory):
 errors=[];verified=[];unproved=[]
 try:
  for path,digest in SOURCES.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('core predicate source changed')
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state']
  if g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or g.get('challenge'):raise ValueError('not a core normal entry')
  table={r['card_id']:r for r in rules.table()['cards']}
  for row in inventory['enumeration_units']:
   identity=dict(enumeration_unit_id=row['enumeration_unit_id'],action_type=row['action_type'])
   if row['action_type'] not in CORE:unproved.append(dict(identity,reason='card_specific_or_reservation_predicate_not_audited_here'));continue
   reasons,cost=_predicates(envelope,row,table)
   if sorted(row['reason_codes'])!=reasons or row['disposition']!=('excluded' if reasons else 'admitted') or (row['candidate_id'] is None)!=bool(reasons):raise ValueError('core disposition/reason differs: '+row['enumeration_unit_id'])
   verified.append(dict(identity,reason_codes=reasons,payment_time=cost))
 except (ValueError,KeyError,TypeError,IndexError,StopIteration,OSError) as error:errors.append(str(error))
 return dict(schema='core_normal_disposition_predicates.v1',core_predicates_verified=not errors,errors=errors,verified_units=verified,unproved_units=unproved,source_sha256=dict(SOURCES),
  complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
