"""Reproduce442 variants and source-bound evidence without modifying441 artifacts."""
import argparse,gzip,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
import proxy_targeted_variants as variants

def raw(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def sha(value):return hashlib.sha256(value).hexdigest()

def run(output):
    output.mkdir(parents=True,exist_ok=True)
    baseline=variants.compare_441()
    if not all(baseline.values()):raise ValueError('441 execution changed')
    results=variants.execute_all()
    payload=dict(schema='naotocchi.card_game.boundary_validation.v1',base_commit='44b3fcdc6ccfbd0075cc487b9bec9b77e97e5fa8',results=results)
    blob=gzip.compress(raw(payload),mtime=0)
    for result in json.loads(gzip.decompress(blob))['results']:
        errors=variants.replay(result)
        if errors:raise ValueError(str(errors))
    summary=dict(cases=len(results),variants={k:sum(r['variant']==k for r in results) for k in ('baseline','decline','expired','explicit_defense')},events=sum(len(r['events']) for r in results),saved_replay_verified=len(results),baseline_441_identical=baseline,new_completed_matches=0,independent_balance_sample_count=0,policy_promoted=False,normal_policy_evaluation=False,legacy_compared=241,legacy_unsupported=72,true_ruling_stops=0,multiple_defense_and_target_return_scope='isolated contract inputs; not legal match samples')
    (output/'variants.json.gz').write_bytes(blob);(output/'summary.json').write_bytes(raw(summary))
    sources=sorted((ROOT/'tools').glob('*.py'))+[Path(__file__)]
    manifest=dict(compressed_sha256=sha(blob),raw_sha256=sha(raw(payload)),execution_sources_sha256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sources},canonical_source_sha256=variants.x.source_hashes(),input_sha256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sorted((ROOT/'data/proxy-gap-fixtures-112').glob('*.json'))},baseline_441_sha256=sha((variants.BASE/'targeted.json.gz').read_bytes()))
    (output/'manifest.json').write_bytes(raw(manifest));print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);run(parser.parse_args().output)
