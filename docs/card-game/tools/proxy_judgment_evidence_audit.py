"""455: immutable record projection; neither a strategy verifier nor admission authority."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PINS={
 '114-normal-decision-protocol-hardening.md':'aa161063e4fa9e056818d00e3fe799448107b3b51f00c05e67c2c89c3a50e59a',
 '116-normal-decision-fallback-contract.md':'577dccec67343ead75aa813b464b432679927c2f4b71ed960be5058aaa3ef393',
 '119-response-window-contract.md':'c79e89709c687211ae5ca4a2ba3328e285ffafcf9b7790f913ae5ceb953cba45',
 '454-all-judgment-evaluation-design.md':'37b2441ca93a55a12773b975a6388b8151f08b0ba9bf23022b71e5c57e425220',
}
KINDS=('normal_action','mandatory_choice','response_action')
MODES=('priority_unique','safe_free_development','seeded_fallback','response_unique','response_seeded_fallback')
BASES=('upper_priority_unique','resource_pareto_unique','certified_safe_free_unique','fully_equal_tie_break','seeded_frontier')
SEEDED=('seeded_fallback','response_seeded_fallback')
REASONS=('strategic_unresolved_seeded_fallback','strategic_unresolved_response_seeded_fallback')

def canonical(value):
 return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2,allow_nan=False)+'\n').encode()

def sha(value):return hashlib.sha256(canonical(value)).hexdigest()

def contract():
 for path,expected in PINS.items():
  if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=expected:raise ValueError('contract revision differs: '+path)
 return dict(schema='judgment_evidence_audit.v1',can_admit_balance=False,can_select_candidates=False,
             validation_meaning='exact_projection_of_supplied_source_not_game_or_strategy_validation',
             source_pins=dict(PINS),judgment_kinds=list(KINDS),
             unreverified_layers=['legality_evidence','selection_evidence','opportunity_coverage','experiment_design'])

def require(condition,message):
 if not condition:raise ValueError(message)

def project(record,index):
 require(type(record) is dict,'decision must be object')
 normal='inventory' in record
 kind=record.get('context',{}).get('decision_kind') if normal else record.get('decision_kind')
 require(type(kind) is str and kind in KINDS,'unknown decision kind')
 require(not normal or kind=='normal_action','normal wrapper kind differs')
 wrapper=record.get('choice') if normal else record
 require(type(wrapper) is dict,'choice must be object')
 basis=wrapper.get('selection_basis')
 if basis is not None:require(type(basis) is str and basis in BASES,'unknown selection basis')
 nested=wrapper.get('decision_record')
 require(nested is None or type(nested) is dict,'nested decision must be object')
 actual=nested if nested is not None else wrapper
 for outer in (record,wrapper):
  if outer is actual:continue
  for field in ('resolution_mode','strategic_unresolved','reason_code'):
   if field in outer:require(canonical(outer[field])==canonical(actual.get(field)),'conflicting outer exclusion evidence: '+field)
 mode=actual.get('resolution_mode')
 require((type(mode) is str and mode in MODES) or (mode is None and basis in BASES and basis!='seeded_frontier'),'unknown resolution mode')
 if basis=='seeded_frontier':require(mode=='seeded_fallback','seeded wrapper lacks seeded record')
 flag=actual.get('strategic_unresolved')
 require(flag is None or type(flag) is bool,'strategic flag must be bool or absent')
 ids=record['inventory'].get('legal_candidate_ids') if normal else record.get('legal_candidates',record.get('legal_candidate_ids'))
 require(type(ids) is list and len(ids)>0 and all(type(x) is str and x for x in ids),'legal candidates missing')
 require(len(ids)==len(set(ids)),'duplicate legal candidate')
 if nested is not None:
  require(nested.get('decision_kind')==kind,'nested decision kind differs')
  nested_ids=nested.get('legal_candidates')
  require(type(nested_ids) is list and len(nested_ids)==len(ids) and set(nested_ids)==set(ids),'nested legal candidates differ')
 selected=record.get('selected_candidate')
 require(type(selected) is str and selected in ids,'selected candidate absent')
 for obj in (wrapper,actual):
  if 'selected_candidate' in obj:require(obj['selected_candidate']==selected,'nested selected differs')
 reason=actual.get('reason_code')
 require(reason is None or type(reason) is str,'reason must be string')
 return dict(index=index,record_sha256=sha(record),kind=kind,recorded_mode=mode,recorded_selection_basis=basis,
             recorded_strategic_unresolved=flag,recorded_reason_code=reason,
             legal_candidate_ids=list(ids),selected_candidate=selected,
             observed_singleton=len(ids)==1,seeded_mode=mode in SEEDED,
             unresolved_evidence=flag is True or reason in REASONS,
             record_structure='checked',legality_evidence='not_reverified',selection_evidence='not_reverified')

def build_sidecar(run):
 c=contract()
 require(type(run) is dict and type(run.get('run_id')) is str and bool(run['run_id']),'run ID missing')
 require(type(run.get('decisions')) is list,'decisions missing')
 rows=[project(record,i) for i,record in enumerate(run['decisions'])]
 seeded=sum(r['seeded_mode'] for r in rows);unresolved=sum(r['unresolved_evidence'] for r in rows)
 return dict(schema=c['schema'],contract_sha256=sha(c),run_id=run['run_id'],run_sha256=sha(run),decisions=rows,
             counts={kind:sum(r['kind']==kind for r in rows) for kind in KINDS},
             opportunity_coverage='not_reverified',experiment_design='not_assessed',
             evaluation=dict(status='excluded_by_116' if seeded or unresolved else 'not_assessed',admitted=None,
                             seeded_mode_count=seeded,unresolved_evidence_count=unresolved))

def validate_sidecar(value,run):
 try:
  expected=build_sidecar(run)
  return [] if canonical(value)==canonical(expected) else ['sidecar differs from source projection']
 except (ValueError,TypeError,KeyError,AttributeError,OSError) as exc:
  return ['invalid source or sidecar: '+str(exc)]
