"""475 approved A, opt-in before event/hash construction; no new decisions."""
import copy,hashlib
from contextlib import contextmanager
import proxy_continuation_batch as batch
from proxy_mandatory_policy_contract import ROOT,canonical
SOURCE='475-person-equipment-departure-order.md'
SOURCE_SHA='bb6789a54b31f8d9b425141b1ecf1a4828376463c9db6df6d84a461ecc649b40'
ENABLED=False

def plan(before,target,destination):
 if hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('departure order source changed')
 if destination not in ('discard','deck','hand'):raise ValueError('departure destination unsupported')
 g=before['legacy_continuation']['game_state'];owners=[]
 for actor,p in g['players'].items():
  if target in [p['board']['main'],p['board']['partner']]+p['board']['companions']:owners.append(actor)
 if len(owners)!=1:raise ValueError('departure person origin ambiguous')
 actor=owners[0];p=g['players'][actor];attached={s for s,r in before['runtime']['attachments'].items() if r['target_instance_id']==target}
 gear=[s for s in p['board']['prepared'] if s in attached]
 if len(gear)!=len(attached) or len(set(gear))!=len(gear):raise ValueError('departure prepared snapshot differs')
 for s in gear:
  r=before['runtime']['attachments'][s];public=before['runtime']['public_prepared'][s]
  if r['controller']!=actor or public['controller']!=actor or public['face_up'] is not True:raise ValueError('departure equipment owner/public relation differs')
 movements=[dict(ordinal=0,instance_id=target,owner=actor,from_zone='board',to_zone=destination)]
 movements += [dict(ordinal=i+1,instance_id=s,owner=actor,from_zone='prepared',to_zone='discard') for i,s in enumerate(gear)]
 return dict(contract='person_equipment_departure_order_475',source_reference=SOURCE,source_sha256=SOURCE_SHA,movements=movements,discard_additions={owner:(([target] if destination=='discard' else [])+gear if owner==actor else []) for owner in ('A','B')})

def receipt(before,after):
 g=before['legacy_continuation']['game_state'];h=after['legacy_continuation']['game_state'];departed=[]
 for actor,p in g['players'].items():
  q=h['players'][actor];field=[q['board']['main'],q['board']['partner']]+q['board']['companions']
  for target in [p['board']['main'],p['board']['partner']]+p['board']['companions']:
   if target is not None and target not in field:departed.append((actor,target))
 if not departed:return None
 if len(departed)!=1:raise ValueError('multiple person departure order unproved')
 actor,target=departed[0];dest=[z for z in ('discard','hand','deck') if target in h['players'][actor][z]]
 if len(dest)!=1:raise ValueError('departure destination ambiguous')
 return plan(before,target,dest[0])

def prepare(before,after):
 if not ENABLED:return None
 result=receipt(before,after)
 if result is None:return None
 g=before['legacy_continuation']['game_state'];h=after['legacy_continuation']['game_state']
 for owner,items in result['discard_additions'].items():
  prefix=g['players'][owner]['discard'];actual=h['players'][owner]['discard']
  # Never silently repair conservation, a prior prefix, or unrelated movement.
  if actual[:len(prefix)]!=prefix or sorted(actual[len(prefix):])!=sorted(items):raise ValueError('departure order input conservation differs')
  h['players'][owner]['discard']=prefix+items
 return result

def audit(before,after,event):
 errors=[]
 try:
  wanted=receipt(before,after)
  if wanted is not None:
   if canonical(event.get('departure_order'))!=canonical(wanted):raise ValueError('departure ordered receipt differs')
   for owner,items in wanted['discard_additions'].items():
    if after['legacy_continuation']['game_state']['players'][owner]['discard']!=before['legacy_continuation']['game_state']['players'][owner]['discard']+items:raise ValueError('departure discard order differs')
  elif 'departure_order' in event:raise ValueError('spurious departure receipt')
 except (ValueError,KeyError,TypeError,AttributeError,OSError) as exc:errors.append(str(exc))
 return errors

@contextmanager
def scope():
 global ENABLED
 if ENABLED:raise ValueError('departure order scope reentry forbidden')
 prior=batch._event
 def event(before,after,action,proof,kind):
  ordered=prepare(before,after);result=prior(before,after,action,proof,kind)
  if ordered is not None:result['departure_order']=ordered
  return result
 try:
  ENABLED=True;batch._event=event
  yield
 finally:batch._event=prior;ENABLED=False
