"""436 opt-in future main capability evidence;435 defaults remain untouched."""
import argparse
import copy
import gzip
import hashlib
import json
from pathlib import Path
import proxy_continuation_capabilities as capabilities
import proxy_continuation_condition_runner as previous
import proxy_continuation_end_runner as historical
import proxy_continuation_runner as base
import proxy_resource_value_trajectory as old
import proxy_resource_value_integration as saved

COVERAGE='continuation_future_main_capabilities_v1'
BASE='a1dd45ae994cc1401ac6554f0e48b6684c4d3464'


def run_route(initial,policy):
    evidence=[]
    with capabilities.scope(evidence):result=previous.run_route(initial,policy)
    # Scoring is reconstructed before execution. Keep one copy of each proof,
    # without making an unexecuted future trigger into an outcome.
    unique={base.state.canonical_sha256(e):e for e in evidence}
    result.update(coverage_revision=COVERAGE,run_id=COVERAGE+':'+policy+':'+initial['path_id'],
        main_capability_evidence=sorted(unique.values(),key=lambda e:(e['event_seq'],e['proof']['candidate_id'])))
    return result


def validate_route(result,initial,policy):
    try:return [] if saved.canonical(run_route(initial,policy))==saved.canonical(result) else ['436 independent full capability replay differs']
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def run_paired(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True);results=[]
    for initial in old.load_initial_routes():
        for policy in old.POLICIES:
            result=run_route(initial,policy);errors=validate_route(result,initial,policy)
            if errors:raise ValueError(str(errors))
            results.append(result);print(result['run_id'],result['last_valid_event_seq'],result['stop'],flush=True)
    previous_raw=gzip.decompress((old.DATA/'proxy-continuation-conditions-435/paired.json.gz').read_bytes());before=json.loads(previous_raw)
    report=dict(schema='naotocchi.card_game.continuation_capabilities_paired.v1',execution_contract_id=base.state.CONTRACT,
        coverage_revision=COVERAGE,planned=8,planned_ids=sorted(r['run_id'] for r in results),completed=sum(r['completed'] for r in results),
        stopped=sum(not r['completed'] for r in results),not_executed=0,independent_replay_verified=8,
        independent_balance_sample_count=0,policy_promoted=False,results=results,
        comparison=base.compare_results(results,saved.load_saved()['paired']['results']),
        previous_435_execution_differences=base.compare_results(results,[historical.historical_shape(r) for r in before['results']])['historical_execution_differences'],
        historical_scope_audit=base.historical_scope_audit())
    raw=saved.canonical(report);blob=gzip.compress(raw,mtime=0);(output/'paired.json.gz').write_bytes(blob)
    paths=sorted(Path(__file__).parent.glob('proxy_continuation_*.py'))
    paths += [old.DATA.parent/name for name in ('01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md',
        '31-beetle-stagbeetle-card-master-migration.md','55-insect-three-lines-card-text-draft.md','64-turn-boundaries-and-victory-timing.md',
        '72-companion-26-card-text-draft.md','74-partner-18-card-text-draft.md','77-current-items-card-text-draft.md',
        '79-play-batch-1-card-text-draft.md','83-play-batch-3-card-text-draft.md','91-event-21-card-text-draft.md',
        '93-cross-type-boundary-audit.md','data/proxy-normal-decision-candidate-table-114-20260918.json')]
    manifest=dict(base_commit=BASE,artifact='paired.json.gz',raw_sha256=hashlib.sha256(raw).hexdigest(),
        compressed_sha256=hashlib.sha256(blob).hexdigest(),previous_435_raw_sha256=hashlib.sha256(previous_raw).hexdigest(),
        historical_source_raw_sha256=saved.load_saved()['source_raw_sha256'],
        execution_sources_sha256={str(p.relative_to(old.DATA.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})
    (output/'manifest.json').write_bytes(saved.canonical(manifest));return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    run_paired(parser.parse_args().output)
