"""Regenerate analysis only; never execute changed policy decisions or matches."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
import proxy_completed_comparison as saved
import proxy_fallback_audit as audit


def run(output):
    inputs=saved.load_inputs()
    source_manifest=json.loads((ROOT/'data/proxy-continuation-batch-439/manifest.json').read_bytes())
    for f,h in source_manifest['execution_sources_sha256'].items():
        if hashlib.sha256((ROOT/f).read_bytes()).hexdigest()!=h:raise ValueError('historical source changed: '+f)
    report=audit.audit(*inputs);raw=audit.canonical(report);blob=gzip.compress(raw,mtime=0)
    files=['data/proxy-continuation-batch-439/paired.json.gz','data/proxy-continuation-batch-439/manifest.json',
           'data/proxy-completed-evaluation-440/shadow.json.gz','data/proxy-completed-evaluation-440/manifest.json',
           'data/proxy-gap-validation-441/legacy-limits.json','data/proxy-comparison-closeout-443/comparison.json',
           'tools/proxy_completed_comparison.py','tools/proxy_fallback_audit.py','tools/proxy_resource_value_comparison.py',
           'tools/proxy_resource_value_selection.py','data/proxy-fallback-audit-444/reproduce.py',
           'plans/2026-10-01-normal-decision-resource-pilot-design.md',
           'tools/proxy_continuation_candidates.py','tools/proxy_resource_value_shadow.py']
    closeout=json.loads((ROOT/'data/proxy-comparison-closeout-443/comparison.json').read_bytes())
    if saved.summarize(*inputs)!=closeout:raise ValueError('443 saved comparison differs')
    manifest=dict(base_commit='f0c6f0da932a28f4ac610b008a1822a23d532631',
                  input_and_analysis_sha256={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files},
                  historical_execution_source_hashes_verified=len(source_manifest['execution_sources_sha256']),
                  compressed_sha256=hashlib.sha256(blob).hexdigest(),raw_sha256=hashlib.sha256(raw).hexdigest(),
                  summary_sha256=hashlib.sha256(audit.canonical(report['summary'])).hexdigest())
    output.mkdir(parents=True,exist_ok=True)
    for name,content in [('audit.json.gz',blob),('summary.json',audit.canonical(report['summary'])),('manifest.json',audit.canonical(manifest))]:
        (output/name).write_bytes(content)
    print(json.dumps(report['summary'],ensure_ascii=False,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);run(p.parse_args().output)
