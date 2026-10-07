"""06/119 ordering over supplied source-derived occurrences and actual steps.

Reuses the shared ledger. Does not infer legal sets or mandatory subchoices
from an absence of records; those retain their separate proof obligations.
"""
import copy,hashlib
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
from proxy_mandatory_policy_contract import canonical


def audit(result,expected_occurrences):
    root=result['source_envelope'];c=root['legacy_continuation'];rows={ledger.identity(r):r for r in expected_occurrences}
    if len(rows)!=len(expected_occurrences):raise ValueError('duplicate expected trigger occurrence')
    initial=[r for r in rows.values() if r['origin_event_seq']<=root['event_seq']]
    journal=ledger.observe(ledger.create(c['game_state']['turn_player']),initial,'empty')
    seen={ledger.identity(r) for r in initial};triggers={}
    for record in result['trigger_records']:
        seq=record['before_envelope']['event_seq']
        if seq in triggers:raise ValueError('duplicate trigger step boundary')
        triggers[seq]=record
    used=set();normal=response=automatic=0;previous=root
    observed_ledgers={root['event_seq']:copy.deepcopy(journal)};required_archives=[]
    for step in result['steps']:
        if canonical(step['source_envelope'])!=canonical(previous):raise ValueError('opportunity step boundary differs')
        c=previous['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];seq=previous['event_seq']
        offered=ledger.offer(journal);record=triggers.get(seq)
        if offered is not None:
            if record is None:raise ValueError('ordinary processing before pending source obligation')
            if ctx['chain_status']=='resolving':raise ValueError('trigger activation during chain resolution')
            sequential.audit_ledger(record['before_ledger']);sequential.audit_ledger(record['after_ledger'])
            for field in ('turn_player','occurrences'):
                if canonical(journal[field])!=canonical(record['before_ledger'][field]):raise ValueError('source-derived pending ledger differs')
            for actual,expected in ((step['source_envelope'],record['before_envelope']),(step['final_envelope'],record['after_envelope']),(step['events'],record['events']),(step['decision'],record['decision'])):
                if canonical(actual)!=canonical(expected):raise ValueError('trigger step record binding differs')
            journal=copy.deepcopy(record['after_ledger']);used.add(seq)
        elif record is not None:raise ValueError('trigger step without source-derived pending obligation')
        elif g['phase']=='normal_action':
            d=step['decision']
            if type(d) is not dict or d.get('context',{}).get('decision_kind')!='normal_action' or d['context'].get('actor')!=g['turn_player'] or type(d.get('choice')) is not dict or ('decision_kind' in d['choice'] and d['choice']['decision_kind']!='normal_action'):raise ValueError('normal opportunity decision missing or mistyped')
            normal+=1
        elif g['phase'] in ('response_window','post_placement_response','turn_end_response') and ctx['chain_status']!='resolving' and not c['pending_triggers']:
            d=step['decision']
            if type(d) is not dict or d.get('decision_kind')!='response_action' or d.get('actor')!=ctx['priority_actor']:raise ValueError('ordinary response decision missing or mistyped')
            response+=1
        else:
            if g['phase']=='completed' or step['decision'] is not None or type(step['forced_record']) is not dict:raise ValueError('automatic rule step evidence absent')
            automatic+=1
        if len(step['events'])!=len(step['envelopes']):raise ValueError('opportunity transition coverage differs')
        for event,after in zip(step['events'],step['envelopes']):
            before_c=previous['legacy_continuation'];after_c=after['legacy_continuation']
            if after_c['game_state']['turn_player']!=journal['turn_player']:
                if any(v['status'] in ('pending','deferred') for v in journal['occurrences'].values()):raise ValueError('turn changed with unresolved source obligation')
                required_archives.append(previous['event_seq'])
                journal=ledger.create(after_c['game_state']['turn_player'])
            new=[r for k,r in rows.items() if r['origin_event_seq']==event['seq'] and k not in seen]
            if new:
                journal=ledger.observe(journal,new,before_c['response_context']['chain_status']);seen.update(ledger.identity(r) for r in new)
            if not after_c['activation_zone'] and any(v['status']=='deferred' for v in journal['occurrences'].values()):journal=ledger.release(journal,[])
            previous=after
            observed_ledgers[after['event_seq']]=copy.deepcopy(journal)
        if canonical(previous)!=canonical(step['final_envelope']):raise ValueError('opportunity final step boundary differs')
    if used!=set(triggers) or seen!=set(rows):raise ValueError('unmatched trigger steps or source occurrences')
    if canonical(previous)!=canonical(result['final_envelope']):raise ValueError('opportunity final boundary differs')
    def bind(saved,expected):
        sequential.audit_ledger(saved)
        # Empty observation calls are producer bookkeeping, not new obligations.
        # Compare the semantic ledger, including ineligible evidence and status.
        for field in ('turn_player','occurrences'):
            if canonical(saved[field])!=canonical(expected[field]):raise ValueError('saved trigger ledger differs from execution')
    if previous['legacy_continuation']['game_state']['phase']=='completed':required_archives.append(previous['event_seq'])
    archives=result['closed_turn_trigger_ledgers'];seen_archives=set()
    if [a['boundary_event_seq'] for a in archives]!=required_archives:raise ValueError('archive execution boundaries differ')
    for archive in archives:
        seq=archive['boundary_event_seq']
        if seq in seen_archives or seq not in observed_ledgers:raise ValueError('archive ledger execution boundary absent or duplicate')
        seen_archives.add(seq);bind(archive['ledger'],observed_ledgers[seq])
    bind(result['trigger_ledger'],journal)
    return dict(schema='source_obligation_processing_order.v1',phase_order_verified=True,
        supplied_closure_execution_bound=True,ordinary_normal_count=normal,ordinary_response_count=response,automatic_step_count=automatic,
        sequential_trigger_step_count=len(used),pending_count=sum(v['status'] in ('pending','deferred') for v in journal['occurrences'].values()),
        expected_occurrences_sha256=hashlib.sha256(canonical(sorted(rows.values(),key=ledger.identity))).hexdigest(),
        all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None,
        opportunity_scope='supplied_source_obligations_and_existing_executor_phases')
