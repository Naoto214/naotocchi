"""Bind native final hashes to the frozen challenge return.

proxy_continuation_challenge.normalize_result returns a chain resolved inside a
challenge window to challenge_comparison/challenge_end: it rewrites the snapshot,
the event after-hashes and final_continuation_state. A 406 result
(resolve_final_time via result_from_state) also carries final_game_state_sha256 /
final_continuation_state_sha256 for its pre-return normal_action state. Prove the
native fields hash that native state and that the only change is the frozen
return; then bind the fields to the returned event's after-hashes exactly as
proxy_population_boundary_response.normalize does. No effect, choice, legality
or information use is inferred; nothing else in the result changes.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_actions as actions
import proxy_continuation_challenge as challenge
import proxy_resource_value_trajectory as old
from proxy_mandatory_policy_contract import canonical
_LOCK=Lock()
FIELDS=('final_game_state_sha256','final_continuation_state_sha256')
TARGETS={'comparing':('challenge_comparison','challenge_declaration'),'resolved':('challenge_end','challenge_result')}


def rebind(envelope,native,normalized):
 battle=envelope['legacy_continuation']['game_state'].get('challenge')
 if battle is None or any(f not in native for f in FIELDS):return normalized
 out=copy.deepcopy(normalized);final=out['final_continuation_state']
 if out['final_game_state_sha256']==old.start.opening._stop_state_sha256(final['game_state']) and out['final_continuation_state_sha256']==old.start._hash(final):return normalized
 raw=native['final_continuation_state']
 # 1. The native output must prove its own (pre-return) final state.
 if native['final_game_state_sha256']!=old.start.opening._stop_state_sha256(raw['game_state']) or native['final_continuation_state_sha256']!=old.start._hash(raw):raise ValueError('native final hash does not prove native final state')
 # 2. Only the frozen challenge return may have changed it: same game state but
 # phase, no chain before or after, same pending triggers, the battle-status branch.
 target,source_phase=TARGETS.get(battle.get('status'),(None,None))
 events=out['new_events'];shots=out['new_snapshots']
 if target is None or not events or len(events)!=len(shots) or not events[-1]['action_type'].startswith('resolve'):raise ValueError('challenge return boundary differs')
 ctx=final['response_context']
 if canonical(dict(final['game_state'],phase=raw['game_state']['phase']))!=canonical(raw['game_state']) or raw['game_state']['phase']!='normal_action' or final['game_state']['phase']!='response_window' or final['activation_zone'] or raw['activation_zone'] or canonical(final['pending_triggers'])!=canonical(raw['pending_triggers']) or final['return_target']!=target or ctx.get('source_phase')!=source_phase or ctx.get('chain_status')!='empty' or ctx.get('chain_links'):raise ValueError('challenge return retarget differs')
 if canonical(shots[-1]['continuation_state'])!=canonical(final):raise ValueError('challenge return final snapshot differs')
 # 3. The returned last event already carries the hashes of the returned final
 # state; the runtime re-verifies them against the replayed envelope.
 last=events[-1]
 if last['game_state_after_sha256']!=old.start.opening._stop_state_sha256(final['game_state']) or last['continuation_state_after_sha256']!=old.start._hash(final):raise ValueError('challenge return event hash differs')
 out['final_game_state_sha256']=last['game_state_after_sha256'];out['final_continuation_state_sha256']=last['continuation_state_after_sha256']
 canonical(out);return out


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('challenge return scope concurrency/reentry forbidden')
 prior=actions.RESOLUTION_RESULT_ADAPTER
 try:
  if prior is not challenge.normalize_result:raise ValueError('challenge return adapter requires the native challenge normalization')
  def normalize(envelope,result):
   native=copy.deepcopy(result);return rebind(envelope,native,prior(envelope,result))
  actions.RESOLUTION_RESULT_ADAPTER=normalize;yield
 finally:actions.RESOLUTION_RESULT_ADAPTER=prior;_LOCK.release()
