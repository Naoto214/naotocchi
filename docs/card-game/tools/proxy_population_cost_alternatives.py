"""55 literal payment alternatives, independently of producer cost helpers.

Actual supplied zones/usage only. No card value, choice, effect execution or
history-origin proof. The fixed114 methods classify distinct discard costs.
"""
import hashlib,json
from proxy_mandatory_policy_contract import ROOT

TEXT='55-insect-three-lines-card-text-draft.md'
TABLE='data/proxy-normal-decision-candidate-table-114-20260918.json'
SOURCES={TEXT:'8108f781d2e02b45139fdf7d1d573c7ac839f14cd2b8361983ecb891320f8c28',TABLE:'7e1df8fbedb74413c407497fff6f285f77f72907d7e544095e8bb34b348ed737'}


def verify():
 for path,digest in SOURCES.items():
  if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('payment alternatives source changed')


def used(envelope,source,key):
 g=envelope['legacy_continuation']['game_state']
 return any(row['source_instance_id']==source and row['ability_key']==key and row['turn_player']==g['turn_player'] and row['round']==g['round'] for row in envelope['runtime']['ability_uses'])


def item_options(envelope,action,base_cost):
 verify()
 if type(base_cost) is not int or base_cost<0:raise ValueError('item printed cost unproved')
 g=envelope['legacy_continuation']['game_state'];main=g['players'][g['turn_player']]['board']['main']
 options=[dict(payment_time=base_cost,cost_modifiers=[])]
 if action['action_type']=='set_item' and main is not None and g['cards'][main]['card_id']=='M-antlion-01' and not used(envelope,main,'set_discount'):
  options.append(dict(payment_time=max(0,base_cost-1),cost_modifiers=[dict(source_instance_id=main,ability_key='set_discount',source_reference=TEXT+'#M-antlion-01')]))
 return options


def paid_costs(envelope,source):
 verify();g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];owner=g['players'][actor];card=g['cards'][source]['card_id']
 if source!=owner['board']['main'] or card not in ('M-antlion-02','M-antlion-08'):raise ValueError('paid cost source differs')
 if used(envelope,source,'activated_normal_action'):return []
 if card=='M-antlion-02':return [[s] for s in sorted(owner['board']['prepared']) if envelope['runtime']['public_prepared'][s]['face_up'] is False]
 table=json.loads((ROOT/TABLE).read_bytes());methods={row['card_id']:{a['action_type'] for a in row['actions']} for row in table['cards']}
 #Each ordered pair is allowed if either assignment can pay the two roles.
 #Physical identity must differ even when one card supports both methods.
 options=[]
 for first in sorted(owner['discard']):
  left=methods[g['cards'][first]['card_id']]
  for second in sorted(owner['discard']):
   if first==second:continue
   right=methods[g['cards'][second]['card_id']];quick={'use_item','use_play','use_event'}
   if ('set_item' in left and bool(right&quick)) or ('set_item' in right and bool(left&quick)):options.append([first,second])
 return options
