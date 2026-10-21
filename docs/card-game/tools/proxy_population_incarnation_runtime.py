"""Opt-in native field-entry finishing and retained-metadata conservation.

All roots are conditional. A cache contains local transitions, including native
hypothetical candidates, not evidence that those candidates were selected.
A full entry must separately replay the actually selected whole transcript.
"""
import copy
from contextlib import contextmanager
from threading import Lock
_SCOPE_LOCK=Lock()
import proxy_population_incarnation as life
import proxy_population_history_replay as history_replay
import proxy_population_instance_boundary as guard
import proxy_population_departure as departure
import proxy_continuation_actions as actions
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_continuation_end as end
import proxy_continuation_preparation as preparation
import proxy_continuation_quick as quick
import proxy_resource_value_trajectory as old
import proxy_response_window_contract as response_contract
import proxy_normal_action_seeded_restart as restart_122
from proxy_mandatory_policy_contract import canonical
LEGACY_VERIFY_STEP=restart_122._verify_step


def active_cards(cards):
 ids=life.identities(cards);groups={}
 for source,physical in ids.items():groups.setdefault(physical,[]).append(source)
 active={}
 for physical,instances in groups.items():
  generations=sorted(int(life.INSTANCE_RE.fullmatch(s).group(2)) for s in instances)
  if generations!=list(range(1,len(instances)+1)):raise ValueError('missing incarnation metadata generation')
  if any(life.digest(cards[s])!=life.digest(cards[physical+'#1']) for s in instances):raise ValueError('incarnation card definition changed')
  active[physical]=physical+'#'+str(len(instances))
 return active


def retains_predecessor(cards):
 # A full reentry state keeps physical#n-1 metadata beside physical#n.
 for source in cards:
  match=life.INSTANCE_RE.fullmatch(source)
  if match and int(match.group(2))>1 and match.group(1)+'#'+str(int(match.group(2))-1) in cards:return True
 return False


def verify_hashes(before,after,events):
 if not events or after['last_event_seq']!=before['last_event_seq']+len(events):raise ValueError('incarnation sequence differs')
 for c in (before,after):
  if c['continuation_state_sha256']!=old.start._hash(c):raise ValueError('incarnation actual continuation hash differs')
 gh=old.start.opening._stop_state_sha256(before['game_state']);ch=old.start._hash(before)
 for seq,event in enumerate(events,before['last_event_seq']+1):
  if event['seq']!=seq or event['game_state_before_sha256']!=gh or event['continuation_state_before_sha256']!=ch:raise ValueError('incarnation actual event chain differs')
  gh=event['game_state_after_sha256'];ch=event['continuation_state_after_sha256']
 if gh!=old.start.opening._stop_state_sha256(after['game_state']) or ch!=old.start._hash(after):raise ValueError('incarnation actual terminal hash differs')

class Connection:
 def __init__(self,envelope,history=None):
  self.root=life.digest(envelope);self.root_seq=envelope['event_seq']
  self.root_history=copy.deepcopy(history)
  self.records={self.root:life.create(envelope)};self.paths={};self.raw_destinations={}
 def require_history(self,envelope,history,source):
  # Conditional candidate caches prove transitions, never selection. The caller
  # supplies the selected public prefix; every cached edge must match that prefix.
  key=life.digest(envelope);record=self.records.get(key)
  if record is None or record['current_envelope_sha256']!=key:raise ValueError('field-entry envelope history unproved')
  life.check(record,envelope)
  if source not in record['active'].values():raise ValueError('field-entry retired or inactive instance')
  if type(history) is not list:raise ValueError('field-entry history absent')
  seqs=[event.get('seq') for event in history]
  if any(type(n) is not int for n in seqs) or seqs!=sorted(set(seqs)):raise ValueError('field-entry history order differs')
  prefix=[event for event in history if event['seq']<=self.root_seq]
  raw=lambda event:{k:v for k,v in event.items() if k not in end.BIND_KEYS}
  if self.root_history is not None and life.digest([raw(e) for e in prefix])!=life.digest([raw(e) for e in self.root_history]):raise ValueError('field-entry root history differs')
  suffix=[event for event in history if event['seq']>self.root_seq]
  for event in reversed(suffix):
   event_hash=life.digest(raw(event));edges=self.paths.get(key,{})
   matches=[];bound=bool(set(event)&end.BIND_KEYS)
   for (parent,raw_hash),binding in edges.items():
    if raw_hash!=event_hash:continue
    if bound:
     if {k:event.get(k) for k in end.BIND_KEYS}!=binding:continue
    elif self.raw_destinations[(parent,raw_hash)]!={key}:
     continue  # Raw public events cannot distinguish full-runtime branches.
    matches.append(parent)
   if len(matches)!=1:raise ValueError('field-entry selected full-envelope history absent or ambiguous')
   key=matches[0]
  if key!=self.root:raise ValueError('field-entry selected history incomplete')
  return record
 def registry(self,game):
  key=life.digest(game['cards'])
  found=[r for r in self.records.values() if life.digest(r['metadata'])==key]
  if not found:
   # A465 local frame already projected to the active copies (incarnation_policy
   # hands the projected frame to the shared prepare) resolves to the full record
   # whose active projection it is; disagreeing full records stay ambiguous.
   found=[r for r in self.records.values() if life.digest({s:r['metadata'][s] for s in r['active'].values()})==key]
   if any(life.digest(r['metadata'])!=life.digest(found[0]['metadata']) for r in found[1:]):raise ValueError('incarnation metadata registry absent or ambiguous')
  if not found or any(r['active']!=found[0]['active'] for r in found):raise ValueError('incarnation metadata registry absent or ambiguous')
  return copy.deepcopy(found[0])
 def capture(self,before,after,event):
  key=life.digest(before)
  if key not in self.records:raise ValueError('incarnation predecessor not reconstructed')
  if event.get('execution_contract_id')!=state.CONTRACT or event.get('envelope_before_sha256')!=state.state_hash(before) or event.get('envelope_after_sha256')!=state.state_hash(after):raise ValueError('incarnation full envelope binding differs')
  verify_hashes(state.current(before),state.current(after),[event])
  r=life.observe(self.records[key],before,after,event.get('instance_transitions',[]));dest=life.digest(after)
  if dest in self.records and life.digest(self.records[dest])!=life.digest(r):raise ValueError('same full state has different incarnation history')
  edge=(key,life.digest({k:v for k,v in event.items() if k not in end.BIND_KEYS}))
  # Native layers may append evidence to an event after first binding it.
  # Keep each validated variant; never replace a selected path with a trial.
  self.records[dest]=r
  self.paths.setdefault(dest,{})[edge]={k:event[k] for k in end.BIND_KEYS}
  self.raw_destinations.setdefault(edge,set()).add(dest)
 def finish(self,before,result,source):
  after,events=result
  if source not in life.field(life.game(after)):return result
  if len(events)!=1:raise ValueError('field entry event cardinality differs')
  key=life.digest(before)
  if key not in self.records:raise ValueError('field entry predecessor unproved')
  finished,transitions=life.rebind_entry(self.records[key],before,after,source)
  event=copy.deepcopy(events[0])
  if transitions:
   event['instance_transitions']=transitions
   successor=transitions[0]['to_instance_id']
   if event.get('source_instance_id')!=source:raise ValueError('native entry event source differs')
   event['source_instance_id']=successor
   # Only obligations created by this entry receive its new identity. Old
   # reservations, usage rows, targets and historical events never migrate.
   marker=f"mandatory:{finished['event_seq']}:{source}"
   prior=before['legacy_continuation']['pending_triggers']
   finished['legacy_continuation']['pending_triggers']=[f"mandatory:{finished['event_seq']}:{successor}" if r==marker and r not in prior else r for r in finished['legacy_continuation']['pending_triggers']]
  c=state.current(finished)
  event['game_state_after_sha256']=old.start.opening._stop_state_sha256(c['game_state']);event['continuation_state_after_sha256']=old.start._hash(c)
  bound=actions.bind_event(before,finished,event);self.capture(before,finished,bound)
  return finished,[bound]
 @contextmanager
 def scope(self):
  if not _SCOPE_LOCK.acquire(blocking=False):raise ValueError('incarnation scope reentry/concurrency forbidden')
  prior_guard=guard.require_initial_entry;prior_departure=departure.replace_companion;prior_transition=batch.transition;prior_apply=actions.apply;prior_bind=actions.bind_event;prior_verify=old.extension._verify_extended_step;prior_validate=state.validate;prior_detail=response_contract._instance_detail;prior_set=preparation.set_card;prior_attach=actions.attach
  prior_placement=history_replay.legacy_placement
  prior_final_verify=quick.final_time.verify_transition
  prior_step=restart_122._verify_step
  def final_verify(row,after,event):
   before=quick.final_time.contracts.current(row)
   outer_board=[link for link in before['activation_zone'][:-1] if link.get('source_zone')=='board']
   if any(link['card_id']!='C-chicken' for link in outer_board):
    # 406's source-specific board check predates the current board handlers.
    # Reuse its full hash-chain validator, then the existing100 physical view;
    # do not alter the real chain or pretend a board ability is a hand card.
    contracts=quick.final_time.contracts
    result=contracts.result_from_state(row,after,event);contracts.validate_chain(row,result)
    if not before['activation_zone'] or before['activation_zone'][-1]['card_id']!='E-final-time':raise ValueError('final-time outer source boundary differs')
    if life.digest(after['activation_zone'])!=life.digest(before['activation_zone'][:-1]):raise ValueError('final-time ordered outer links changed')
    ids=[link['link_id'] for link in after['activation_zone']]
    if len(ids)!=len(set(ids)) or after['response_context']['chain_links']!=ids or after['response_context']['chain_status']!='resolving':raise ValueError('final-time outer chain context differs')
    record=self.registry(before['game_state'])
    for current in (before,after):life.check(record,dict(legacy_continuation=current))
    for link in outer_board:
     physical=after['game_state']['cards'][link['source_instance_id']]
     if link['action_type']!='activate_board_ability' or link['actor'] not in after['game_state']['players'] or link['card_id']!=physical['card_id'] or link['card_copy_id']!=physical['card_copy_id']:raise ValueError('final-time outer board identity differs')
    shot=copy.deepcopy(result['new_snapshots'][0]);shot['game_state']=life.project_game(record,shot['game_state'])
    shot['continuation_state']['activation_zone']=[link for link in shot['continuation_state']['activation_zone'] if link.get('source_zone')!='board']
    errors=contracts.response._snapshot_instance_errors(shot)
    if errors:raise ValueError('final-time outer physical zones differ: '+str(errors))
    return
   if all(len(active_cards(c['game_state']['cards']))==len(c['game_state']['cards']) for c in (before,after)):return prior_final_verify(row,after,event)
   record=self.registry(before['game_state'])
   for current in (before,after):life.check(record,dict(legacy_continuation=current))
   # Keep406 chain/hash validation on the original full states. Its final
   # physical-zone check alone receives the existing active registry view.
   checker=quick.final_time.contracts.response;prior_snapshot=checker._snapshot_instance_errors
   def snapshot(shot):
    private=copy.deepcopy(shot);private['game_state']=life.project_game(record,shot['game_state'])
    return prior_snapshot(private)
   try:
    checker._snapshot_instance_errors=snapshot
    return prior_final_verify(row,after,event)
   finally:checker._snapshot_instance_errors=prior_snapshot
  def final_comparison(before,after,events):
   # turn_boundary's R10 final comparison calls the unchanged 122 verifier
   # directly. Only that transition receives the registry-bound active view;
   # every other caller, every non-reentry game and every state already
   # projected by verify() above keeps the legacy check.
   if len(events)!=1 or events[0].get('action_type')!='r10_final_comparison' or not any(retains_predecessor(c['game_state']['cards']) for c in (before,after)):return prior_step(before,after,events)
   if before['game_state']['round']!=10 or after['game_state']['phase']!='completed' or canonical(before['game_state']['cards'])!=canonical(after['game_state']['cards']):raise ValueError('R10 incarnation final comparison state differs')
   record=self.registry(before['game_state'])
   for current in (before,after):life.check(record,dict(legacy_continuation=current))
   r=restart_122.response_120;event=events[0]
   # Prove the full-state step first; the legacy zone check then sees active cards only.
   if after['last_event_seq']!=before['last_event_seq']+1 or after['continuation_state_sha256']!=r.continuation_state_sha256(r._continuation_payload(after)):raise r.RouteIntegrityStop('event_hash_discontinuity',restart_122._snapshot(before),{'field':'continuation_state_sha256'})
   if event['seq']!=after['last_event_seq'] or event['game_state_before_sha256']!=r.game_state_sha256(before['game_state']) or event['continuation_state_before_sha256']!=before['continuation_state_sha256'] or event['game_state_after_sha256']!=r.game_state_sha256(after['game_state']) or event['continuation_state_after_sha256']!=after['continuation_state_sha256']:raise r.RouteIntegrityStop('event_hash_discontinuity',restart_122._snapshot(before),{'seq':event.get('seq')})
   def project(c):
    p=copy.deepcopy(c);p['game_state']=life.project_game(record,c['game_state']);p['continuation_state_sha256']=r.continuation_state_sha256(r._continuation_payload(p));return p
   b=project(before);a=project(after);private=copy.deepcopy(events)
   private[0].update(game_state_before_sha256=r.game_state_sha256(b['game_state']),continuation_state_before_sha256=b['continuation_state_sha256'],game_state_after_sha256=r.game_state_sha256(a['game_state']),continuation_state_after_sha256=a['continuation_state_sha256'])
   return prior_step(b,a,private)
  def validate(e):
   prior_validate(e);active=active_cards(life.game(e)['cards'])
   # Existing information-only projections deliberately omit inactive hidden
   # preparations. Exact conservation remains mandatory at capture/finish.
   if not set(life.located(e))<=set(active.values()):raise ValueError('retired physical instance is located')
  def detail(g,source):
   card=g['cards'][source]
   if card['initial_instance_id']==source:return prior_detail(g,source)
   record=self.registry(g)
   if record['active'].get(card['card_copy_id'])!=source:raise ValueError('retired instance cannot enter current information view')
   private=dict(g,cards=dict(g['cards']));private['cards'][source]=dict(card,initial_instance_id=source)
   return prior_detail(private,source)
  def require(action,history,envelope=None):
   if action.get('action_type') not in guard.ENTRY_ACTIONS:return prior_guard(action,history,envelope)
   if envelope is None:raise ValueError('field-entry envelope history absent')
   source=action.get('source_instance_id');record=self.require_history(envelope,history,source)
   prior_entry=any(e.get('action_type') in guard.ENTRY_EVENTS and e.get('source_instance_id')==source for e in history)
   if prior_entry:
    if record['metadata'][source]['card_copy_id'] not in record['seen_field']:raise ValueError('prior field-entry history not captured by conditional root')
    return
   return prior_guard(action,history,envelope)
  def bind(before,after,event):
   result=prior_bind(before,after,event);key=life.digest(before)
   if key in self.records:
    record=self.records[key];entries=set(life.field(life.game(after)))-set(life.field(life.game(before)))
    pending=[s for s in entries if s in record['active'].values() and life.game(after)['cards'][s]['card_copy_id'] in record['seen_field']]
    # A native placement creates its event before the entry finisher assigns
    # the successor. This intermediate return is not added to the cache.
    if not pending:self.capture(before,after,result)
   return result
  def replaced(e,a,h):
   result=prior_departure(e,a,h);after,events=self.finish(e,(result['envelope'],result['events']),a['source_instance_id']);return dict(result,envelope=after,events=events)
  def transition(e,a,h=None):
   result=prior_transition(e,a,h)
   return self.finish(e,result,a['source_instance_id']) if a.get('action_type') in guard.ENTRY_ACTIONS and a['source_instance_id'] in life.field(life.game(result[0])) else result
  def set_card(e,a,h=None):return self.finish(e,prior_set(e,a,h),a['source_instance_id'])
  def attach(e,a,h=None):return self.finish(e,prior_attach(e,a,h),a['source_instance_id'])
  def legacy_placement(e,r,i):return self.finish(e,prior_placement(e,r,i),r['selected_action']['source_instance_id'])
  def apply(e,r,i):
   result=prior_apply(e,r,i);a=r.get('selected_action',{})
   return self.finish(e,result,a['source_instance_id']) if a.get('action_type') in guard.ENTRY_ACTIONS and a['source_instance_id'] in life.field(life.game(result[0])) else result
  def verify(before,after,events):
   if all(len(active_cards(c['game_state']['cards']))==len(c['game_state']['cards']) for c in (before,after)):return prior_verify(before,after,events)
   verify_hashes(before,after,events)
   # Preserve all full-state hashes above. The unchanged legacy verifier sees
   # only active card-map keys for its physical conservation check.
   def project(c):
    p=copy.deepcopy(c);cards=p['game_state']['cards'];p['game_state']['cards']={s:cards[s] for s in active_cards(cards).values()};p['continuation_state_sha256']=old.start._hash(p);return p
   b=project(before);a=project(after);private=copy.deepcopy(events)
   if any('_snapshot_after' in event for event in private):raise ValueError('legacy intermediate snapshot incarnation adapter required')
   private[0].update(game_state_before_sha256=old.start.opening._stop_state_sha256(b['game_state']),continuation_state_before_sha256=old.start._hash(b))
   private[-1].update(game_state_after_sha256=old.start.opening._stop_state_sha256(a['game_state']),continuation_state_after_sha256=old.start._hash(a))
   return prior_verify(b,a,private)
  try:
   history_replay.legacy_placement=legacy_placement
   quick.final_time.verify_transition=final_verify
   preparation.set_card=set_card;actions.attach=attach;state.validate=validate;response_contract._instance_detail=detail;guard.require_initial_entry=require;departure.replace_companion=replaced;batch.transition=transition;actions.apply=apply;actions.bind_event=bind;old.extension._verify_extended_step=verify;restart_122._verify_step=final_comparison;yield
  finally:
   history_replay.legacy_placement=prior_placement
   quick.final_time.verify_transition=prior_final_verify
   preparation.set_card=prior_set;actions.attach=prior_attach;state.validate=prior_validate;response_contract._instance_detail=prior_detail;guard.require_initial_entry=prior_guard;departure.replace_companion=prior_departure;batch.transition=prior_transition;actions.apply=prior_apply;actions.bind_event=prior_bind;old.extension._verify_extended_step=prior_verify;restart_122._verify_step=prior_step;_SCOPE_LOCK.release()
