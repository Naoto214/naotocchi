#!/usr/bin/env python3
"""Generate additive441 evidence without overwriting112/439/440."""
import argparse,gzip,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
import proxy_counterfactual_limits as audit
import proxy_targeted_execution as execution


def canonical(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def sha(b):return hashlib.sha256(b).hexdigest()

def run(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    report=audit.audit_saved()
    results=[execution.execute_scenario(f) for f in execution.FOCUS_IDS]
    for result in results:
        errors=execution.replay(result)
        if errors or not result['focus_verified']:raise ValueError(str(errors or result['focus']))
    history=audit.load_checked(audit.DATA/'proxy-continuation-batch-439',filename='paired.json.gz')
    coverage={f:[] for f in execution.FOCUS_IDS}
    for run in history['results']:
        cards=run['final_envelope']['legacy_continuation']['game_state']['cards']
        for event in run['events']:
            card=cards.get(event.get('source_instance_id'),{}).get('card_id')
            if card in coverage and (event['action_type'].startswith(('activate','resolve'))):coverage[card].append(dict(run_id=run['run_id'],event_seq=event['seq'],action_type=event['action_type']))
    payload=dict(schema='naotocchi.card_game.gap_validation.v1',base_commit='c1bc71ab5783f8f2b703cbc6d2ff6f6cb792b532',results=results,prior_439_focus_activation_resolution_events=coverage)
    raw=canonical(payload);blob=gzip.compress(raw,mtime=0)
    # Validate the exact serialized representation that will be saved.
    for loaded in json.loads(gzip.decompress(blob))['results']:
        errors=execution.replay(loaded)
        if errors:raise ValueError('serialized replay: '+str(errors))
    summary=dict(targeted_planned=6,targeted_executed=6,focus_verified=sum(r['focus_verified'] for r in results),independent_replay_verified=6,events=sum(len(r['events']) for r in results),new_completed_matches=0,independent_balance_sample_count=0,policy_promoted=False,legacy_compared=241,legacy_unsupported=72,legacy_boundary_groups=report['groups'],prior_439_focus_coverage={k:len(v) for k,v in coverage.items()},true_ruling_stops=0,original_112_unmodified=True,normal_policy_evaluation=False)
    (output/'targeted.json.gz').write_bytes(blob)
    (output/'legacy-limits.json').write_bytes(canonical(report))
    (output/'summary.json').write_bytes(canonical(summary))
    files=[p for p in (ROOT/'tools').glob('*.py')]+[Path(__file__)]
    input_files=[ROOT/'data/proxy-gap-fixture-plan-112-20260918.json',*(ROOT/'data/proxy-gap-fixtures-112').glob('*.json'),audit.SHADOW_DIR/'shadow.json.gz',audit.SHADOW_DIR/'manifest.json',audit.DATA/'proxy-continuation-batch-439/paired.json.gz',audit.DATA/'proxy-continuation-batch-439/manifest.json']
    manifest=dict(raw_sha256=sha(raw),compressed_sha256=sha(blob),execution_sources_sha256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sorted(files)},input_sha256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sorted(input_files)},canonical_source_sha256=execution.source_hashes(),legacy_audit_sha256=sha((output/'legacy-limits.json').read_bytes()))
    (output/'manifest.json').write_bytes(canonical(manifest))
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);run(parser.parse_args().output)
