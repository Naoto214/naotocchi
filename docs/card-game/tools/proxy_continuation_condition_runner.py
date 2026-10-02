"""435 opt-in public prerequisite coverage; historical execution defaults unchanged."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import proxy_continuation_conditions as conditions
import proxy_continuation_actions as actions
import proxy_continuation_end_runner as previous
import proxy_continuation_runner as base
import proxy_resource_value_trajectory as old
import proxy_resource_value_integration as saved

COVERAGE='continuation_public_prerequisites_v1'
BASE='5cb9e57512edac8fa88c2ab9ff73a74b01ba8782'


def run_route(initial,policy):
    evidence=[];original=actions.response_inventory
    def inventory(envelope,initial,events):
        opportunity=original(envelope,initial,events)
        proofs=[row for row in opportunity.get('excluded_candidates',[]) if 'condition_proof' in row]
        for row in proofs:
            actor=envelope['legacy_continuation']['response_context']['priority_actor']
            game=envelope['legacy_continuation']['game_state'];source=row['source_instance_id'];card=row['card_id']
            if source not in game['players'][actor]['hand'] or game['cards'][source]['card_id']!=card or \
                    conditions.validate(row['condition_proof'],card,game,actor) or row['condition_proof']['status']!='unmet':
                raise ValueError('projected prerequisite proof differs from full public state')
        if proofs:evidence.append(dict(event_seq=envelope['event_seq'],
            envelope_sha256=base.state.state_hash(envelope),exclusions=proofs))
        return opportunity
    try:
        with conditions.scope():
            actions.response_inventory=inventory
            result=previous.run_route(initial,policy)
    finally:
        actions.response_inventory=original
    result.update(coverage_revision=COVERAGE,run_id=COVERAGE+':'+policy+':'+initial['path_id'],condition_evidence=evidence)
    return result


def condition_proofs(result):
    return [dict(event_seq=entry['event_seq'],proof=row['condition_proof'])
        for entry in result['condition_evidence'] for row in entry['exclusions']]


def validate_route(result,initial,policy):
    try:return [] if saved.canonical(run_route(initial,policy))==saved.canonical(result) else ['435 independent initial/condition/runtime/end replay differs']
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def run_paired(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True);results=[]
    for initial in old.load_initial_routes():
        for policy in old.POLICIES:
            result=run_route(initial,policy);errors=validate_route(result,initial,policy)
            if errors:raise ValueError(str(errors))
            results.append(result);print(result['run_id'],result['last_valid_event_seq'],result['stop'],flush=True)
    previous_raw=gzip.decompress((old.DATA/'proxy-continuation-end-434/paired.json.gz').read_bytes())
    before=json.loads(previous_raw)
    report=dict(schema='naotocchi.card_game.continuation_conditions_paired.v1',execution_contract_id=base.state.CONTRACT,
        coverage_revision=COVERAGE,planned=8,planned_ids=sorted(r['run_id'] for r in results),
        completed=sum(r['completed'] for r in results),stopped=sum(not r['completed'] for r in results),not_executed=0,
        independent_replay_verified=8,independent_balance_sample_count=0,policy_promoted=False,results=results,
        comparison=base.compare_results(results,saved.load_saved()['paired']['results']),
        previous_434_execution_differences=base.compare_results(results,[previous.historical_shape(r) for r in before['results']])['historical_execution_differences'],
        historical_scope_audit=base.historical_scope_audit())
    raw=saved.canonical(report);blob=gzip.compress(raw,mtime=0);(output/'paired.json.gz').write_bytes(blob)
    paths=sorted(Path(__file__).parent.glob('proxy_continuation_*.py'))
    paths += [old.DATA.parent/name for name in ('01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','55-insect-three-lines-card-text-draft.md','64-turn-boundaries-and-victory-timing.md','72-companion-26-card-text-draft.md','74-partner-18-card-text-draft.md','77-current-items-card-text-draft.md','79-play-batch-1-card-text-draft.md','83-play-batch-3-card-text-draft.md','91-event-21-card-text-draft.md','93-cross-type-boundary-audit.md','data/proxy-normal-decision-candidate-table-114-20260918.json')]
    manifest=dict(base_commit=BASE,artifact='paired.json.gz',raw_sha256=hashlib.sha256(raw).hexdigest(),
        compressed_sha256=hashlib.sha256(blob).hexdigest(),previous_434_raw_sha256=hashlib.sha256(previous_raw).hexdigest(),
        historical_source_raw_sha256=saved.load_saved()['source_raw_sha256'],
        execution_sources_sha256={str(p.relative_to(old.DATA.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})
    (output/'manifest.json').write_bytes(saved.canonical(manifest));return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    run_paired(parser.parse_args().output)
