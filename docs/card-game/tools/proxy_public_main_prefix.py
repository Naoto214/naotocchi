"""449 diagnostic public main movement; unresolved tails and old policies stay intact."""
import copy
import proxy_continuation_batch as batch
import proxy_continuation_rules as rules
import proxy_continuation_payments as payments
from proxy_public_relationship_prefix import refine_outcomes as relationship_outcomes
from proxy_equivalence_outcomes import _ledger,_atom
from proxy_resource_value_selection import canonical_sha256 as sha


def move_public_main(view,action,cost,consumed_ids):
 """Existing atomic movement only; None means discard ordering unproved."""
 v=copy.deepcopy(view);actor=v['actor'];p=v['public'];b=p['own_board'];rt=v['runtime'];main=b['main'];sid=main['instance_id']
 equipment=[s for s,r in rt['attachments'].items() if r['target_instance_id']==sid]
 # JSON object enumeration is not an approved discard ordering rule.
 if len(equipment)>1:return None
 for source in equipment:
  owner=rt['attachments'][source]['controller'];board=p['own_board' if owner==actor else 'opponent_board'];card=next(c for c in board['prepared'] if c.get('instance_id')==source)
  board['prepared'].remove(card);p['discard'][owner].append(card);del rt['attachments'][source]
  rt['public_prepared'][owner]=[r for r in rt['public_prepared'][owner] if r.get('source_instance_id')!=source]
  for slot,row in enumerate(rt['public_prepared'][owner]):row['slot']=slot
 p['discard'][actor].append(main)
 for key in ('stat_effects','conditional_effects'):rt[key]=[r for r in rt[key] if r['target_instance_id']!=sid]
 rt['payment_effects']=[r for r in rt['payment_effects'] if r['effect_id'] not in consumed_ids]
 source=next(c for c in p['own_hand'] if c['instance_id']==action['source_instance_id']);p['own_hand'].remove(source);b['main']=source;p['time'][actor]-=cost
 v['control']['prefix_stage']='atomic_public_main_movement_before_tail'
 v['history'].append(dict(seq=v['event_seq']+1,actor=actor,action_type='main_movement',source_instance_id=source['instance_id'],target_instance_ids=[]))
 return v


def _capability(card):
 return batch.classification(card) if card in batch.CAPABILITIES else rules.classification(card)


def refine_outcomes(x):
 rows=relationship_outcomes(x);actions={a['candidate_id']:a for a in x['actions']};original=x['view'];p=original['public'];actor=original['actor'];main=p['own_board']['main'];control=original['control']
 if main is None:return rows
 if control['phase']!='normal_action' or control['activation_zone'] or control['pending_triggers'] or any(p['growth'][o]>=100 or p['reservations'][o] for o in ('A','B')):return rows
 cards={c['instance_id']:c for c in p['own_hand']}
 for owner,name in ((actor,'own_board'),('B' if actor=='A' else 'A','opponent_board')):
  for value in p[name].values():
   for c in value if isinstance(value,list) else [value] if isinstance(value,dict) else []:
    if 'instance_id' in c:cards[c['instance_id']]=c
  for c in p['discard'][owner]:cards[c['instance_id']]=c
 # Existing typed validator needs only public card identities and runtime;
 # no synthetic hand/deck contents or full-state continuation is constructed.
 effects=[r for k in ('payment_effects','stat_effects','conditional_effects') for r in original['runtime'][k]]
 if any(r['source_instance_id'] not in cards for r in effects):return rows
 payments.validate_effects(dict(event_seq=original['event_seq'],runtime=original['runtime'],legacy_continuation={'game_state':dict(cards=cards,turn_player=actor,round=control['round'])}))
 allowed={r['card_id'] for r in rules.table()['cards'] if r['card_type']=='main'}
 for index,old in enumerate(rows):
  a=actions[old['candidate_id']]
  if a['action_type']!='play_main' or a['source_zone']!='hand':continue
  source_cap=_capability(a['card_id']);prior_cap=_capability(main['card_id'])
  refs=[source_cap['reference'],prior_cap['reference']]
  unsupported=False
  for sid,link in original['runtime']['attachments'].items():
   if link['target_instance_id']!=main['instance_id']:continue
   cap=_capability(cards[sid]['card_id']);refs.append(cap['reference'])
   if cap['timing'] not in ('own_turn_start','own_turn_end'):unsupported=True
  if unsupported:continue
  proof=rules.main_transition(main['card_id'],a['card_id'],a['candidate_variant'],p['time'][actor],allowed)
  cost=proof['payment_time'];consumed=[]
  if any(r!='insufficient_time' for r in proof['reason_codes']):raise ValueError('main lineage differs')
  if a['candidate_variant']=='transform':
   eligible=[r for r in original['runtime']['payment_effects'] if r['controller']==actor and r['payment_kind']=='transform']
   cost=max(0,cost-sum(r['amount'] for r in eligible));consumed=sorted(r['effect_id'] for r in eligible)
  score=next(s for s in x['baseline_problem']['candidates'] if s['candidate_id']==a['candidate_id'])
  if a['evidence'].get('payment_effect_ids',[])!=consumed or score['payment_time']!=cost or cost>p['time'][actor] or score['certain_growth_difference']!=0:raise ValueError('main public payment/growth evidence differs')
  v=move_public_main(original,a,cost,consumed)
  if v is None:continue
  # The pending operator retains exact physical source, target, declaration and
  # references. Arrival/response are NOT silently executed or valued as zero.
  atoms=_ledger(v,x['source_manifest'])+[_atom('pending_action','unresolved',{k:a[k] for k in ('action_type','candidate_variant','card_id','source_instance_id','target_instance_ids','source_zone','source_references')})]
  ids=[z['atom_id'] for z in atoms]
  if len(ids)!=len(set(ids)):raise ValueError('duplicate residual atom')
  rows[index]=dict(candidate_id=old['candidate_id'],source_view_sha256=sha(original),boundary=copy.deepcopy(v['control']),atoms=atoms,dependencies=[dict(dependency_id='context',members=sorted(ids),complete=True,rule='same_physical_public_context_and_unchanged_opaque_regions')],unknowns=sorted(set(original['coverage']['unknowns']+['unresolved_arrival_or_departure','unresolved_response'])),coverage=copy.deepcopy(old['coverage']),certain_prefix_proofs=sorted(set(refs+['01-core-rules.md','02-main-system.md','64-turn-boundaries-and-victory-timing.md','119-response-window-contract.md','tools/proxy_continuation_batch.py','tools/proxy_continuation_state.py','tools/proxy_continuation_payments.py'])),opaque_unchanged=True)
 return rows
