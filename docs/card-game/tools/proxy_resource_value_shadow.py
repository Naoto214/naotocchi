"""Read-only comparison of the 110 historical normal-action boundaries.

Missing comparison proof is retained as unsupported, never turned into a seed.
Historical choices are independently recomputed with 114 and 116.
"""
import argparse
import collections
import copy
import hashlib
import itertools
import json
from pathlib import Path
import proxy_start_response_138 as start
import proxy_normal_decision_hardening as priority
import proxy_normal_decision_fallback_contract as fallback
from proxy_resource_value_inputs import project_visible, validate_sources, build_problem
from proxy_resource_value_comparison import CANDIDATE_KEYS
from proxy_resource_value_selection import canonical_sha256, select_problem

ROOT=Path(__file__).resolve().parents[3]
DATA=ROOT/'docs/card-game/data'
OBSERVATION='proxy-completed-batch-observation-412-20261001.json'
EXCLUDED='proxy-new-seed-followup-replay-241-20260926.json'

def source_manifest(data_dir):
    raw=(Path(data_dir)/OBSERVATION).read_bytes()
    if hashlib.sha256(raw).hexdigest()!='8c85dfdc8a21348810a1a120f6b5a3a6b1fb3a9b69781e61755c89f21096cfb4':raise ValueError('412 observation raw differs')
    observation=json.loads(raw)
    manifest=observation['source_raw_sha256']
    errors=validate_sources(manifest,Path(data_dir).parents[2])
    if errors:raise ValueError('; '.join(errors))
    if any(Path(p).name==EXCLUDED for p in manifest):raise ValueError('superseded 241 source')
    return copy.deepcopy(manifest)

def load_history(data_dir,manifest):
    root=Path(data_dir).parents[2];routes={r['path_id'] for r in json.loads((Path(data_dir)/OBSERVATION).read_text())['results']}
    decisions={p:{} for p in routes};shots={p:{} for p in routes};events={p:{} for p in routes}
    for name in sorted(manifest):
        report=json.loads((root/name).read_text())
        for row in report.get('results',[]):
            p=row.get('path_id')
            if p not in routes:continue
            es=row.get('new_events',row.get('events',[]))
            for event in es if isinstance(es,list) else []:
                seq=event['seq']
                if seq in events[p] and events[p][seq]!=event:raise ValueError('event alias differs')
                events[p][seq]=event
            ss=row.get('new_snapshots',row.get('snapshots',[]))
            for s in ss if isinstance(ss,list) else []:
                seq=s.get('event_seq',s.get('seq'));game=s.get('game_state',s.get('state'))
                gh=s.get('game_state_sha256',s.get('state_sha256'));cont=s.get('continuation_state');ch=s.get('continuation_state_sha256')
                if start.opening._stop_state_sha256(game)!=gh:raise ValueError('source game hash differs')
                if cont is not None and (cont['game_state']!=game or canonical_sha256(cont)!=ch):raise ValueError('source continuation hash differs')
                old=shots[p].get(seq)
                if old:
                    if old['game_state_sha256']!=gh or start.opening._canonical_stop_state(old['game_state'])!=start.opening._canonical_stop_state(game):raise ValueError('snapshot alias differs')
                    if cont is not None and old['continuation_state'] is not None and old['continuation_state']!=cont:raise ValueError('continuation alias differs')
                    if cont is None:continue
                shots[p][seq]=dict(game_state=game,game_state_sha256=gh,continuation_state=cont,continuation_state_sha256=ch,source_ref=name)
            ds=row.get('new_decisions',row.get('decisions',[]))
            for d in ds if isinstance(ds,list) else []:
                h=canonical_sha256(d)
                item=decisions[p].setdefault(h,dict(decision=d,source_refs=[]))
                item['source_refs'].append(name)
    observation=json.loads((Path(data_dir)/OBSERVATION).read_text())
    for route in observation['results']:
        p=route['path_id'];last=route['last_event_seq']
        if set(events[p])!=set(range(1,last+1)) or set(shots[p])!=set(range(last+1)):raise ValueError('full history coverage differs')
        for seq in range(1,last+1):
            e=events[p][seq];before=shots[p][seq-1];after=shots[p][seq]
            if (e.get('game_state_before_sha256',e.get('state_before_sha256')),e.get('game_state_after_sha256',e.get('state_after_sha256')))!=(before['game_state_sha256'],after['game_state_sha256']):raise ValueError('event game chain differs')
            if 'continuation_state_before_sha256' in e and (e['continuation_state_before_sha256'],e['continuation_state_after_sha256'])!=(before['continuation_state_sha256'],after['continuation_state_sha256']):raise ValueError('event continuation chain differs')
            if 'challenge' in e['action_type']:raise ValueError('challenge loss history requires separate adapter')
        for seq,shot in shots[p].items():
            shot['public_history']=dict(normal_challenge_losses_by_actor=[],last_valid_event_seq=seq,source_refs=sorted(manifest))
    return decisions,shots

def _score_evidence(data_dir):
    """Select score proofs only by exact path/seq/game/continuation boundary."""
    root=Path(data_dir).parents[2]
    raw=(Path(data_dir)/'proxy-verification-410-20261001/protected-data-baseline.json').read_bytes()
    if hashlib.sha256(raw).hexdigest()!='917de46a9babf5cdd717618bcef64b2af63c3f3f16a19c296a709da72f519e3a':raise ValueError('protected baseline manifest differs')
    baseline=json.loads(raw)
    evidence=collections.defaultdict(list)
    def walk(value,path,name,digest):
        if isinstance(value,dict):
            path=value.get('path_id',path)
            key=(path,value.get('event_seq',value.get('source_last_valid_event_seq')),
                 value.get('pre_game_state_sha256',value.get('source_game_state_sha256')),
                 value.get('pre_continuation_state_sha256',value.get('source_continuation_state_sha256')))
            if all(x is not None for x in key):
                scores=[]
                def collect(v):
                    if isinstance(v,dict):
                        if CANDIDATE_KEYS<=v.keys():scores.append(copy.deepcopy(v))
                        for c in v.values():collect(c)
                    elif isinstance(v,list):
                        for c in v:collect(c)
                collect(value)
                if scores:evidence[key].append(dict(scores=scores,source_ref=name,raw_sha256=digest))
            for child in value.values():walk(child,path,name,digest)
        elif isinstance(value,list):
            for child in value:walk(child,path,name,digest)
    for name,digest in baseline.items():
        if Path(name).parent!=Path('docs/card-game/data') or Path(name).name==EXCLUDED:continue
        raw=(root/name).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=digest:raise ValueError('supplemental source raw differs')
        walk(json.loads(raw),None,name,digest)
    return evidence

def load_observed_boundaries(data_dir=DATA):
    data_dir=Path(data_dir);manifest=source_manifest(data_dir);decisions,shots=load_history(data_dir,manifest)
    observation=json.loads((data_dir/OBSERVATION).read_text());rows=[];extra=_score_evidence(data_dir)
    for route in observation['results']:
        p=route['path_id']
        for entry in route['candidate_cardinalities']:
            if entry['decision_kind']!='normal_action':continue
            h=entry['decision_sha256'];record=decisions[p][h];d=record['decision']
            seq=d.get('event_seq',d.get('source_last_valid_event_seq'));s=shots[p][seq]
            if d.get('pre_game_state_sha256',d.get('source_game_state_sha256'))!=s['game_state_sha256'] or d.get('pre_continuation_state_sha256',d.get('source_continuation_state_sha256'))!=s['continuation_state_sha256']:
                raise ValueError('decision boundary hash differs')
            if s['continuation_state'] is None:raise ValueError('decision continuation absent')
            actor=s['game_state']['turn_player']
            evidence=extra.get((p,seq,s['game_state_sha256'],s['continuation_state_sha256']),[])
            sources=copy.deepcopy(manifest)
            for proof in evidence:sources[proof['source_ref']]=proof['raw_sha256']
            rows.append(dict(shadow_id=f'{p}:{seq}:{actor}:{h}',path_id=p,event_seq=seq,actor=actor,
                decision_sha256=h,decision=copy.deepcopy(d),continuation=copy.deepcopy(s['continuation_state']),public_history=copy.deepcopy(s['public_history']),
                source_refs=sorted(set(record['source_refs']+[s['source_ref']]+[x['source_ref'] for x in evidence])),source_raw_sha256=sources,score_evidence=evidence))
    counts=collections.Counter(r['path_id'] for r in rows)
    if len(rows)!=110 or len({r['shadow_id'] for r in rows})!=110 or counts!=dict(zip(('probe-01-a-first','probe-01-b-first','probe-02-a-first','probe-02-b-first'),(27,27,28,28))):raise ValueError('planned normal boundary coverage differs')
    return sorted(rows,key=lambda r:r['shadow_id'])

def _inputs(boundary):
    d=boundary['decision'];view=project_visible(boundary['continuation'],boundary['actor'])
    ids=d['legal_candidates'];details=d['legal_candidate_details']
    if d.get('candidate_set_complete') is not True or sorted(x['candidate_id'] for x in details)!=ids:raise ValueError('complete saved legal inventory absent')
    scores={};comparisons=[]
    def collect(value):
        if isinstance(value,dict):
            if CANDIDATE_KEYS<=value.keys():
                cid=value['candidate_id'];score=copy.deepcopy(value)
                if cid in scores and scores[cid]!=score:raise ValueError('saved scores conflict')
                scores[cid]=score
            if isinstance(value.get('score'),dict) and 'comparison' in value:comparisons.append(value)
            for child in value.values():collect(child)
        elif isinstance(value,list):
            for child in value:collect(child)
    collect(d)
    for proof in boundary.get('score_evidence',[]):
        for score in proof['scores']:collect(score)
    time=view['time'][boundary['actor']]
    common=dict(avoid_loss_or_abort=0,maintain_or_prevent_100=0,certain_growth_difference=0,consumed_card_count=0,value_comparison_to={})
    scores.setdefault('pass',dict(common,candidate_id='pass',time_after_certain_resolution=time,payment_time=0,card_copy_id=''))
    placements=[]
    # A saved certificate is independently validated against the owner-visible boundary.
    certificate=d.get('selected_placement')
    if certificate:
        if fallback.validate_safe_free_placement(certificate):raise ValueError('safe certificate invalid')
        action=next(x for x in details if x['candidate_id']==certificate['candidate_id'])
        source=action['source_instance_id'];hand={x['instance_id']:x for x in view['own_hand']}
        if source not in hand or action['action_type'] not in ('place_companion','place_partner') or action['candidate_variant'] not in ('empty_slot','start_relationship_stage_zero'):raise ValueError('safe certificate source/variant differs')
        board=view['own_board']
        if (action['action_type']=='place_companion' and len(board['companions'])>=3) or (action['action_type']=='place_partner' and board['partner'] is not None):raise ValueError('safe certificate slot differs')
        placements.append(copy.deepcopy(certificate))
        scores.setdefault(certificate['candidate_id'],dict(common,candidate_id=certificate['candidate_id'],time_after_certain_resolution=time,payment_time=0,card_copy_id=certificate['card_copy_id']))
    if boundary['event_seq']==4:
        import proxy_new_seed_normal_restart_141 as first
        table=json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())
        audited=dict(legal_candidate_details=details,legal_candidate_ids=ids)
        placements,fresh,_,_=first._scores(boundary['continuation'],audited,table)
        for cid,score in fresh.items():
            if cid in scores and scores[cid]!=score:raise ValueError('initial certain result score differs')
            scores[cid]=score
    # Use existing, text-checked adapters for omitted historical score fields.
    # No hidden deck value or outcome is evaluated by these helpers.
    import proxy_new_seed_normal_restart_147 as placement_source
    import proxy_new_seed_normal_choice_229 as paid_source
    import proxy_normal_action_extension as placement_registry
    table=json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())
    game=boundary['continuation']['game_state'];owner=game['players'][boundary['actor']]
    if owner['board']['main'] is not None or any(p['growth']>=100 for p in game['players'].values()) or boundary['continuation']['activation_zone'] or boundary['continuation']['pending_triggers']:
        raise ValueError('unproved certain-result upper-priority boundary')
    known={x['instance_id']:x for x in view['own_hand']}
    with placement_source.partner_placement_scope():
        placements=[]
        for action in details:
            cid=action['candidate_id']
            if action['action_type'] in ('place_companion','place_partner'):
                source=action['source_instance_id']
                if source not in known or action['card_id'] not in placement_registry.PLACEMENT_TEXT:
                    raise ValueError('placement text/safety classification absent')
                placement=start.opening._placement_for_card(source,known[source],table,view['own_board'])
                if placement is None or placement['candidate_id']!=cid or owner['person_placed']:
                    raise ValueError('placement source/slot/limit proof differs')
                placements.append(placement)
                scores.setdefault(cid,dict(common,candidate_id=cid,time_after_certain_resolution=time,payment_time=0,card_copy_id=placement['card_copy_id']))
            elif cid not in scores:
                cost,ref=paid_source.cost_and_effect(dict(final_continuation_state=boundary['continuation']),action)
                scores[cid]=dict(common,candidate_id=cid,time_after_certain_resolution=time-cost,payment_time=cost,
                    card_copy_id=known[action['source_instance_id']]['card_copy_id'])
    if certificate and certificate!=next((x for x in placements if x['candidate_id']==certificate['candidate_id']),None):
        raise ValueError('saved safe certificate differs from text-checked visible reconstruction')
    if set(scores)!=set(ids):raise ValueError('full candidate certain-result score evidence absent')
    for cid,score in scores.items():
        if score['time_after_certain_resolution']!=time-score['payment_time']:raise ValueError('certain time does not bind visible boundary')
        if cid!='pass':
            action=next(x for x in details if x['candidate_id']==cid)
            if action['source_instance_id'] not in {x['instance_id'] for x in view['own_hand']}:raise ValueError('score requires unsupported non-hand action')
    context=copy.deepcopy(d.get('seed_context')) or dict(contract_version=fallback.CONTRACT_VERSION,
        order_id=boundary['path_id'].rsplit('-',2)[0],actor=boundary['actor'],actor_turn_index=boundary['continuation']['game_state']['round'],
        round=boundary['continuation']['game_state']['round'],phase='normal_action',decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
    pairs=[];vh=canonical_sha256(view)
    for a,b in itertools.combinations(ids,2):
        # Card transfers/conditional effects have no universal hand or board value.
        # Reserve equality only where neither action creates/consumes a reservation.
        pair=dict(left_id=a,right_id=b,view_sha256=vh,kind='ordinary',
            relations=dict(hand='incomparable',board='incomparable',reservations='incomparable'),
            reason='public candidate actions known; future hand/board/reservation advantage not uniquely ordered',source_refs=boundary['source_refs'])
        cert=next((p for p in placements if {a,b}=={p['candidate_id'],'pass'}),None)
        if cert:pair.update(kind='certified_safe_free_development',safe_placement=cert,reason='saved 116 safe placement certificate validated against owner-visible source and slot')
        pairs.append(pair)
    pilot_scores=[{k:scores[cid][k] for k in CANDIDATE_KEYS} for cid in ids]
    # 141's historical score used instance IDs; its 116 certificate used copy IDs.
    # Retain the old score verbatim, and bind the pilot's copy field to visible cards.
    for candidate in pilot_scores:
        if candidate['candidate_id']!='pass':
            action=next(x for x in details if x['candidate_id']==candidate['candidate_id'])
            candidate['card_copy_id']=next(x['card_copy_id'] for x in view['own_hand'] if x['instance_id']==action['source_instance_id'])
    evidence=dict(candidates=pilot_scores,pairs=pairs,source_raw_sha256=boundary['source_raw_sha256'])
    inventory=dict(candidate_set_complete=True,legal_candidate_ids=ids,legal_candidate_details=details,
        candidate_set_evidence=dict(candidate_set_complete=True,source_ref=boundary['source_refs'][0],state_ref=boundary['decision_sha256'],enumeration_rule='saved complete targeted candidate details at exact source boundary'))
    return build_problem(view,inventory,evidence,context),scores,placements,comparisons

def legacy_select(boundary,problem):
    # Scores may carry historic value_comparison_to; never substitute pilot relations.
    _,scores,placements,comparisons=_inputs(boundary);d=boundary['decision'];ids=problem['legal_candidate_ids']
    if ids==['pass']:
        result=dict(selected_candidate='pass',resolution_mode='priority_unique',reason_code='time_balance' if 'priority_comparisons' in d else 'only_legal_normal_action',seed_proof=None)
    else:
        winners=[cid for cid in ids if all(cid==other or priority.compare_candidates(scores[cid],scores[other])['winner']=='left' for other in ids)]
        if len(winners)==1:
            result=dict(selected_candidate=winners[0],resolution_mode='priority_unique',reason_code='time_balance',seed_proof=None)
        elif placements and len(placements)==len([x for x in boundary['decision']['legal_candidate_details'] if x['action_type'] in ('place_companion','place_partner')]):
            # Paid candidates must independently lose to every certified placement.
            if any(priority.compare_candidates(scores[p['candidate_id']],scores[cid])['winner']!='left' for p in placements for cid in ids if cid!='pass' and cid not in {x['candidate_id'] for x in placements}):raise ValueError('legacy paid exclusion not reproduced')
            context=copy.deepcopy(problem['seed_context']);context['choice_kind']='zero_cost_person_placement'
            resolved=fallback.resolve_safe_free_development(placements,context,ids)
            if 'error' in resolved:raise ValueError(str(resolved))
            result={k:resolved[k] for k in ('selected_candidate','resolution_mode','reason_code','seed_proof')}
        else:raise ValueError('legacy full resolution proof unavailable')
    for row in comparisons:
        preferred=placements[0]['candidate_id'] if placements else 'pass'
        if priority.compare_candidates(scores[preferred],row['score'])!=row['comparison']:raise ValueError('legacy saved comparison not reproduced')
    return result

def _verify_legal_inventory(boundary):
    """Fresh existing enumeration; unsupported scope remains visible."""
    import proxy_new_seed_normal_audit_140 as normal
    import proxy_new_seed_normal_audit_156 as partner
    import proxy_new_seed_board_partner_audit_179 as goat
    import proxy_new_seed_normal_trigger_audit_146 as triggered
    table=json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())
    game=boundary['continuation']['game_state']
    # The old legality projector is used only on boundaries with no hidden board cards.
    if any(p['board']['prepared'] for p in game['players'].values()):raise ValueError('hidden prepared legality scope unsupported')
    view=normal.candidate.project_normal_action_information(dict(game_state=game,actor=boundary['actor']),boundary['public_history'])
    view['_verified_ability_uses']={}
    with partner.partner_response_scope(table),goat.partner_response_scope(table),triggered.trigger_scope(table):
        inventory,units,ids,details=normal.board._expected(view,table)
        row=dict(opportunity_context=dict(round=game['round'],turn_player=boundary['actor'],actor=boundary['actor'],phase='normal_action',decision_kind='normal_action',choice_kind='normal_action'),
            owner_state=view['players'][boundary['actor']],public_information={p:v for p,v in view['players'].items() if p!=boundary['actor']},
            information_policy='public_and_owner_known_only',forbidden_information_used=[],source_inventory=inventory,enumeration_units=units,
            legal_candidate_ids=ids,legal_candidate_details=details)
        checks=normal.board._checks(row,view,table)
        if not all(checks.values()):raise ValueError('fresh twelve legality checks incomplete')
    def identity(action):return tuple(action[k] if k!='target_instance_ids' else tuple(action[k]) for k in ('candidate_id','action_type','candidate_variant','source_instance_id','card_id','target_instance_ids'))
    if ids!=boundary['decision']['legal_candidates'] or sorted(map(identity,details))!=sorted(map(identity,boundary['decision']['legal_candidate_details'])):
        raise ValueError('historical scoped inventory differs from fresh adapter; comparison held')
    return dict(candidate_set_complete=True,completeness_checks=checks,candidate_ids=ids)

def compare_boundary(boundary):
    result=dict(shadow_id=boundary['shadow_id'],path_id=boundary['path_id'],event_seq=boundary['event_seq'],actor=boundary['actor'],
        source_refs=boundary['source_refs'],decision_sha256=boundary['decision_sha256'],new_events=0,new_decisions=0,
        legacy_status='unsupported',status='unsupported',reason=None,legacy=None,pilot=None,choice_changed=None)
    try:problem,_,_,_=_inputs(boundary)
    except (ValueError,KeyError,TypeError,StopIteration) as e:result['reason']=str(e);return result
    try:
        old=legacy_select(boundary,problem);result['legacy']=old
        if any(old[k]!=boundary['decision'].get(k) for k in old):raise ValueError('legacy choice/mode/reason/seed differs from saved trace')
    except (ValueError,KeyError,TypeError) as e:
        result.update(status='legacy_reproduction_failure',legacy_status='failed',reason=str(e));return result
    result['legacy_status']='reproduced'
    try:result['fresh_inventory']=_verify_legal_inventory(boundary)
    except (ValueError,KeyError,TypeError) as e:result['reason']=str(e);return result
    result.update(legacy_status='reproduced',status='compared',view=project_visible(boundary['continuation'],boundary['actor']),legal_candidate_details=copy.deepcopy(boundary['decision']['legal_candidate_details']),problem=problem,pilot=select_problem(problem))
    result['choice_changed']=old['selected_candidate']!=result['pilot']['selected_candidate']
    return result

def run_shadow(data_dir,output_dir):
    rows=load_observed_boundaries(data_dir);results=[compare_boundary(r) for r in rows]
    report=dict(schema='naotocchi.card_game.resource_value_shadow.v1',planned=110,
        planned_ids=sorted(r['shadow_id'] for r in rows),source_raw_sha256={k:v for row in rows for k,v in row['source_raw_sha256'].items()},results=results,
        status_counts=dict(collections.Counter(r['status'] for r in results)),new_events=0,new_decisions=0,new_matches=0,
        independent_balance_sample_count=0,policy_promoted=False)
    output_dir=Path(output_dir);output_dir.mkdir(parents=True,exist_ok=True)
    (output_dir/'shadow.json').write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    return report

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--data-dir',type=Path,default=DATA);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();report=run_shadow(args.data_dir,args.output);print(json.dumps(report['status_counts'],sort_keys=True))
if __name__=='__main__':main()
