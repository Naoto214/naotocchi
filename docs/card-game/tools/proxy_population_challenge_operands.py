"""107 current challenge arithmetic from pinned print and supplied public state.

Independent of challenge.stats and reported result values. Typed-row history,
initial-state authenticity and other decision priorities are separate gates.
"""
import hashlib
import proxy_continuation_payments as payments
from proxy_mandatory_policy_contract import ROOT

SOURCES={
 '02-main-system.md':'6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127',
 '55-insect-three-lines-card-text-draft.md':'8108f781d2e02b45139fdf7d1d573c7ac839f14cd2b8361983ecb891320f8c28',
 '31-beetle-stagbeetle-card-master-migration.md':'575535cfcbcb60343f7947b0542350ce9027368664baec021609af9a53519a47',
 '89-world-13-card-text-draft.md':'19babfc75a43ed494a10d7be3a78f7586e1319ffc4314853689781ac74dc8269',
 '72-companion-26-card-text-draft.md':'941d17e157d77badfaaab0e1f04539eb602c05b893241ff3024ecd7ae0c97117'}
PRINTED={**{f'M-antlion-0{i}':pair for i,pair in enumerate(((2,3),(3,4),(5,4),(1,5),(2,5),(6,5),(7,6),(4,8)),1)},'M-beetle-01':(2,2),'M-beetle-02':(3,2)}
WORLDS={'W-deepsea','W-city','W-countryside'}
COMPANIONS={'C-bat','C-box','C-cat_friend','C-chameleon','C-chicken'}


def values(envelope,actor):
 for path,digest in SOURCES.items():
  if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('challenge numeric source changed')
 if actor not in ('A','B'):raise ValueError('comparison actor unsupported')
 payments.validate_effects(envelope)
 g=envelope['legacy_continuation']['game_state'];p=g['players'][actor];other=g['players']['B' if actor=='A' else 'A'];source=p['board']['main']
 if any(player['reservations'] for player in g['players'].values()):raise ValueError('legacy reservation numeric contribution unproved')
 card=g['cards'].get(source,{}).get('card_id')
 if card not in PRINTED:raise ValueError('comparison main unsupported')
 pair=PRINTED[card];result=dict(zip(('power','wisdom'),pair));terms=[dict(kind='printed',source_instance_id=source,card_id=card,power=pair[0],wisdom=pair[1])]
 for row in envelope['runtime']['stat_effects']:
  if row['target_instance_id']!=source:continue
  for key in result:result[key]+=row[key]
  terms.append(dict(kind='typed',effect_id=row['effect_id'],power=row['power'],wisdom=row['wisdom']))
 ownworld=p['board']['world'];otherworld=other['board']['world']
 def world_card(instance):
  if instance is None:return None
  card=g['cards'][instance]['card_id']
  if card not in WORLDS:raise ValueError('comparison world unsupported')
  return card
 owncard=world_card(ownworld);othercard=world_card(otherworld)
 if owncard=='W-deepsea' and len(p['hand'])<=2:
  result['power']+=1;result['wisdom']+=1;terms.append(dict(kind='continuous',source_instance_id=ownworld,power=1,wisdom=1))
 for companion in p['board']['companions']:
  card=g['cards'][companion]['card_id']
  if card not in COMPANIONS:raise ValueError('comparison companion unsupported')
  if card=='C-chameleon' and ownworld is not None and otherworld is not None:
   parameter='wisdom' if owncard==othercard else 'power';result[parameter]+=1
   terms.append(dict(kind='continuous',source_instance_id=companion,power=int(parameter=='power'),wisdom=int(parameter=='wisdom')))
 result={key:max(0,value) for key,value in result.items()}
 return dict(schema='supplied_public_challenge_operands.v1',actor=actor,main_instance_id=source,values=result,terms=terms,source_sha256=dict(SOURCES),
  supplied_operand_arithmetic_verified=True,typed_effect_history_authenticated=False,initial_state_authenticated=False,all_decision_operands_proven=False)
