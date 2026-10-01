"""434 opt-in end coverage; 433 defaults and persisted artifacts are unchanged."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import proxy_continuation_runner as base
import proxy_continuation_end as end
import proxy_resource_value_trajectory as old
import proxy_resource_value_integration as saved


def run_route(initial,policy):
    result=base.run_route(initial,policy,end.forced)
    result.update(coverage_revision=end.COVERAGE,run_id=end.COVERAGE+':'+policy+':'+initial['path_id'])
    return result


def validate_route(result,initial,policy):
    try:return [] if run_route(initial,policy)==result else ['434 independent full initial/runtime/end replay differs']
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def historical_shape(run):
    """Read-only adapter for comparison of 433's envelope snapshots."""
    result=dict(run,snapshots=[old._snapshot(base.state.current(s)) for s in run['snapshots']],decisions=[])
    for d in run['decisions']:
        row=dict(d)
        if 'inventory' in d:
            row.update(decision_kind='normal_action',legal_candidate_details=d['inventory']['legal_candidate_details'])
        result['decisions'].append(row)
    return result


def run_paired(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True);results=[]
    for initial in old.load_initial_routes():
        for policy in old.POLICIES:
            result=run_route(initial,policy);errors=validate_route(result,initial,policy)
            if errors:raise ValueError(str(errors))
            results.append(result);print(result['run_id'],result['last_valid_event_seq'],result['stop'],flush=True)
    previous_path=old.DATA/'proxy-continuation-contract/paired.json.gz';previous_raw=gzip.decompress(previous_path.read_bytes());previous=json.loads(previous_raw)
    report=dict(schema='naotocchi.card_game.continuation_end_paired.v1',execution_contract_id=base.state.CONTRACT,
        coverage_revision=end.COVERAGE,planned=8,planned_ids=sorted(r['run_id'] for r in results),
        completed=sum(r['completed'] for r in results),stopped=sum(not r['completed'] for r in results),not_executed=0,
        independent_replay_verified=8,independent_balance_sample_count=0,policy_promoted=False,results=results,
        comparison=base.compare_results(results,saved.load_saved()['paired']['results']),
        previous_433_execution_differences=base.compare_results(results,[historical_shape(r) for r in previous['results']])['historical_execution_differences'],
        historical_scope_audit=base.historical_scope_audit())
    raw=saved.canonical(report);blob=gzip.compress(raw,mtime=0);(output/'paired.json.gz').write_bytes(blob)
    paths=sorted(Path(__file__).parent.glob('proxy_continuation_*.py'))
    paths += [old.DATA.parent/name for name in ('01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','55-insect-three-lines-card-text-draft.md','64-turn-boundaries-and-victory-timing.md','72-companion-26-card-text-draft.md','74-partner-18-card-text-draft.md','77-current-items-card-text-draft.md','93-cross-type-boundary-audit.md')]
    manifest=dict(base_commit='6fd2723846b703234d811cdf7742cc5e13fd44c7',artifact='paired.json.gz',
        raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(blob).hexdigest(),
        previous_433_raw_sha256=hashlib.sha256(previous_raw).hexdigest(),historical_source_raw_sha256=saved.load_saved()['source_raw_sha256'],
        execution_sources_sha256={str(p.relative_to(old.DATA.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})
    (output/'manifest.json').write_bytes(saved.canonical(manifest));return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    run_paired(parser.parse_args().output)
