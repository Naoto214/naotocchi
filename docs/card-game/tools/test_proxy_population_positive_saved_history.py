"""Read immutable stopped history; never invoke a match driver or next turn."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def diagnose():
 import sys,gzip,json,copy,contextlib
 import proxy_continuation_batch_runner as b
 import proxy_population_challenge_window as c
 import proxy_population_trigger_window as w
 import proxy_population_trigger_effects as fx
 import proxy_population_hand_timing as ht
 import proxy_population_paid_draw as pd
 import proxy_population_positive_window as positive
 import ast
 import proxy_population_policy_bridge as pb
 namespace=dict(vars(positive));namespace.update(original_replay=w.replay.scope,initial=None,raw=lambda e:{k:v for k,v in e.items() if k not in b.end.BIND_KEYS})
 module=ast.parse(Path(positive.__file__).read_text());segment=next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name=='segment');fn=next(n for n in segment.body if isinstance(n,ast.FunctionDef) and n.name=='replay_scope');exec(compile(ast.Module(body=[fn],type_ignores=[]),positive.__file__,'exec'),namespace)
 r=json.loads(gzip.decompress((ROOT/'data/proxy-population-400-run-20261012/attempt-0001/record.json.gz').read_bytes()));rt=r['runtime'];o=r['opening'];end=b.end
 initial=dict(path_id=r['binding']['match_id'],order_id=r['binding']['group_id'],first_player=o['initial']['first_player'],inputs=dict(path_id=r['binding']['match_id'],boundaries=[],source_raw_sha256={},historical_response_inventories=[],response_seed_profiles=[],legacy_pass_boundaries=[],legacy_empty_pass_boundaries=[]))
 events=copy.deepcopy(o['events'])+[{k:v for k,v in e.items() if k not in end.BIND_KEYS} for e in rt['events']]
 shots=[dict(event_seq=s['seq'],game_state=s['state'],game_state_sha256=s['state_sha256'],continuation_state=None,continuation_state_sha256=None) for s in o['snapshots'][:2]]
 x=rt['source_envelope'];shots.append(dict(event_seq=x['event_seq'],game_state=x['legacy_continuation']['game_state'],game_state_sha256=b.base.old.start.opening._stop_state_sha256(x['legacy_continuation']['game_state']),continuation_state=x['legacy_continuation'],continuation_state_sha256=b.base.old.start._hash(x['legacy_continuation'])))
 for shot in shots[:2]:shot['game_state']=dict(shot['game_state'],cards=copy.deepcopy(rt['source_envelope']['legacy_continuation']['game_state']['cards']))
 envs=[rt['source_envelope']]
 for s in rt['steps']:shots.extend(s['snapshots']);envs.extend(s['envelopes'])
 namespace.update(initial=initial,captures={p['event_sha256']:p for p in rt['positive_timing_proofs']})
 assert (len(events),len(shots),len(envs))==(213,214,212)
 trigger_ctx=b.triggers.scope(initial)
 with contextlib.ExitStack() as stack:
  for ctx in [c.contract_scope(),b.payments.scope(initial),b.conditions.scope(),b.caps.scope(),b.worlds.scope(),b.batch.scope([]),b.quick.scope(initial),trigger_ctx,b.preparation.scope(),b.challenge.scope(initial),c.arithmetic.scope(),c.growth.scope(),c.partner_draw.scope(),c.victory.scope(),c.legality.scope(),c.public_turn.scope(),c.response_context.scope(),c.loss_reward.scope(),fx.scope(),ht.scope(),w.departure.scope(),w.recovery.scope(),pd.scope(),w.instances.scope(),w.references.scope(),namespace['replay_scope'](rt['trigger_records']),c.public_application.scope(events,shots,envs)]:
   value=stack.enter_context(ctx)
   if ctx is trigger_ctx:end_proofs=value
  bindings={b.base.state.canonical_sha256(envs[e['seq']-3]):e['processing_boundary'] for e in events if 'processing_boundary' in e}
  stack.enter_context(w.resolution_boundaries(bindings))
  manifest=json.loads((ROOT/'data/proxy-population-400-20261012/manifest.json').read_text())
  session=pb.Session({k:r['binding'][k] for k in ('protocol_id','group_id','mirror_side')},manifest['policy_roots'][r['binding']['group_id']]);session.origins=copy.deepcopy(r['origin_journal'])
  stack.enter_context(pb.handler_scope(session))
  b.triggers.register_end_boundary(rt['final_envelope'],events,end_proofs)
  with end.end_scope(rt['final_envelope'],events,shots,envs) as proofs:
   class AuditCaptured(Exception):pass
   captured={};original=b.base.old.terminal.audit_current_turn_end
   def capture(stop,provenance):
    captured.update(proof=copy.deepcopy(provenance),audit=original(stop,provenance))
    raise AuditCaptured()
   from unittest.mock import patch
   with patch.object(b.base.old.terminal,'audit_current_turn_end',side_effect=capture):
    try:b.base.old._end_transition(b.base.state.current(rt['final_envelope']),initial['path_id'],events,shots)
    except AuditCaptured:pass
    else:raise AssertionError('diagnostic must stop before any next turn transition')
   return captured

class SavedEndTests(unittest.TestCase):
 def test_saved_stop_history_has_complete_positive_end_provenance(self):
  result=diagnose()
  self.assertEqual(result['proof']['unresolved_codes'],[])
  self.assertEqual(result['audit']['contract_stop_codes'],[])
  self.assertTrue(result['audit']['turn_end_set_complete'])

if __name__=='__main__':unittest.main()
