"""Pure comparison for the explicitly opted-in resource value pilot.

Value relations are adjudicated public evidence, never scores inferred from
hidden state. Structural defects are errors; explicit incomparability is valid.
"""
import copy
import itertools
import math
import re
from proxy_normal_decision_fallback_contract import validate_safe_free_placement

UPPER_KEYS = ('avoid_loss_or_abort','maintain_or_prevent_100','certain_growth_difference')
COMPONENTS = ('hand','board','reservations')
RELATIONS = {'better','equal','worse','incomparable'}
CANDIDATE_KEYS = {'candidate_id',*UPPER_KEYS,'time_after_certain_resolution',
                  'payment_time','consumed_card_count','card_copy_id'}
PROBLEM_KEYS = {'view_sha256','legal_candidate_ids','candidate_set_evidence','candidates','pairs','seed_context'}
PAIR_KEYS = {'left_id','right_id','view_sha256','kind','relations','reason','source_refs'}

def _number(value):
    return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)

def _text(value):
    return isinstance(value,str) and bool(value)

def _hash(value):
    return isinstance(value,str) and re.fullmatch('[0-9a-f]{64}',value) is not None

def validate_problem(problem: dict) -> list[str]:
    errors=[]
    if not isinstance(problem,dict) or set(problem)!=PROBLEM_KEYS:
        return ['problem keys differ']
    if not _hash(problem['view_sha256']):errors.append('invalid visible boundary hash')
    ids=problem['legal_candidate_ids']
    if not isinstance(ids,list) or not ids or any(not _text(x) for x in ids):return errors+['invalid legal IDs']
    if ids!=sorted(set(ids)):errors.append('legal IDs must be unique and sorted')
    ev=problem['candidate_set_evidence']
    if not isinstance(ev,dict) or ev.get('candidate_set_complete') is not True:errors.append('candidate set not proved complete')
    candidates=problem['candidates']
    if not isinstance(candidates,list):return errors+['candidates must be an array']
    seen=[]
    for c in candidates:
        if not isinstance(c,dict) or set(c)!=CANDIDATE_KEYS:
            errors.append('candidate keys differ');continue
        seen.append(c['candidate_id'])
        if not _text(c['candidate_id']) or not _text(c['card_copy_id']):errors.append('invalid candidate identifier')
        for key in (*UPPER_KEYS,'time_after_certain_resolution','payment_time','consumed_card_count'):
            if not _number(c[key]):errors.append('invalid numeric '+key)
        for key in ('time_after_certain_resolution','payment_time','consumed_card_count'):
            if _number(c[key]) and c[key]<0:errors.append('negative resource '+key)
        if type(c['consumed_card_count']) is not int:errors.append('consumption must be an integer')
    if len(seen)!=len(ids) or any(not _text(x) for x in seen) or sorted(seen)!=ids:errors.append('candidate inventory differs')
    if not isinstance(problem['seed_context'],dict):errors.append('seed context must be an object')
    if errors:return errors
    by_id={c['candidate_id']:c for c in candidates}
    best=max(tuple(c[k] for k in UPPER_KEYS) for c in candidates)
    upper=sorted(c['candidate_id'] for c in candidates if tuple(c[k] for k in UPPER_KEYS)==best)
    expected=set(itertools.combinations(upper,2));seen_pairs=[]
    if not isinstance(problem['pairs'],list):return ['pairs must be an array']
    for pair in problem['pairs']:
        if not isinstance(pair,dict):errors.append('pair must be an object');continue
        safe=pair.get('kind')=='certified_safe_free_development'
        if set(pair)!=(PAIR_KEYS|({'safe_placement'} if safe else set())):errors.append('pair keys differ');continue
        a,b=pair['left_id'],pair['right_id']
        if not _text(a) or not _text(b) or a==b or a not in by_id or b not in by_id:
            errors.append('pair identifiers differ');continue
        seen_pairs.append(tuple(sorted((a,b))))
        if pair['view_sha256']!=problem['view_sha256']:errors.append('pair boundary differs')
        if pair['kind'] not in ('ordinary','certified_safe_free_development'):errors.append('pair kind differs')
        relation=pair['relations']
        if not isinstance(relation,dict) or set(relation)!=set(COMPONENTS) or any(not isinstance(v,str) or v not in RELATIONS for v in relation.values()):errors.append('invalid component relations')
        if not _text(pair['reason']):errors.append('pair reason absent')
        refs=pair['source_refs']
        if not isinstance(refs,list) or not refs or any(not _text(x) for x in refs) or len(set(refs))!=len(refs):errors.append('pair source evidence absent')
        if safe:
            placement=pair['safe_placement'];errors.extend(validate_safe_free_placement(placement))
            if isinstance(placement,dict):
                cid=placement.get('candidate_id')
                if not _text(cid) or set((a,b))!={cid,'pass'}:errors.append('safe certificate must compare placement with pass')
                if _text(cid) and cid in by_id and 'pass' in by_id:
                    c=by_id[cid]
                    if c['payment_time']!=0 or c['consumed_card_count']!=0 or c['card_copy_id']!=placement.get('card_copy_id'):errors.append('safe certificate candidate differs')
                    if by_id['pass']['time_after_certain_resolution']!=c['time_after_certain_resolution']:errors.append('safe placement time differs from pass')
    if len(seen_pairs)!=len(expected) or set(seen_pairs)!=expected:errors.append('pair coverage missing or duplicated')
    return errors

def compare_problem(problem: dict) -> dict:
    errors=validate_problem(problem)
    if errors:raise ValueError('; '.join(errors))
    by_id={c['candidate_id']:c for c in problem['candidates']}
    best=max(tuple(c[k] for k in UPPER_KEYS) for c in by_id.values())
    upper=sorted(cid for cid,c in by_id.items() if tuple(c[k] for k in UPPER_KEYS)==best)
    edges={cid:set() for cid in upper};results=[];excluded=[]
    for pair in problem['pairs']:
        a,b=pair['left_id'],pair['right_id'];left,right=by_id[a],by_id[b]
        t=left['time_after_certain_resolution']-right['time_after_certain_resolution']
        relations={'time':'better' if t>0 else 'worse' if t<0 else 'equal',**pair['relations']}
        values=set(relations.values());winner=None
        if pair['kind']=='certified_safe_free_development':
            winner=pair['safe_placement']['candidate_id'];relation='certified_dominance'
        elif values=={'equal'}:relation='equal'
        elif values <= {'equal','better'} and 'better' in values:winner=a;relation='dominance'
        elif values <= {'equal','worse'} and 'worse' in values:winner=b;relation='dominance'
        else:relation='incomparable'
        if winner:
            loser=b if winner==a else a;edges[winner].add(loser)
            excluded.append({'candidate_id':loser,'dominated_by':winner,'source_refs':copy.deepcopy(pair['source_refs'])})
        results.append({'left_id':a,'right_id':b,'relations':relations,'relation':relation,'winner':winner,'kind':pair['kind']})
    active=set();done=set()
    def visit(cid):
        if cid in active:raise ValueError('dominance graph cycle')
        if cid in done:return
        active.add(cid)
        for target in sorted(edges[cid]):visit(target)
        active.remove(cid);done.add(cid)
    for cid in upper:visit(cid)
    losers=set().union(*edges.values()) if edges else set()
    frontier=sorted(set(upper)-losers)
    if not frontier:raise ValueError('empty frontier')
    selected=None;basis='seeded_frontier'
    if len(frontier)==1:
        selected=frontier[0]
        basis='upper_priority_unique' if len(upper)==1 else 'certified_safe_free_unique' if any(r['kind']=='certified_safe_free_development' and r['winner']==selected for r in results) else 'resource_pareto_unique'
    else:
        remaining=[r for r in results if r['left_id'] in frontier and r['right_id'] in frontier]
        if all(r['relation']=='equal' for r in remaining):
            key=lambda cid:tuple(by_id[cid][k] for k in ('payment_time','consumed_card_count','card_copy_id'))
            best_key=min(key(cid) for cid in frontier)
            winners=[cid for cid in frontier if key(cid)==best_key]
            if len(winners)==1:selected=winners[0];basis='fully_equal_tie_break'
    return copy.deepcopy({'view_sha256':problem['view_sha256'],'legal_candidate_ids':problem['legal_candidate_ids'],
        'upper_priority_survivors':upper,'pair_results':sorted(results,key=lambda r:(r['left_id'],r['right_id'])),
        'excluded_candidates':sorted(excluded,key=lambda r:(r['candidate_id'],r['dominated_by'])),
        'frontier_ids':frontier,'selection_basis':basis,'selected_candidate':selected})
