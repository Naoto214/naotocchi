"""438 opt-in shared world placement evidence; previous execution remains default."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import proxy_continuation_worlds as worlds
import proxy_continuation_board_links as board_links
import proxy_continuation_capability_runner as previous
import proxy_continuation_end_runner as historical
import proxy_continuation_runner as base
import proxy_resource_value_trajectory as old
import proxy_resource_value_integration as saved

COVERAGE='continuation_world_immediate_outcomes_v1'
BASE='08fe4b39263d19cda34aede10f69c4109d4f26cc'


def run_route(initial,policy):
    evidence=[]
    with worlds.scope(evidence):result=previous.run_route(initial,policy)
    unique={base.state.canonical_sha256(e):e for e in evidence}
    result.update(coverage_revision=COVERAGE,run_id=COVERAGE+':'+policy+':'+initial['path_id'],
        world_placement_evidence=sorted(unique.values(),key=lambda e:(e['event_seq'],e['proof']['candidate_id'])))
    return result


def validate_route(result,initial,policy):
    try:return [] if saved.canonical(run_route(initial,policy))==saved.canonical(result) else ['438 independent full world outcome replay differs']
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def previous_shape(run):
    with board_links.scope():return historical.historical_shape(run)


def run_paired(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True);results=[]
    for initial in old.load_initial_routes():
        for policy in old.POLICIES:
            result=run_route(initial,policy);errors=validate_route(result,initial,policy)
            if errors:raise ValueError(str(errors))
            results.append(result);print(result['run_id'],result['last_valid_event_seq'],result['stop'],flush=True)
    previous_raw=gzip.decompress((old.DATA/'proxy-continuation-capabilities-436/paired.json.gz').read_bytes());before=json.loads(previous_raw)
    report=dict(schema='naotocchi.card_game.continuation_world_paired.v1',execution_contract_id=base.state.CONTRACT,
        coverage_revision=COVERAGE,planned=8,planned_ids=sorted(r['run_id'] for r in results),completed=sum(r['completed'] for r in results),
        stopped=sum(not r['completed'] for r in results),not_executed=0,independent_replay_verified=8,
        independent_balance_sample_count=0,policy_promoted=False,results=results,
        comparison=base.compare_results(results,saved.load_saved()['paired']['results']),
        previous_436_execution_differences=base.compare_results(results,[previous_shape(r) for r in before['results']])['historical_execution_differences'],
        historical_scope_audit=base.historical_scope_audit())
    raw=saved.canonical(report);blob=gzip.compress(raw,mtime=0);(output/'paired.json.gz').write_bytes(blob)
    paths=sorted(Path(__file__).parent.glob('proxy_continuation_*.py'))
    source_names=json.loads((old.DATA/'proxy-continuation-capabilities-436/manifest.json').read_text())['execution_sources_sha256']
    paths += [old.DATA.parent/name for name in source_names if not name.startswith('tools/')]
    paths.append(old.DATA.parent/'89-world-13-card-text-draft.md')
    manifest=dict(base_commit=BASE,artifact='paired.json.gz',raw_sha256=hashlib.sha256(raw).hexdigest(),
        compressed_sha256=hashlib.sha256(blob).hexdigest(),previous_436_raw_sha256=hashlib.sha256(previous_raw).hexdigest(),
        historical_source_raw_sha256=saved.load_saved()['source_raw_sha256'],
        execution_sources_sha256={str(p.relative_to(old.DATA.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})
    (output/'manifest.json').write_bytes(saved.canonical(manifest));return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    run_paired(parser.parse_args().output)
