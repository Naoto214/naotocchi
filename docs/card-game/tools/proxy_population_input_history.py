"""Historical input registry bounded to immutable468 published repository sources.

Not a proof about arbitrary Python, external inputs or development never saved.
No OS entropy sampling, matches or retrospective eligibility changes.
"""
import ast,copy,gzip,hashlib,json,subprocess
from pathlib import Path
from proxy_mandatory_policy_contract import canonical
from proxy_population_contract import source_path,_pairs,_nonfinite
ROOT=Path(__file__).resolve().parents[1]
CUTOFF='a5a475f0f3e495754f14f040c1c0a8e75e33f3d9'
FIELDS={'card_id','card_copy_id','initial_instance_id'}

def collect(document,source):
 pairs={};seeds={a:set() for a in 'AB'};seed_sources=[];gaps=[]
 def seed(value,owner,where):
  if type(owner) is not str or owner not in seeds or type(value) is not int or not 0<=value<2**128:gaps.append(where+': malformed/unowned seed');return
  seeds[owner].add(value);seed_sources.append(dict(owner=owner,seed=value,source=where))
 def walk(node,pointer):
  if isinstance(node,list):
   for i,v in enumerate(node):walk(v,pointer+'/'+str(i))
  elif isinstance(node,dict):
   if 'seed' in node:seed(node['seed'],node.get('player_id'),pointer+'/seed')
   if 'shuffle_seed_by_player' in node:
    values=node['shuffle_seed_by_player']
    if type(values) is not dict or set(values)!={'A','B'}:gaps.append(pointer+': seed owner map')
    else:
     for owner,value in values.items():seed(value,owner,pointer+'/shuffle_seed_by_player/'+owner)
   if 'deck_order_top_to_bottom' in node:
    order=node['deck_order_top_to_bottom']
    valid=type(order) is list and len(order)==40 and all(type(c) is dict and set(c)==FIELDS and all(type(v) is str and v for v in c.values()) for c in order)
    if valid:valid=all(len({c[k] for c in order})==40 for k in ('card_copy_id','initial_instance_id'))
    if not valid:gaps.append(pointer+': incomplete or invalid physical order')
   players=node.get('players')
   if type(players) is list and any(type(p) is dict and 'deck_order_top_to_bottom' in p for p in players):
    if len(players)!=2 or any(type(p) is not dict or type(p.get('player_id')) is not str or 'deck_order_top_to_bottom' not in p for p in players) or {p['player_id'] for p in players}!={'A','B'}:gaps.append(pointer+': incomplete owner pair')
    else:
     orders={p['player_id']:p['deck_order_top_to_bottom'] for p in players}
     if all(type(o) is list and len(o)==40 and all(type(c) is dict and set(c)==FIELDS and all(type(v) is str and v for v in c.values()) for c in o) for o in orders.values()):
      combined=orders['A']+orders['B']
      if any(len({c[k] for c in combined})!=80 for k in ('card_copy_id','initial_instance_id')):gaps.append(pointer+': cross-owner identity collision')
      else:
       digest=hashlib.sha256(canonical(orders)).hexdigest()
       row=pairs.setdefault(digest,dict(order_pair_sha256=digest,orders=copy.deepcopy(orders),source_locations=[]));row['source_locations'].append(pointer+'/players')
   for k,v in node.items():walk(v,pointer+'/'+str(k).replace('~','~0').replace('/','~1'))
 if not (type(document) is dict and str(document.get('$schema','')).startswith('https://json-schema.org/') and document.get('type')=='object' and type(document.get('properties')) is dict):walk(document,source+'#')
 return dict(order_pairs=[pairs[k] for k in sorted(pairs)],known_seeds={a:sorted(seeds[a]) for a in 'AB'},seed_sources=seed_sources,gaps=gaps)

def catalog_at_cutoff(root=ROOT):
 repo=Path(root).parents[1]
 raw=subprocess.check_output(['git','--no-replace-objects','-C',str(repo),'ls-tree','-r','-z',CUTOFF,'docs/card-game'])
 records={};code={}
 for entry in raw.split(b'\0'):
  if not entry:continue
  meta,name=entry.split(b'\t');mode,kind,blob=meta.decode().split();name=name.decode().removeprefix('docs/card-game/')
  selected=(name.startswith('data/') and (name.endswith('.json') or name.endswith('.json.gz'))) or name.endswith('.py')
  if not selected:continue
  body=source_path(root,name).read_bytes()
  if kind!='blob' or mode!='100644' or hashlib.sha1(b'blob '+str(len(body)).encode()+b'\0'+body).hexdigest()!=blob:raise ValueError('cutoff source differs: '+name)
  record=dict(git_blob=blob,sha256=hashlib.sha256(body).hexdigest())
  (code if name.endswith('.py') else records)[name]=record
 return dict(cutoff_commit=CUTOFF,cutoff_tree=subprocess.check_output(['git','--no-replace-objects','-C',str(repo),'rev-parse',CUTOFF+'^{tree}']).decode().strip(),data_sources=records,code_sources=code)

CALLS={'shuffle','shuffle_deck','Random','SystemRandom','randbits','getrandbits','urandom','token_bytes','randint','randrange','choice','choices','sample','seed'}
ALLOWED={
 ('proxy_independent_seed_probe.py','build_manifest','shuffle_deck'),
 ('proxy_independent_seed_probe.py','_check_route','shuffle_deck'),
 ('proxy_normal_decision_first_choice_audit.py','shuffle_deck','shuffle'),
 ('proxy_normal_decision_first_choice_audit.py','shuffle_deck','Random'),
 ('proxy_normal_decision_first_choice_audit.py','build_first_choice_plan','shuffle_deck'),
 ('proxy_population_contract.py','validate_order','shuffle_deck'),
 ('test_proxy_independent_seed_probe.py','test_opening_handler_accepts_independent_future_manifest','shuffle_deck')}

def audit_constructors(catalog,root=ROOT):
 calls=[]
 for name,record in catalog['code_sources'].items():
  body=source_path(root,name).read_bytes()
  if hashlib.sha256(body).hexdigest()!=record['sha256']:raise ValueError('code fingerprint changed')
  tree=ast.parse(body);aliases={n.asname or n.name:n.name for node in ast.walk(tree) if isinstance(node,ast.ImportFrom) for n in node.names}
  def walk(node,scope='module'):
   if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):scope=node.name
   if isinstance(node,ast.Call):
    fn=node.func;call=fn.attr if isinstance(fn,ast.Attribute) else aliases.get(fn.id,fn.id) if isinstance(fn,ast.Name) else None
    if call in CALLS:calls.append(dict(source=name,function=scope,call=call,line=node.lineno,ast_sha256=hashlib.sha256(ast.dump(node,include_attributes=False).encode()).hexdigest()))
   for child in ast.iter_child_nodes(node):walk(child,scope)
  walk(tree)
 actual={(Path(r['source']).name,r['function'],r['call']) for r in calls}
 if actual!=ALLOWED or len(calls)!=7:raise ValueError('unclassified direct sampling/shuffle constructors')
 return dict(calls=calls,direct_call_inventory_verified=True,arbitrary_program_completeness_claim=False)

def build_cutoff_registry(root=ROOT):
 catalog=catalog_at_cutoff(root);constructor=audit_constructors(catalog,root)
 fragments=[]
 def load(name):
  body=source_path(root,name).read_bytes()
  if hashlib.sha256(body).hexdigest()!=catalog['data_sources'][name]['sha256']:raise ValueError('data fingerprint changed')
  if name.endswith('.gz'):body=gzip.decompress(body)
  return json.loads(body,object_pairs_hook=_pairs,parse_constant=_nonfinite)
 for name in catalog['data_sources']:fragments.append(collect(load(name),name))
 # Source-pinned historical fixed test adds100 to135route0 seeds. Rebuild only
 # its initial material, not test.run_route or any game/choice/outcome.
 from proxy_normal_decision_first_choice_audit import shuffle_deck,build_first_choice_plan
 from proxy_independent_seed_probe import build_manifest
 source=load('data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
 old=load('data/proxy-independent-seed-probe-20260924.json')['manifest']
 if canonical(build_manifest(source))!=canonical(old):raise ValueError('135 constructor materialization differs')
 plan=build_first_choice_plan(load('data/proxy-normal-decision-admission-plan-113-20260918.json'),source)
 if canonical(plan)!=canonical(load('data/proxy-normal-decision-first-choice-plan-115-20260918.json')):raise ValueError('115 constructor materialization differs')
 route=copy.deepcopy(old['routes'][0]);decks={p['player_id']:p['deck_order_top_to_bottom'] for p in source['input']['players']}
 for p in route['players']:
  p['seed']+=100;p['deck_order_top_to_bottom']=shuffle_deck(decks[p['player_id']],p['seed'])
 fragments.append(collect(dict(players=route['players']),'derived/immutable135-test-seed-plus100'))
 pairs={};seeds={a:set() for a in 'AB'};gaps=[];locations=[]
 for fragment in fragments:
  gaps+=fragment['gaps'];locations+=fragment['seed_sources']
  for a in 'AB':seeds[a].update(fragment['known_seeds'][a])
  for p in fragment['order_pairs']:
   if p['order_pair_sha256'] in pairs:pairs[p['order_pair_sha256']]['source_locations']+=p['source_locations']
   else:pairs[p['order_pair_sha256']]=p
 return dict(schema='historical_population_input_registry_469.v1',source_catalog=catalog,constructor_audit=constructor,
  order_pairs=[pairs[k] for k in sorted(pairs)],known_seeds={a:sorted(seeds[a]) for a in 'AB'},known_shuffle_seeds=sorted(seeds['A']|seeds['B']),seed_sources=locations,gaps=gaps,
  registry_verified=not gaps,scope='published_explicit_input_records_and_audited_fixed_development_constructors_at468',
  outside_repository_coverage_claim=False,arbitrary_input_encoding_coverage_claim=False,entropy_bytes_sampled=0,balance_admitted=None)
