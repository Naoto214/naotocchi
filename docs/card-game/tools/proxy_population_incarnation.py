"""Conditional100/105 lifecycle; no movement legality or input authentication.

Native movement is a prerequisite. Old effects and reservations never migrate.
"""
import copy,hashlib
from proxy_mandatory_policy_contract import canonical,ROOT
from proxy_record_validator import INSTANCE_RE

def digest(value):return hashlib.sha256(canonical(value)).hexdigest()
def game(e):return e['legacy_continuation']['game_state']
def field(g):
 result=[]
 for p in g['players'].values():
  b=p['board'];result.extend(b['companions']+b['prepared']);result.extend(b[k] for k in ('main','partner','world') if b[k] is not None)
 return result

def located(e):
 result=field(game(e))
 for p in game(e)['players'].values():
  for zone in ('hand','deck','discard'):result.extend(p[zone])
 for link in e['legacy_continuation']['activation_zone']:
  zone=link.get('source_zone')
  # Historical native hand activations predate source_zone. Their explicit
  # action family identifies the moving source; absent arbitrary kinds fail.
  if zone is None:
   if link.get('action_type') not in ('use_item','use_play','use_event'):raise ValueError('activation physical source zone unproved')
   zone='hand'
  if zone not in ('board','hand','prepared'):raise ValueError('activation physical source zone unknown')
  if zone!='board':result.append(link['source_instance_id'])
 if len(result)!=len(set(result)):raise ValueError('duplicate physical location')
 return result

def identities(cards):
 result={}
 for source,card in cards.items():
  match=INSTANCE_RE.fullmatch(source)
  if not match or card['card_copy_id']!=match.group(1) or card['initial_instance_id']!=match.group(1)+'#1':raise ValueError('incarnation identity differs')
  result[source]=match.group(1)
 return result

def check(record,e):
 cards=game(e)['cards'];ids=identities(cards)
 if canonical(cards)!=canonical(record['metadata']):raise ValueError('immutable metadata differs')
 if set(located(e))!=set(record['active'].values()):raise ValueError('active physical conservation differs')
 if any(ids[s]!=c for c,s in record['active'].items()):raise ValueError('active physical mapping differs')

def create(e):
 cards=game(e)['cards'];ids=identities(cards)
 if any(not s.endswith('#1') for s in cards) or len(set(ids.values()))!=len(ids):raise ValueError('initial incarnation history unknown')
 record=dict(schema='conditional_physical_lifecycle.v1',source_sha256={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ('100-card-copy-and-instance-identity.md','105-p97-05-reentry-pilot.md')},metadata=copy.deepcopy(cards),active={c:s for s,c in ids.items()},seen_field=sorted({ids[s] for s in field(game(e))}),current_envelope_sha256=digest(e),origin_authenticated=False)
 check(record,e);return record

def observe(record,before,after,transitions):
 if record['current_envelope_sha256']!=digest(before):raise ValueError('lifecycle state binding differs')
 check(record,before);out=copy.deepcopy(record);oldfield=set(field(game(before)));entries=set(field(game(after)))-oldfield;expected=[]
 for source in sorted(entries):
  meta=game(after)['cards'][source];physical=meta['card_copy_id'];prior=record['active'].get(physical)
  if prior is None:raise ValueError('unknown entering physical copy')
  if physical in record['seen_field']:
   successor=physical+'#'+str(int(INSTANCE_RE.fullmatch(prior).group(2))+1)
   if source!=successor or source in record['metadata'] or prior in oldfield:raise ValueError('unrecorded or invalid field reentry')
   if canonical(meta)!=canonical(record['metadata'][prior]):raise ValueError('reentry changed physical definition')
   expected.append(dict(card_copy_id=physical,from_instance_id=prior,to_instance_id=successor,reason='zone_change'));out['metadata'][successor]=copy.deepcopy(meta);out['active'][physical]=successor
  elif source!=prior:raise ValueError('first entry cannot advance generation')
  if physical not in out['seen_field']:out['seen_field'].append(physical)
 if type(transitions) is not list or canonical(sorted(transitions,key=lambda r:r['card_copy_id']))!=canonical(sorted(expected,key=lambda r:r['card_copy_id'])):raise ValueError('transition receipt differs')
 out['seen_field'].sort();check(out,after);out['current_envelope_sha256']=digest(after);return out

def rebind_entry(record,before,native_after,source):
 if record['current_envelope_sha256']!=digest(before):raise ValueError('entry state binding differs')
 check(record,before);g=game(before);physical=g['cards'][source]['card_copy_id']
 if source!=record['active'].get(physical) or source in field(g) or source not in field(game(native_after)):raise ValueError('not an actual field entry')
 if canonical(game(native_after)['cards'])!=canonical(g['cards']):raise ValueError('native movement changed card definitions')
 result=copy.deepcopy(native_after)
 if physical not in record['seen_field']:return result,[]
 successor=physical+'#'+str(int(INSTANCE_RE.fullmatch(source).group(2))+1)
 if successor in g['cards']:raise ValueError('successor already used')
 game(result)['cards'][successor]=copy.deepcopy(g['cards'][source])
 for p in game(result)['players'].values():
  b=p['board']
  for k in ('main','partner','world'):
   if b[k]==source:b[k]=successor
  for k in ('companions','prepared'):b[k]=[successor if x==source else x for x in b[k]]
 for key in ('attachments','public_prepared'):
  rows=result['runtime'][key]
  if source in rows:rows[successor]=rows.pop(source)
 return result,[dict(card_copy_id=physical,from_instance_id=source,to_instance_id=successor,reason='zone_change')]

def project_game(record,full_game):
 if canonical(full_game['cards'])!=canonical(record['metadata']):raise ValueError('full metadata differs')
 result=copy.deepcopy(full_game);result['cards']={s:copy.deepcopy(full_game['cards'][s]) for s in record['active'].values()};return result

def restore_game(record,full_before,projected_after):
 if canonical(projected_after['cards'])!=canonical(project_game(record,full_before)['cards']):raise ValueError('local choice changed active identities')
 result=copy.deepcopy(projected_after);result['cards']=copy.deepcopy(full_before['cards']);return result
