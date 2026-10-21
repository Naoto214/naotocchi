"""Batched source-bound execution from438, with independent replay."""
import copy
import proxy_continuation_payments as payments
import proxy_continuation_challenge as challenge
import proxy_continuation_batch as batch
import proxy_continuation_worlds as worlds
import proxy_continuation_capabilities as caps
import proxy_continuation_conditions as conditions
import proxy_continuation_end as end
import proxy_continuation_quick as quick
import proxy_continuation_triggers as triggers
import proxy_continuation_preparation as preparation
import proxy_continuation_runner as base
import proxy_resource_value_integration as saved

COVERAGE='continuation_batched_normal_v2'


def run_route(initial,policy):
 evidence=[]
 def forced_body(envelope,initial,events,shots,runtime):
  c=base.state.current(envelope)
  if c['game_state']['phase']=='challenge_comparison':return challenge.compare(envelope)
  if c['game_state']['phase']=='challenge_end':return challenge.finish(envelope)
  if c['pending_triggers']:return triggers.mandatory_pending(envelope,events)
  if c['game_state']['phase']=='turn_end':
   opened=triggers.open_end(envelope,events)
   if opened:return opened
   expired=payments.expire(envelope)
   if expired:return expired
   triggers.register_end_boundary(envelope,events,end_proofs)
  if c['response_context']['chain_status']=='resolving' and c['activation_zone'][-1]['card_id'] in payments.BOARD_STATS:return payments.resolve_board_stat(envelope)
  if c['response_context']['chain_status']=='resolving' and c['activation_zone'][-1].get('source_zone')=='board' and c['activation_zone'][-1]['card_id'] in triggers.SUPPORTED_EFFECTS:return triggers.resolve(c,initial)
  if c['response_context']['chain_status']=='resolving' and c['activation_zone'][-1]['card_id'] in payments.QUICK_CARDS:return payments.resolve(envelope,initial)
  if c['response_context']['chain_status']=='resolving' and c['activation_zone'][-1]['card_id']=='E-final-time':return quick.resolve(c,initial)
  if c['game_state']['phase']!='turn_end':return base._forced(c,initial,events,shots)
  return end.forced(envelope,initial,events,shots,runtime)
 def forced(envelope,initial,events,shots,runtime):
  result=forced_body(envelope,initial,events,shots,runtime)
  batch.guard_resolution_result(envelope,result,events)
  return base.actions.normalize_resolution_result(envelope,result)
 with payments.scope(initial),conditions.scope(),caps.scope(),worlds.scope(),batch.scope(evidence),quick.scope(initial),triggers.scope(initial) as end_proofs,preparation.scope(),challenge.scope(initial):
  result=base.run_route(initial,policy,forced)
 unique={base.state.canonical_sha256(e):e for e in evidence}
 result.update(coverage_revision=COVERAGE,run_id=COVERAGE+':'+policy+':'+initial['path_id'],
  batch_outcome_evidence=sorted(unique.values(),key=lambda e:(e['event_seq'],e['proof']['candidate_id'])))
 return result


def validate_route(result,initial,policy):
 try:return [] if saved.canonical(run_route(initial,policy))==saved.canonical(result) else ['batch independent replay differs']
 except (ValueError,KeyError,TypeError) as error:return [str(error)]


def metric_shape(run):
 """Project verified envelopes to414's observational metric input only."""
 result=copy.deepcopy(run);result['status']='completed' if run['completed'] else 'stopped';result['stop_reason_code']=(run['stop'] or {}).get('code');result['stop_evidence']=copy.deepcopy(run['stop'])
 result['final_continuation_state']=copy.deepcopy(run['final_envelope']['legacy_continuation'])
 result['result']['growth']=copy.deepcopy(run['result'].get('final_growth'))
 result['snapshots']=[dict(event_seq=e['event_seq'],game_state=copy.deepcopy(e['legacy_continuation']['game_state'])) for e in run['snapshots']]
 for decision in result['decisions']:
  if 'inventory' not in decision:continue
  decision['decision_kind']='normal_action'
  if decision['policy_id']==base.old.POLICIES[1]:decision['selection']=copy.deepcopy(decision['choice'])
  else:decision['selection']=dict(decision['choice'],legal_candidates=decision['inventory']['legal_candidate_ids'],seed_context=decision['context'])
 return result


def run_paired(output):
 import gzip,hashlib,json,sys
 from pathlib import Path
 import proxy_resource_value_evaluation as evaluation
 output=Path(output);output.mkdir(parents=True,exist_ok=True);results=[]
 for initial in base.old.load_initial_routes():
  for policy in base.old.POLICIES:
   result=run_route(initial,policy);errors=validate_route(result,initial,policy)
   if errors:raise ValueError(str(errors))
   results.append(result);print(result['run_id'],result['last_valid_event_seq'],result['completed'],result['stop'],flush=True)
 ids=sorted(r['run_id'] for r in results)
 report=dict(schema='naotocchi.card_game.continuation_batch_paired.v2',execution_contract_id=payments.CONTRACT,coverage_revision=COVERAGE,base_commit='d49dd20b3ade9ba941aaa14bbb98324442e9c3fe',planned_ids=ids,planned=8,completed=sum(r['completed'] for r in results),stopped=sum(not r['completed'] for r in results),not_executed=0,independent_replay_verified=8,independent_balance_sample_count=0,policy_promoted=False,results=results)
 comparison=base.compare_results(results,saved.load_saved()['paired']['results'])
 for pair in comparison['paired_policy_comparisons']:
  group=[next(r for r in results if r['path_id']==pair['path_id'] and r['policy_id']==policy) for policy in base.old.POLICIES]
  pair['final_growth_difference']={actor:group[1]['result']['final_growth'][actor]-group[0]['result']['final_growth'][actor] for actor in 'AB'} if all(r['completed'] for r in group) else None
  pair['winner_comparison']={r['policy_id']:r['result']['winner'] if r['completed'] else None for r in group}
 report['comparison']=comparison
 metrics=evaluation.evaluate_trajectories(dict(planned_ids=ids),[metric_shape(r) for r in results]);metrics.update(policy_promoted=False,comparison_basis='same_135_initial_routes_and_current_execution_edition',foundation_repairs_counted_as_adoption_evidence=False)
 report['trajectory_observations']=metrics
 raw=saved.canonical(report);blob=gzip.compress(raw,mtime=0);(output/'paired.json.gz').write_bytes(blob)
 root=base.old.DATA.parent
 paths={Path(module.__file__).resolve() for module in list(sys.modules.values()) if getattr(module,'__file__',None) and Path(module.__file__).resolve().is_relative_to(root/'tools')}
 for row in batch.rules.table()['cards']:
  for action in row['actions']:paths.add(root/action['source_text_reference'].split('#')[0])
 paths.update(root/name for name in ('01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','07-advanced-rules-checkpoint.md','64-turn-boundaries-and-victory-timing.md','65-challenge-participants-and-resolution.md','93-cross-type-boundary-audit.md','114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md','119-response-window-contract.md','plans/2026-10-01-normal-decision-resource-pilot-design.md'))
 prior_raw=gzip.decompress((base.old.DATA/'proxy-continuation-world-438/paired.json.gz').read_bytes())
 manifest=dict(base_commit=report['base_commit'],artifact='paired.json.gz',raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(blob).hexdigest(),previous_438_raw_sha256=hashlib.sha256(prior_raw).hexdigest(),historical_source_raw_sha256=saved.load_saved()['source_raw_sha256'],execution_sources_sha256={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)})
 (output/'manifest.json').write_bytes(saved.canonical(manifest));return report


if __name__=='__main__':
 import argparse
 from pathlib import Path
 parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
 run_paired(parser.parse_args().output)
