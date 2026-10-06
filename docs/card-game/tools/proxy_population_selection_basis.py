"""Conditional114/116/119 computation certificates, never a legality proof.

Only a source-reconstructed current record can bind these supplied inputs to
actual execution. No missing values, relations or comparator semantics added.
"""
import copy,hashlib
import proxy_normal_decision_hardening as priority
import proxy_normal_decision_fallback_contract as fallback
import proxy_response_window_seeded_restart as response
from proxy_population_unproved_priority import SOURCES as NORMAL_SOURCES
from proxy_population_opportunity_ledger import SOURCES as RESPONSE_SOURCES
from proxy_mandatory_policy_contract import ROOT,canonical


def audit(record):
 errors=[];kind=None;mode=None;sources=dict(NORMAL_SOURCES,**RESPONSE_SOURCES)
 try:
  for path,digest in sources.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('selection contract source changed')
  canonical(record)
  kind=record.get('decision_kind',record.get('context',{}).get('decision_kind'))
  choice=record.get('choice',record);mode=choice.get('resolution_mode')
  if any(r.get('strategic_unresolved') is True or r.get('seed_proof') is not None for r in (record,choice)) or mode in ('seeded_fallback','response_seeded_fallback'):raise ValueError('legacy exclusion is not a nonfallback certificate')
  if kind=='normal_action':
   if record.get('policy_id')!='legacy_107_114_116' or record['context']['decision_kind']!=kind:raise ValueError('normal contract context differs')
   p=record['problem'];ids=record['inventory']['legal_candidate_ids'];selected=record['selected_candidate']
   if not ids or ids!=sorted(set(ids)) or ids!=p['legal_candidate_ids'] or selected!=choice['selected_candidate'] or selected not in ids:raise ValueError('normal candidate/selection binding differs')
   rows=p['candidates']
   if len(rows)!=len(ids) or {r['candidate_id'] for r in rows}!=set(ids):raise ValueError('normal comparison coverage differs')
   if any(type(r.get(k)) is not int for r in rows for k in priority.PRIORITY_ORDER[:4]):raise ValueError('normal priority operands unproved')
   # Matches114's current legacy branch: no caller-invented resource relation.
   scores={r['candidate_id']:dict(r,value_comparison_to={}) for r in rows}
   winners=[i for i in ids if all(i==j or priority.compare_candidates(scores[i],scores[j])['winner']=='left' for j in ids)]
   if mode=='priority_unique':
    if winners!=[selected]:raise ValueError('normal unique comparison not proven')
   elif mode=='safe_free_development':
    if winners:raise ValueError('114 unique branch precedes safe development')
    if 'pass' not in scores or any(scores[selected][k]!=scores['pass'][k] for k in priority.PRIORITY_ORDER[:4]):raise ValueError('safe development upper priorities do not tie pass')
    certificates=[row['safe_placement'] for row in p['pairs'] if 'safe_placement' in row]
    if len(certificates)!=1 or fallback.validate_safe_free_placement(certificates[0]):raise ValueError('single safe certificate unavailable')
    context=dict(record['context'],choice_kind='zero_cost_person_placement')
    expected=fallback.resolve_safe_free_development(certificates,context,ids)
    if canonical(choice)!=canonical(expected):raise ValueError('safe selection proof differs')
    if any(priority.compare_candidates(scores[selected],scores[j])['winner']!='left' for j in ids if j not in ('pass',selected)):raise ValueError('paid exclusion not proven')
   else:raise ValueError('normal selection certificate unsupported')
  elif kind=='response_action':
   opportunity=record['candidate_set_evidence'];response._validate_response_opportunity(opportunity)
   details=opportunity['legal_candidate_details'];ids=opportunity['legal_candidate_ids']
   if len(ids)>1:
    known=lambda a:(a.get('candidate_id')=='response-pass' and a.get('action_type')=='response_pass') or (a.get('card_id')=='E-first-date' and a.get('resolution_condition_evidence',{}).get('legacy_five_growth_premises') is True)
    if not all(known(a) for a in details):raise ValueError('response comparison operand unproved')
    if sum(a.get('card_id')=='E-first-date' for a in details)!=1:raise ValueError('response unique comparison not proven')
   # Neither permitted branch consumes seed context. It is not sampled material.
   expected=response.resolve_response_choice(dict(order_id='unused_nonfallback_check',actor_turn_index=1,round=1),opportunity)
   if expected['resolution_mode'] not in ('response_unique','priority_unique') or canonical(record)!=canonical(expected):raise ValueError('response computation record differs')
  else:raise ValueError('selection computation scope unsupported')
 except (ValueError,KeyError,TypeError,OSError,AttributeError) as error:errors.append(str(error))
 return dict(schema='existing_selection_computation.v1',decision_kind=kind,resolution_mode=mode,
  selection_computation_verified=not errors,errors=errors,source_sha256=sources,
  operand_provenance_verified=False,legality_proven=False,origin_authenticated=False,
  strategic_optimality_proven=False,policy_eligible=None,balance_admitted=None)
