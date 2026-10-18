"""Same-input 313-row comparison. Historical 72 remain outside the 241 cohort."""
import argparse
import copy
import gzip
import hashlib
import json
from collections import Counter
from pathlib import Path
import proxy_completed_comparison as saved
import proxy_fallback_audit as audit
from proxy_equivalence_inputs import project_equivalence_view, build_input, source_manifest
from proxy_equivalence_selection import select_equivalence, validate_equivalence
from proxy_resource_value_selection import canonical_sha256 as sha
from proxy_resource_value_integration import canonical


def bind_sources(paired,shadow,limits):
 checked=audit.audit(paired,shadow,limits);groups={r['shadow_id']:r['group'] for r in checked['rows']};unsupported=set(checked['unsupported_ids'])
 runs={r['run_id']:r for r in paired['results']};rows=[]
 for r in sorted(shadow['results'],key=lambda r:r['shadow_id']):
  run=runs[r['source_run_id']];seq=r['source_event_seq'];d=next(d for d in run['decisions'] if 'inventory'in d and d['event_seq']==seq)
  e=next(e for e in run['snapshots'] if e['event_seq']==seq)
  rows.append(dict(shadow_id=r['shadow_id'],group='legacy_unsupported' if r['shadow_id'] in unsupported else groups.get(r['shadow_id'],'control'),envelope=e,decision=d,historical=r))
 return rows


def row_input(row):
 d=row['decision'];v=project_equivalence_view(row['envelope'],d['context']['actor'],d['inventory']['public_history'])
 return build_input(v,d['inventory'],d['problem'],source_manifest())


def execution_sources():
 paths=set((saved.ROOT/'tools').glob('proxy_equivalence_*.py'))
 paths.update(saved.ROOT/'tools'/n for n in ('proxy_continuation_candidates.py','proxy_continuation_runner.py'))
 return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


def validate_manifest(manifest):
 from proxy_equivalence_inputs import validate_sources
 if manifest.get('canonical_sources')!=source_manifest():return ['canonical source manifest differs']
 errors=validate_sources(manifest['canonical_sources'],saved.ROOT)
 if manifest.get('tools_sha256')!=execution_sources():errors.append('execution source manifest differs')
 return errors


def hidden_variants(row):
 actor=row['decision']['context']['actor'];opponent='B' if actor=='A' else 'A'
 for name in ('opponent_hand','deck_middle','opponent_concealed_prepared'):
  changed=copy.deepcopy(row);e=changed['envelope'];g=e['legacy_continuation']['game_state'];players=g['players']
  if name=='opponent_hand':players[opponent]['hand'].reverse()
  elif name=='deck_middle':
   for p in players.values():p['deck'][1:-1]=reversed(p['deck'][1:-1])
  else:
   for sid in players[opponent]['board']['prepared']:
    if not e['runtime']['public_prepared'][sid]['face_up']:
     # Metamorphic privacy probe: the projection must never observe this ID.
     g['cards'][sid]['card_id']='concealed-identity-probe'
  yield name,changed


def check_hidden_regions(row):
 d=row['decision'];project=lambda r:project_equivalence_view(r['envelope'],d['context']['actor'],d['inventory']['public_history'])
 original=project(row);checks={}
 for name,altered in hidden_variants(row):
  checks[name]=dict(attempted=True,changed=altered['envelope']!=row['envelope'],passed=project(altered)==original)
  if not checks[name]['passed']:raise ValueError('hidden region changed public projection')
 return checks


def summarize_rows(rows):
 groups={};reasons=Counter();candidate_status=Counter();pair_reasons=Counter()
 for group in sorted({r['group'] for r in rows}):
  rs=[r for r in rows if r['group']==group]
  old=sum(r['selection']['baseline_selection']['selection_basis']=='seeded_frontier' for r in rs)
  new=sum(r['selection']['selection_basis']=='seeded_frontier' for r in rs)
  groups[group]=dict(decisions=len(rs),baseline_414_fallback=old,equivalence_fallback=new,fallback_reduction=old-new,
   selected_changes=sum(r['selection']['selected_candidate']!=r['selection']['baseline_selection']['selected_candidate'] for r in rs),
   frontier_changes=sum(r['selection']['frontier_report']['frontier_ids']!=r['selection']['baseline_selection']['frontier_report']['frontier_ids'] for r in rs),
   proved_equal_pairs=sum(p['status']=='proved_equal' for r in rs for p in r['selection']['pair_proofs']))
 for r in rows:
  for o in r['selection']['outcomes']:
   candidate_status['generator_unsupported' if 'generator_unsupported' in o['unknowns'] else 'public_prefix_proved_unresolved_tail']+=1
   reasons.update(o['unknowns'])
  for p in r['selection']['pair_proofs']:pair_reasons.update(p['unknowns'])
 return dict(planned=len(rows),groups=groups,candidate_status=dict(candidate_status),outcome_unknowns=dict(reasons),pair_unknowns=dict(pair_reasons),hidden_order_checks=sum(r['hidden_order_checks'] for r in rows),hidden_regions={name:{key:sum(r.get('hidden_regions',{}).get(name,{}).get(key,False) for r in rows) for key in ('attempted','changed','passed')} for name in ('opponent_hand','deck_middle','opponent_concealed_prepared')},policy_promoted=False,independent_balance_sample_count=0)


def evaluate_saved(source_root: Path, output_dir: Path) -> dict:
 if source_root.resolve()!=saved.ROOT.parents[1]:raise ValueError('source root must match loaded checkout')
 inputs=saved.load_inputs();bound=bind_sources(*inputs);rows=[]
 for row in bound:
  x=row_input(row);w=select_equivalence(x);checks=check_hidden_regions(row)
  for variant,altered in hidden_variants(row):
   xx=row_input(altered)
   if xx!=x or select_equivalence(xx)!=w:raise ValueError('hidden permutation changed proof or selection')
  rows.append(dict(shadow_id=row['shadow_id'],group=row['group'],input=x,selection=w,baseline=x['baseline_problem'],
   historical_policies=row['historical']['policies'],source_envelope_sha256=row['historical']['source_envelope_sha256'],hidden_regions=checks,hidden_order_checks=sum(c['changed'] for c in checks.values())))
 report=dict(schema='naotocchi.card_game.equivalence_evaluation.v1',planned_ids=[r['shadow_id'] for r in rows],rows=rows,summary=summarize_rows(rows))
 output_dir.mkdir(parents=True,exist_ok=True);raw=canonical(report);blob=gzip.compress(raw,mtime=0)
 (output_dir/'shadow.json.gz').write_bytes(blob);(output_dir/'summary.json').write_bytes(canonical(report['summary']))
 manifest=dict(artifact='shadow.json.gz',raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(blob).hexdigest(),
  canonical_sources=source_manifest(),tools_sha256=execution_sources(),
  planned_ids=report['planned_ids'],policy_promoted=False,independent_balance_sample_count=0)
 (output_dir/'manifest.json').write_bytes(canonical(manifest));return report


def validate_saved(output_dir: Path, source_root: Path) -> list[str]:
 try:
  if source_root.resolve()!=saved.ROOT.parents[1]:return ['source checkout differs']
  m=json.loads((output_dir/'manifest.json').read_text());blob=(output_dir/'shadow.json.gz').read_bytes();raw=gzip.decompress(blob)
  if hashlib.sha256(blob).hexdigest()!=m['compressed_sha256'] or hashlib.sha256(raw).hexdigest()!=m['raw_sha256']:return ['artifact hashes differ']
  errors=validate_manifest(m)
  if errors:return errors
  r=json.loads(raw);bound=bind_sources(*saved.load_inputs())
  if r['planned_ids']!=m['planned_ids'] or r['planned_ids']!=[x['shadow_id'] for x in bound] or len(r['rows'])!=len(bound):return ['manifest coverage differs']
  for row,b in zip(r['rows'],bound):
   x=row_input(b)
   if row['shadow_id']!=b['shadow_id'] or row['group']!=b['group'] or row['input']!=x or row['baseline']!=x['baseline_problem'] or row['historical_policies']!=b['historical']['policies'] or row['source_envelope_sha256']!=b['historical']['source_envelope_sha256']:return ['row source binding differs']
   checks=check_hidden_regions(b)
   if row.get('hidden_regions')!=checks or row['hidden_order_checks']!=sum(c['changed'] for c in checks.values()):return ['hidden-region evidence differs']
   errors=validate_equivalence(row['selection'],x)
   if errors:return errors
  if r['summary']!=summarize_rows(r['rows']) or json.loads((output_dir/'summary.json').read_text())!=r['summary']:return ['summary differs']
  return []
 except (OSError,ValueError,KeyError,TypeError):return ['invalid saved equivalence artifact']

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
 a=p.parse_args();r=evaluate_saved(a.source_root,a.output);print(json.dumps(r['summary'],ensure_ascii=False,sort_keys=True))
