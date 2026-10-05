"""Pure supplied-material transcript: never samples OS entropy or starts games."""
import copy,hashlib
from proxy_mandatory_policy_contract import canonical
from proxy_normal_decision_first_choice_audit import shuffle_deck
class Cursor:
 def __init__(self,registry,decks,*,group_count=200):
  if type(group_count) is not int or not 1<=group_count<=200:raise ValueError('group count')
  if set(decks)!={'A','B'} or any(len(decks[p])!=40 for p in decks):raise ValueError('decks')
  seeds=registry['known_shuffle_seeds']
  if any(type(s) is not int or not 0<=s<2**128 for s in seeds):raise ValueError('historical seeds')
  self.known=set(seeds);self.pairs={p['order_pair_sha256'] for p in registry['order_pairs']};self.decks=copy.deepcopy(decks);self.count=group_count
  self.calls=[];self.attempts=[];self.groups=[];self.roots=[];self.pending=None
 def request(self):
  if len(self.groups)<self.count:purpose='initial_shuffle_seed';group=len(self.groups)+1;owner='A' if self.pending is None else 'B';size=16
  elif len(self.roots)<2*self.count:purpose='mandatory_policy_root';group=len(self.roots)//2+1;owner=('A','B')[len(self.roots)%2];size=32
  else:return None
  return dict(call_index=len(self.calls)+1,purpose=purpose,group_index=group,owner=owner,byte_count=size)
 def supply(self,raw):
  request=self.request()
  if request is None or type(raw) is not bytes or len(raw)!=request['byte_count']:raise ValueError('material length/type or complete')
  # Journals are append-only; isolate their list containers, not every prior deck.
  next_state=copy.copy(self)
  for name in ('calls','attempts','groups','roots'):setattr(next_state,name,list(getattr(self,name)))
  next_state._consume(request,raw);self.__dict__.update(next_state.__dict__)
 def _consume(self,request,raw):
  self.calls.append(dict(request,raw_hex=raw.hex()))
  if request['purpose']=='mandatory_policy_root':self.roots.append(dict(group_index=request['group_index'],owner=request['owner'],root_hex=raw.hex(),call_index=request['call_index']));return
  seed=int.from_bytes(raw,'big')
  if request['owner']=='A':self.pending=seed;return
  a,b=self.pending,seed;self.pending=None;reasons=[];kind=None;orders=None;digest=None
  if a==b:reasons.append('within_pair_equal_seeds')
  if a in self.known or b in self.known:reasons.append('fixed_historical_seed_or_order_pair_registry_match');kind='seed'
  if not reasons:
   orders={p:shuffle_deck(self.decks[p],s) for p,s in [('A',a),('B',b)]};digest=hashlib.sha256(canonical(orders)).hexdigest()
   if digest in self.pairs:reasons.append('fixed_historical_seed_or_order_pair_registry_match');kind='order_pair'
  attempt=dict(attempt_index=len(self.attempts)+1,group_index=request['group_index'],seed_A=a,seed_B=b,call_indices=[request['call_index']-1,request['call_index']],disposition='rejected' if reasons else 'accepted',reason_codes=reasons,order_pair_checked=orders is not None,order_pair_sha256=digest,historical_match_kind=kind)
  self.attempts.append(attempt)
  if not reasons:self.groups.append(dict(group_index=request['group_index'],attempt_index=attempt['attempt_index'],seed_A=a,seed_B=b,full_order_A=orders['A'],full_order_B=orders['B'],order_pair_sha256=digest))
 def record(self):
  return copy.deepcopy(dict(schema='population-material-transcript-v1',group_count=self.count,calls=self.calls,attempts=self.attempts,groups=self.groups,policy_roots=self.roots,complete=self.request() is None,pending_initial_seed_owner='B' if self.pending is not None else ('A' if len(self.groups)<self.count else None),policy_root_value_coincidences=len(self.roots)-len({r['root_hex'] for r in self.roots}),provenance_verified=False,entropy_bytes_sampled_by_this_module=0,preflight_ready=False,balance_admitted=None))
def audit_material_record(record,registry,decks,*,group_count=200):
 try:
  cursor=Cursor(registry,decks,group_count=group_count)
  if type(record) is not dict or type(record.get('calls')) is not list:raise ValueError('transcript shape')
  for call in record['calls']:
   if type(call) is not dict:raise ValueError('call shape')
   request=cursor.request()
   if request is None or canonical({k:v for k,v in call.items() if k!='raw_hex'})!=canonical(request):raise ValueError('call binding')
   cursor.supply(bytes.fromhex(call['raw_hex']))
  valid=canonical(record)==canonical(cursor.record())
 except (ValueError,KeyError,TypeError,OverflowError):valid=False
 return dict(material_consistent=valid,provenance_verified=False,preflight_ready=False,balance_admitted=None)

def binding_errors(bundle,record):
 """Conditional binding only; callers still need full465 and transcript checks."""
 errors=[]
 try:
  if len(bundle['groups'])!=len(record['groups']):raise ValueError('group coverage')
  roots={(r['group_index'],r['owner']):r['root_hex'] for r in record['policy_roots']}
  for index,(group,material) in enumerate(zip(bundle['groups'],record['groups']),1):
   for field in ('seed_A','seed_B','full_order_A','full_order_B'):
    if canonical(group[field])!=canonical(material[field]):raise ValueError('group material differs')
   if group['generation_attempt_ref']!='material-attempt-'+str(material['attempt_index']):raise ValueError('attempt reference differs')
   for owner in 'AB':
    if bundle['policy_roots'][group['group_id']][owner]!=roots[index,owner]:raise ValueError('root binding differs')
 except (ValueError,TypeError,KeyError) as error:errors.append(str(error))
 return errors

def audit_population_material(bundle,record):
 """Fixed200/400 supplied material, never OS provenance or execution authority."""
 from proxy_population_input_history import build_cutoff_registry
 from proxy_mandatory_population_input import audit_input_bundle
 from proxy_population_contract import ROOT,load_json
 errors=[]
 try:
  if not audit_input_bundle(bundle)['structure_verified']:raise ValueError('bundle structure differs')
  registry=build_cutoff_registry()
  if not registry['registry_verified']:raise ValueError('historical registry gaps')
  if bundle['historical_registry_sha256']!=hashlib.sha256(canonical(registry)).hexdigest():raise ValueError('historical registry binding')
  fixture=load_json(ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  decks={p['player_id']:p['deck_order_top_to_bottom'] for p in fixture['input']['players']}
  if not audit_material_record(record,registry,decks,group_count=200)['material_consistent'] or record.get('complete') is not True:raise ValueError('complete material transcript required')
  if canonical(bundle['generation_provenance'])!=canonical(dict(material_transcript_sha256=hashlib.sha256(canonical(record)).hexdigest())):raise ValueError('transcript reference differs')
  errors+=binding_errors(bundle,record)
 except (ValueError,KeyError,TypeError,OSError) as error:errors.append(str(error))
 return dict(material_binding_verified=not errors,errors=errors,provenance_verified=False,input_lock_verified=False,ready_for_execution=False,balance_admitted=None,scope='supplied_transcript_and_repository_historical_input_scope_only')
