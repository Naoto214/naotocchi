import sys,json,hashlib,collections,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[4];DATA=ROOT/'docs/card-game/data';sys.path.insert(0,str(ROOT/'docs/card-game/tools'))
import proxy_start_response_138 as start
paths=sorted(subprocess.check_output(['git','ls-files','docs/card-game/data'],cwd=ROOT).decode().splitlines())
final=json.loads((DATA/'proxy-new-seed-mixed-replay-408-20260930.json').read_text())
route_ids=sorted(r['path_id'] for r in final['results']);evs={p:{} for p in route_ids};shots={p:{} for p in route_ids};decisions={p:{} for p in route_ids};inputs={};all_reports=[];aliases=[]
def rawhash(raw):return hashlib.sha256(raw).hexdigest()
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
for name in paths:
 if not name.endswith('.json') or pathlib.Path(name).parent!=pathlib.Path('docs/card-game/data'):continue
 raw=(ROOT/name).read_bytes();d=json.loads(raw)
 if not isinstance(d,dict):continue
 # 251 existing history rule omits241, superseded by immutable correction242.
 if pathlib.Path(name).name=='proxy-new-seed-followup-replay-241-20260926.json':continue
 all_reports.append((name,d))
 for r in d.get('results',[]):
  p=r.get('path_id')
  if p not in route_ids:continue
  es=r.get('new_events',r.get('events',[]));ss=r.get('new_snapshots',r.get('snapshots',[]))
  if es==0:es=[]
  if ss==0:ss=[]
  if not isinstance(es,list) or not isinstance(ss,list) or not (es or ss):continue
  inputs[name]=rawhash(raw)
  for e in es:
   seq=e['seq']
   if seq in evs[p]:
    old=evs[p][seq]
    if old['event']!=e:raise ValueError(f'conflicting event alias {p}:{seq}')
    old['source_refs'].append(name);aliases.append({'path_id':p,'event_seq':seq,'source_refs':old['source_refs'][:]})
   else:evs[p][seq]={'event':e,'source_refs':[name]}
  for s in ss:
   seq=s.get('event_seq',s.get('seq'));game=s.get('game_state',s.get('state'));gh=s.get('game_state_sha256',s.get('state_sha256'));cont=s.get('continuation_state');ch=s.get('continuation_state_sha256')
   if start.opening._stop_state_sha256(game)!=gh:raise ValueError(f'game hash mismatch {p}:{seq}')
   if cont is not None and (cont['game_state']!=game or start.canonical_sha256(cont)!=ch):raise ValueError(f'continuation hash mismatch {p}:{seq}')
   normalized={'game_state':game,'game_state_sha256':gh,'continuation_state':cont,'continuation_state_sha256':ch,'source_refs':[name]}
   if seq in shots[p]:
    old=shots[p][seq]
    if start.opening._canonical_stop_state(old['game_state'])!=start.opening._canonical_stop_state(game) or old['game_state_sha256']!=gh:raise ValueError(f'game snapshot alias mismatch {p}:{seq}')
    if cont is not None and old['continuation_state'] is not None and old['continuation_state']!=cont:raise ValueError('continuation alias mismatch')
    normalized['source_refs']=old['source_refs']+[name]
    if cont is None:normalized['game_state']=old['game_state'];normalized['continuation_state']=old['continuation_state'];normalized['continuation_state_sha256']=old['continuation_state_sha256']
   shots[p][seq]=normalized
  for x in (r.get('new_decisions',r.get('decisions',[])) if es else []):
   h=rawhash(canonical(x))
   if h not in decisions[p]:decisions[p][h]={'decision':x,'source_refs':[]}
   decisions[p][h]['source_refs'].append(name)
# Gather candidate evidence from already saved audits, retaining exact boundary keys.
proofs=collections.defaultdict(list)
def walk(v,path=None,name=None):
 if isinstance(v,dict):
  path=v.get('path_id',path)
  game=v.get('source_game_state_sha256',v.get('pre_game_state_sha256'));cont=v.get('source_continuation_state_sha256',v.get('pre_continuation_state_sha256'));seq=v.get('source_last_valid_event_seq',v.get('event_seq'))
  candidates=v.get('candidate_ids',v.get('legal_candidate_ids',v.get('legal_candidates')))
  if path in route_ids and isinstance(candidates,list) and game and cont and isinstance(seq,int):
   proofs[(path,game,cont,seq)].append((candidates,name))
  for child in v.values():walk(child,path,name)
 elif isinstance(v,list):
  for child in v:walk(child,path,name)
for name,d in all_reports:
 walk(d,name=name)
 for row in d.get('results',[]):
  inline=row.get('response_audit')
  if isinstance(inline,dict) and isinstance(inline.get('candidate_ids'),list) and row.get('path_id') in route_ids:
   key=(row['path_id'],row['source_game_state_sha256'],row['source_continuation_state_sha256'],row['source_last_valid_event_seq'])
   proofs[key].append((inline['candidate_ids'],name))
rows=[]
for r in final['results']:
 p=r['path_id'];last=r['last_valid_event_seq'];events=evs[p];snapshots=shots[p]
 if set(events)!=set(range(1,last+1)) or set(snapshots)!=set(range(last+1)):raise ValueError('full coverage mismatch')
 event_types=collections.Counter();activations=collections.Counter();hand_uses=collections.Counter();board_uses=collections.Counter();end_time=[];growth_changes=[];played_main=[];reservation_peak=0;transitions=[]
 for seq in range(1,last+1):
  e=events[seq]['event'];before=snapshots[seq-1];after=snapshots[seq]
  gh_before=e.get('game_state_before_sha256',e.get('state_before_sha256'));gh_after=e.get('game_state_after_sha256',e.get('state_after_sha256'))
  if (gh_before,gh_after)!=(before['game_state_sha256'],after['game_state_sha256']):raise ValueError('event game chain mismatch')
  if 'continuation_state_before_sha256' in e and (e['continuation_state_before_sha256'],e['continuation_state_after_sha256'])!=(before['continuation_state_sha256'],after['continuation_state_sha256']):raise ValueError(f'continuation chain mismatch {p}:{seq}:event={events[seq]}:before_refs={before["source_refs"]}')
  kind=e['action_type'];event_types[kind]+=1;game=after['game_state'];prior=before['game_state']
  if game['round']>10:raise ValueError('R11 present')
  for actor,player in game['players'].items():
   if player['board']['main'] is not None:played_main.append({'seq':seq,'actor':actor,'instance_id':player['board']['main']})
   reservation_peak=max(reservation_peak,len(player['reservations']))
  transitions.extend(e.get('instance_transitions',[]))
  if kind in ('turn_end_completed','r10_final_comparison'):
   actor=e['actor'];end_time.append({'event_seq':seq,'round':prior['round'],'actor':actor,'unused_time':prior['players'][actor]['time']})
  old={a:prior['players'][a]['growth'] for a in 'AB'};new={a:game['players'][a]['growth'] for a in 'AB'}
  if old!=new:growth_changes.append({'event_seq':seq,'action_type':kind,'actor':e.get('actor'),'source_instance_id':e.get('source_instance_id'),'growth_before':old,'growth_after':new,'source_refs':events[seq]['source_refs']})
  if kind=='activate_response':
   source=e.get('source_instance_id');link=after['continuation_state']['activation_zone'][-1]
   if source is None:source=link['source_instance_id']
   card=game['cards'][source]['card_id'];zone=link.get('source_zone','hand')
   activations[card]+=1
   if source in prior['players'][e['actor']]['hand']:hand_uses[card.split('-')[0]]+=1
   else:board_uses[card]+=1
  if kind in ('place_companion','place_partner'):
   card=game['cards'][e['source_instance_id']]['card_id'];hand_uses[card.split('-')[0]]+=1
 if played_main:raise ValueError('nonempty main requires broader audit; do not infer zero')
 modes=collections.Counter();counts=[];unmatched=[];forced=[]
 for h,record in decisions[p].items():
  d=record['decision'];modes[d.get('resolution_mode','unlabelled')]+=1
  if d.get('decision_kind')=='chain_resolution':
   forced.append({'decision_sha256':h,'event_seq':d.get('event_seq'),'source_refs':record['source_refs']});continue
  c=d.get('legal_candidates',d.get('legal_candidate_ids',d.get('candidate_ids')))
  refs=record['source_refs'][:];kind=d.get('decision_kind');seq=d.get('event_seq');gh=d.get('pre_game_state_sha256');ch=d.get('pre_continuation_state_sha256')
  if not isinstance(c,list):
   found=proofs.get((p,gh,ch,seq),[])
   sets={tuple(v) for v,_ in found}
   if len(sets)==1:c=list(next(iter(sets)));refs+=sorted({n for _,n in found})
   elif len(sets)>1:raise ValueError('candidate evidence conflicts at exact boundary')
  if isinstance(c,list):
   selected=d['selected_candidate']
   if selected not in c:raise ValueError(f'selected candidate not in observed list {p}:{seq}:{selected}:{c}:refs={refs}')
   counts.append({'decision_sha256':h,'decision_kind':kind,'resolution_mode':d.get('resolution_mode'),'event_seq':seq,'candidate_count':len(c),'candidate_ids':c,'selected_candidate':selected,'source_refs':sorted(set(refs))})
  else:unmatched.append({'decision_sha256':h,'decision_kind':kind,'resolution_mode':d.get('resolution_mode'),'event_seq':seq,'source_refs':refs})
 terminal=snapshots[last]
 if terminal['game_state']!=r['final_continuation_state']['game_state'] or terminal['continuation_state']!=r['final_continuation_state']:raise ValueError('final snapshot mismatch')
 rows.append({'path_id':p,'last_event_seq':last,'event_count':len(events),'snapshot_count':len(snapshots),'event_types':dict(event_types),'unique_saved_decision_count':len(decisions[p]),'resolution_modes':dict(modes),'candidate_cardinalities':counts,'candidate_cardinality_unresolved_records':unmatched,'forced_resolution_records_not_choice_opportunities':forced,'normal_decision_candidate_counts':[c['candidate_count'] for c in counts if c['decision_kind']=='normal_action'],'hand_play_by_prefix':{x:hand_uses[x] for x in ['M','C','P','W','G','I','E']},'response_activation_by_card':dict(activations),'board_ability_activations_by_card':dict(board_uses),'turn_end_unused_time':end_time,'growth_changes':growth_changes,'main_nonempty_snapshot_count':0,'normal_challenge_event_count':sum(n for k,n in event_types.items() if 'challenge' in k),'reservation_max_per_actor':reservation_peak,'explicit_instance_transitions':transitions,'final_result':r['result'],'seeded_fallback_trace_count':sum(n for k,n in modes.items() if 'seeded_fallback' in k),'terminal_stop_reason_code':r['stop_reason_code'],'independent_balance_sample_count':r['balance_sample_count']})
# Count birth opportunities from the already resolved explicit candidate arrays.
for row in rows:
 normal=[c for c in row['candidate_cardinalities'] if c['decision_kind']=='normal_action']
 birth=[c for c in normal if any(x.endswith('-birth') for x in c['candidate_ids'])]
 row['legal_birth_opportunity_count']=len(birth)
 row['birth_selected_count']=sum(c['selected_candidate'].endswith('-birth') for c in normal)
 row['legal_birth_pass_selected_count']=sum(c['selected_candidate']=='pass' for c in birth)
 row['legal_birth_person_placement_selected_count']=sum(c['selected_candidate'].startswith(('candidate-place-companion-','candidate-place-partner-')) for c in birth)
# Preserve and independently validate the six unplayed fixtures without creating states.
import proxy_gap_fixture_builder as gaps
plan=gaps.load_json(gaps.DEFAULT_PLAN);fixtures=gaps.build_gap_fixtures(plan);gap_rows=[]
for fixture in fixtures:
 name='docs/card-game/data/proxy-gap-fixtures-112/'+gaps.fixture_filename(fixture);saved=json.loads((ROOT/name).read_text())
 if saved!=fixture or saved['record']['status']!='fixture' or saved['record']['events'] or saved['record']['result']['winner'] is not None:raise ValueError('112 unplayed fixture changed')
 gap_rows.append({'fixture_id':saved['match_id'],'source_ref':name,'raw_sha256':rawhash((ROOT/name).read_bytes()),'status':'fixture','event_count':0,'winner':None})
for row in rows:
 for entry in row['candidate_cardinalities']:
  for name in entry['source_refs']:inputs[name]=rawhash((ROOT/name).read_bytes())
report={'schema':'naotocchi.card_game.completed_batch_observation_412.v1','source_head':'1fef866bfa7ed46c528f1c0d2fef5d8f45abfa4b','source_tree':'4b9019d1c85592a9c22a1ba0963d45cb6b35c04f','scope':'read_only_observation_of_saved_137_to_408_batch','new_matches':0,'new_events':0,'new_decisions':0,'independent_balance_sample_count':0,'source_raw_sha256':inputs,'superseded_history_exclusions':[{'source_ref':'docs/card-game/data/proxy-new-seed-followup-replay-241-20260926.json','reason_ref':'docs/card-game/242-new-seed-followup-correction.md','existing_history_rule_ref':'docs/card-game/tools/proxy_new_seed_turn_end_proof_251.py','adopted_source_ref':'docs/card-game/data/proxy-new-seed-followup-replay-242-20260926.json'}],'identical_event_aliases':aliases,'results':rows,'unplayed_112_fixtures':gap_rows,'limitations':['descriptive observations only; seeded fallback matches excluded from balance evidence','candidate counts restored only from explicit arrays or audits at matching game/continuation/seq boundary; unresolved records are not invented','zero main/challenge observations do not establish optimal strategy or card strength','no new policy, card text, input fixture or match execution']}
out=DATA/'proxy-completed-batch-observation-412-20261001.json';out.write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
print('saved',out)
for r in rows:print(r['path_id'],r['event_count'],r['unique_saved_decision_count'],r['resolution_modes'],'candidate_unknown',len(r['candidate_cardinality_unresolved_records']),'handplays',r['hand_play_by_prefix'],'growth',r['growth_changes'],'unusedend',len(r['turn_end_unused_time']))
