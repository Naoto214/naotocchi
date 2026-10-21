"""Independent permitted-field projection into the actual normal inventory.

The producer is not called. This certifies the supplied history projection,
not all reads by candidates/comparators, raw-history origin, or admission.
"""
import copy,hashlib
from proxy_mandatory_policy_contract import ROOT,canonical

SOURCES={
 '107-normal-decision-match-protocol.md':'32f40f9edaadd5aead8d424eac3c33618ccc1ec212837a9672a30ff22e62f2e9',
 '02-main-system.md':'6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127',
 '77-current-items-card-text-draft.md':'ec0a630c5616f6a50ca97afcebaab22fe9de13fe5e3789552d4e7d7ee93a8a02',
 '72-companion-26-card-text-draft.md':'941d17e157d77badfaaab0e1f04539eb602c05b893241ff3024ecd7ae0c97117'}
# Literal current public-event contract. Never import the producer's whitelist.
PUBLIC=('seq','action_type','actor','source_zone','participants','parameter','declaring_actor')
RESULT=('challenge_id','declaring_actor','participants','parameter','outcome','values','winner','loser','growth_added','revealed_instance_id','revealed_card_id','revealed_type','target_instance_id','returned_instance_id','effect_applied')


def digest(value):return hashlib.sha256(canonical(value)).hexdigest()


def audit(envelope,events,runtime_history,inventory):
 errors=[];projected=[];actor=None
 try:
  for path,expected in SOURCES.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=expected:raise ValueError('allowed history source changed')
  actor=envelope['legacy_continuation']['game_state']['turn_player']
  if actor not in ('A','B') or type(events) is not list or type(runtime_history) is not list:raise ValueError('allowed history input differs')
  boundaries={e['event_seq']:e for e in runtime_history}
  if len(boundaries)!=len(runtime_history):raise ValueError('allowed history duplicate boundary')
  sequences=[]
  for event in events:
   seq=event['seq'];owner=event['actor'];kind=event['action_type']
   if type(seq) is not int or seq>envelope['event_seq'] or owner not in ('A','B'):raise ValueError('allowed history event boundary differs')
   sequences.append(seq)
   row={k:copy.deepcopy(event[k]) for k in PUBLIC if k in event}
   if owner==actor or kind not in ('set_item','egg_exchange_bottom'):
    for key in ('source_instance_id','previous_world_instance_id'):
     if key in event:row[key]=copy.deepcopy(event[key])
   if type(event.get('result')) is dict:
    result={k:copy.deepcopy(event['result'][k]) for k in RESULT if k in event['result']}
    if result:row['result']=result
   if owner!=actor and kind=='resolve_board_ability' and event.get('source_reference')=='72-companion-26-card-text-draft.md#C-bat':
    target=event.get('result',{}).get('target_instance_id');before=boundaries.get(seq-1);public=False
    if before is not None:
     if 'envelope_before_sha256' in event and event['envelope_before_sha256']!=digest(before):raise ValueError('allowed history preparation boundary differs')
     prepared=before['legacy_continuation']['game_state']['players'][owner]['board']['prepared']
     public=target in prepared and before['runtime']['public_prepared'].get(target,{}).get('face_up') is True
    if not public:
     for key in ('target_instance_id','returned_instance_id'):row.get('result',{}).pop(key,None)
   projected.append(row)
  if sequences!=sorted(set(sequences)):raise ValueError('allowed history event order differs')
  if canonical(inventory['public_history'])!=canonical(projected):raise ValueError('allowed history projection differs')
 except (ValueError,KeyError,TypeError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='current_normal_allowed_history.v1',allowed_history_projection_verified=not errors,errors=errors,
  actor=actor,entry_envelope_sha256=digest(envelope),raw_history_sha256=digest(events),projected_history_sha256=digest(projected),
  event_count=len(events),source_sha256=dict(SOURCES),scope='supplied_actual_history_to_normal_inventory_only',
  raw_history_origin_authenticated=False,all_information_use_proven=False,policy_eligible=None,balance_admitted=None)
