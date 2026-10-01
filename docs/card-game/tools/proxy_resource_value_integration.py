"""Verify signed compressed observations and recompute 414 evaluation."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import proxy_resource_value_evaluation as evaluation
from proxy_resource_value_selection import validate_selection

ROOT=Path(__file__).resolve().parents[3]
PILOT=ROOT/'docs/card-game/data/proxy-resource-value-pilot'
MANIFEST='evaluation-checkpoint-429/manifest.json'

def sha(raw):return hashlib.sha256(raw).hexdigest()
def canonical(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def _checked(raw,digest):
    if sha(raw)!=digest:raise ValueError('signed artifact raw differs')
    return raw

def load_saved(pilot=PILOT):
    pilot=Path(pilot);manifest=json.loads((pilot/MANIFEST).read_text())
    packed=_checked((pilot/manifest['shadow_file']).read_bytes(),manifest['shadow_gzip_sha256'])
    shadow_raw=_checked(gzip.decompress(packed),manifest['shadow_raw_sha256'])
    paired_manifest_path=pilot/manifest['paired_manifest'];m=json.loads(paired_manifest_path.read_text())
    delta_raw=_checked(gzip.decompress(_checked((paired_manifest_path.parent/'paired-delta.json.gz').read_bytes(),m['delta_gzip_sha256'])),m['delta_raw_sha256'])
    delta=json.loads(delta_raw)
    base_raw=_checked(gzip.decompress((pilot/m['base_file']).read_bytes()),m['base_raw_sha256'])
    if delta['base_file']!=m['base_file'] or delta['base_raw_sha256']!=m['base_raw_sha256'] or len(delta['operations'])!=m['operation_count']:raise ValueError('paired delta base/coverage differs')
    paired=json.loads(base_raw)
    for op in delta['operations']:
        row=paired['results'][op['result_index']]
        if row['run_id']!=op['run_id']:raise ValueError('delta result ID differs')
        if op['mode']=='replace':row[op['field']]=copy.deepcopy(op['value'])
        elif op['mode']=='append':
            if len(row[op['field']])!=op['base_length']:raise ValueError('delta append base length differs')
            row[op['field']].extend(copy.deepcopy(op['value']))
        else:raise ValueError('unknown delta operation')
    paired_raw=_checked(canonical(paired),m['reconstructed_raw_sha256'])
    if sha(paired_raw)!=delta['reconstructed_raw_sha256'] or sha(paired_raw)!=manifest['paired_reconstructed_raw_sha256']:raise ValueError('paired reconstruction differs')
    return dict(shadow=json.loads(shadow_raw),paired=paired,evaluation=json.loads((pilot/manifest['evaluation_file']).read_text()),
        source_raw_sha256={'docs/card-game/data/proxy-resource-value-pilot/shadow-checkpoint-428/shadow.json':sha(shadow_raw),
            'docs/card-game/data/proxy-resource-value-pilot/trajectory-checkpoint-427/paired.json':sha(paired_raw)})

def validate_protected(root,manifest):
    errors=[]
    for name,digest in manifest.items():
        path=Path(root)/name
        if not path.is_file() or sha(path.read_bytes())!=digest:errors.append('protected raw differs: '+name)
    return errors

def validate_data(data):
    errors=[]
    try:
        shadow,paired=data['shadow'],data['paired']
        if shadow['planned']!=110 or paired['planned']!=8:raise ValueError('110/8 planned coverage differs')
        policies={'legacy_107_114_116','resource_value_pilot_v1'}
        if {r['policy_id'] for r in paired['results']}!=policies or len({r['path_id'] for r in paired['results']})!=4:raise ValueError('two policies/four paths differ')
        for row in paired['results']:
            if row['run_id']!=row['policy_id']+':'+row['path_id']:raise ValueError('run ID differs from policy/path')
            if row.get('legacy_prefix_validation'):raise ValueError('legacy prefix validation failed')
            if row['independent_balance_sample_count']!=0:raise ValueError('pilot included in balance')
            for decision in row['decisions']:
                if 'selection' in decision:
                    found=validate_selection(decision['selection'],decision['problem'])
                    if found:errors.extend(found)
        for row in shadow['results']:
            if row['status']=='compared':errors.extend(validate_selection(row['pilot'],row['problem']))
        fresh=evaluation.build_evaluation(shadow,paired)
        fresh['source_raw_sha256']=data['source_raw_sha256']
        if fresh!=data['evaluation']:errors.append('evaluation differs from recomputed verified observations')
        for report in (shadow,paired,data['evaluation']):
            if report['policy_promoted'] or report['independent_balance_sample_count']!=0:errors.append('pilot promotion/balance guard differs')
    except (ValueError,KeyError,TypeError,IndexError) as error:errors.append(str(error))
    return errors

def validate_saved(pilot=PILOT):
    try:
        data=load_saved(pilot);errors=validate_data(data)
        baseline=json.loads((ROOT/'docs/card-game/data/proxy-verification-410-20261001/protected-data-baseline.json').read_text())
        errors.extend(validate_protected(ROOT,baseline))
        errors.extend(validate_protected(ROOT,data['shadow']['source_raw_sha256']))
        return errors
    except (OSError,ValueError,KeyError,TypeError,IndexError) as error:return [str(error)]

if __name__=='__main__':
    errors=validate_saved();print(json.dumps(dict(errors=errors),ensure_ascii=False));raise SystemExit(bool(errors))
