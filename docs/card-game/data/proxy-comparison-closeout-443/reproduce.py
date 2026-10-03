"""Rebuild the closeout from immutable439/440/441 inputs; optional eight-run replay."""
import argparse,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools'))
import proxy_completed_comparison as comparison

def canonical(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def run(output,replay=False):
    output.mkdir(parents=True,exist_ok=True);inputs=comparison.load_inputs();paired,shadow,limits=inputs
    import proxy_continuation_batch_runner as runner
    import proxy_resource_value_evaluation as metrics
    fresh=metrics.evaluate_trajectories(dict(planned_ids=paired['planned_ids']),[runner.metric_shape(r) for r in paired['results']]);fresh.update(policy_promoted=False,comparison_basis='same_135_initial_routes_and_current_execution_edition',foundation_repairs_counted_as_adoption_evidence=False)
    if fresh!=paired['trajectory_observations']:raise ValueError('historical metrics reproduction differs')
    source_manifest=json.loads((ROOT/'data/proxy-continuation-batch-439/manifest.json').read_text())
    if not all(hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h for f,h in source_manifest['execution_sources_sha256'].items()):raise ValueError('439 engine/source edition differs')
    result=comparison.summarize(*inputs)
    files=['data/proxy-continuation-batch-439/paired.json.gz','data/proxy-continuation-batch-439/manifest.json','data/proxy-completed-evaluation-440/shadow.json.gz','data/proxy-completed-evaluation-440/manifest.json','data/proxy-gap-validation-441/legacy-limits.json','tools/proxy_completed_comparison.py','tools/proxy_resource_value_evaluation.py','data/proxy-comparison-closeout-443/reproduce.py']
    manifest=dict(base_commit='40d48a37b6d549922416501e86d6325e231cddb8',input_and_analysis_sha256={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files},historical_439_sources_verified=len(source_manifest['execution_sources_sha256']),historical_metrics_reproduced=True,comparison_sha256=hashlib.sha256(canonical(result)).hexdigest())
    (output/'comparison.json').write_bytes(canonical(result));(output/'manifest.json').write_bytes(canonical(manifest))
    if replay:
        initial={r['path_id']:r for r in runner.base.old.load_initial_routes()};verified=[]
        for saved in paired['results']:
            errors=runner.validate_route(saved,initial[saved['path_id']],saved['policy_id'])
            if errors:raise ValueError(str(errors))
            verified.append(saved['run_id']);print('PASS',saved['run_id'],flush=True)
        (output/'independent-replay.json').write_bytes(canonical(dict(verified=verified,count=len(verified),new_independent_samples=0)))
    print('comparison generated',len(result['routes']),len(result['pairs']),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--replay',action='store_true');a=p.parse_args();run(a.output,a.replay)
