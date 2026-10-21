"""Existing source/target/cost handlers adapted to the approved06 group unit.

Collection scope is explicit; unsupported timings are unproved, not absent.
Actual history authentication is performed by the full execution entry.
"""
import copy
import proxy_population_start_obligations as sources
import proxy_population_opportunity_ledger as ledger
import proxy_population_activation_reference as references
import proxy_continuation_triggers as triggers
import proxy_continuation_batch as batch
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical

SUPPORTED={'M-antlion-04','M-antlion-05','M-beetle-01','M-beetle-02','W-city','W-countryside','P-desert_scorpion','I-sleepboost1','P-cat_ceo'}

class ExistingAdapter:
    def __init__(self,history):self.history=copy.deepcopy(history)

    def enumerate(self,envelope,occurrence):
        current=state.current(envelope);g=current['game_state'];actor=occurrence['actor'];source=occurrence['source_instance_id'];public=sources.public_sources(envelope)
        if source not in public or public[source]['actor']!=actor:raise ValueError('current trigger source departed')
        card=g['cards'][source]['card_id']
        if card not in SUPPORTED:raise ValueError('trigger handler outside existing adapter')
        cap=batch.classification(card)
        if cap['reference']!=occurrence['source_reference'] or cap['timing']!=occurrence['ability_key']:raise ValueError('trigger source contract differs')
        origin=next((e for e in self.history if e['seq']==occurrence['origin_event_seq']),None)
        if origin is None:raise ValueError('origin event absent')
        current['response_context'].update(priority_actor=actor,origin_event_seq=origin['seq'])
        if card=='P-cat_ceo':
            if triggers._used(current,self.history,source,card):
                return [],dict(complete=True,reason='same_occurrence_already_activated',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])
            met=origin['action_type']=='relationship_start' and origin.get('source_instance_id')==source and g['players'][actor]['board']['main'] is not None
            if not met or occurrence['category']!='forced':raise ValueError('mandatory relationship source differs')
            actions=[dict(candidate_id='response-activate-ability-'+source,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],target_instance_ids=[],candidate_variant=None,base_time_cost=0,source_references=[cap['reference']])]
        else:
            if occurrence['category']!='optional':raise ValueError('optional group category differs')
            if card in triggers.END_SOURCES:
                eligible,_=triggers.end_inventory(envelope,self.history)
                if source not in eligible:return [],dict(complete=True,reason='current_end_condition_unmet',source_reference=cap['reference'])
            actions,_=triggers.board_candidates(current,self.history,source,public[source]['slot'],envelope['runtime'])
        return actions,dict(complete=True,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],origin_authenticated=False)

    def collect(self,envelope,origin_event_seq=None):
        current=state.current(envelope);ctx=current['response_context'];origin=ctx['origin_event_seq'] if origin_event_seq is None else origin_event_seq;rows=[];unproved=[];classified=[]
        if type(origin) is not int or sum(e['seq']==origin for e in self.history)!=1:raise ValueError('group origin not unique')
        for source,public in sorted(sources.public_sources(envelope).items()):
            card=public['card_id']
            if card not in SUPPORTED:
                unproved.append(dict(source_instance_id=source,card_id=card,reason='outside_existing_trigger_adapter_scope'));continue
            cap=batch.classification(card);occurrence=dict(origin_event_seq=origin,source_instance_id=source,actor=public['actor'],category='forced' if card=='P-cat_ceo' else 'optional',ability_key=cap['timing'],source_reference=cap['reference'])
            if card=='P-cat_ceo':
                event=next(e for e in self.history if e['seq']==origin)
                if event['action_type']!='relationship_start' or event.get('source_instance_id')!=source or current['game_state']['players'][public['actor']]['board']['main'] is None:
                    classified.append(dict(source_instance_id=source,condition_met=False));continue
            actions,proof=self.enumerate(envelope,occurrence)
            classified.append(dict(source_instance_id=source,condition_met=bool(actions),proof=proof))
            if actions:
                origins={a.get('trigger_origin_event_seq',origin) for a in actions}
                if len(origins)!=1:raise ValueError('action expansion spans different occurrences')
                occurrence['origin_event_seq']=origins.pop()
                if type(occurrence['origin_event_seq']) is not int or sum(e['seq']==occurrence['origin_event_seq'] for e in self.history)!=1:raise ValueError('actual triggering event absent or ambiguous')
                ledger.identity(occurrence);rows.append(occurrence)
        return dict(occurrences=rows,classifications=classified,unproved_sources=unproved,opportunity_completeness_proven=False,origin_authenticated=False)

    def proof(self,envelope,origin_event_seq=None):
        c=envelope['legacy_continuation'];seq=c['response_context']['origin_event_seq'] if origin_event_seq is None else origin_event_seq;origin=next((e for e in self.history if e['seq']==seq),None)
        if origin is None:raise ValueError('group origin absent')
        kind='end' if origin['action_type']=='open_turn_end_triggers' else 'arrival'
        return dict(schema='existing_trigger_group_input.v1',group_kind=kind,origin_event_seq=seq,
            capture=dict(turn_player=c['game_state']['turn_player']),current_envelope_sha256=state.canonical_sha256(envelope),**self.collect(envelope,seq))

    def compare(self,envelope,inventory):
        return dict(status='unresolved_existing_contract',source_references=['114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md'],reason='activation_order_and_remaining_chain_not_proven_equivalent',unknowns_preserved=True,strategic_proof=False)

    def activate(self,envelope,action,occurrence):
        if canonical(action) not in [canonical(a) for a in self.enumerate(envelope,occurrence)[0]]:raise ValueError('stale existing group action')
        bridge=copy.deepcopy(envelope);bridge['legacy_continuation']['response_context'].update(priority_actor=occurrence['actor'],origin_event_seq=occurrence['origin_event_seq'])
        mandatory=occurrence['category']=='forced'
        if mandatory:bridge['legacy_continuation']['pending_triggers']=[f"mandatory:{occurrence['origin_event_seq']}:{occurrence['source_instance_id']}"]
        after,events=triggers.activate(bridge,dict(selected_action=action),self.history,mandatory)
        after=copy.deepcopy(after);link=after['legacy_continuation']['activation_zone'][-1];link['activation_receipt']=references.receipt(envelope,after,link)
        before=state.current(envelope);current=state.current(after);event={k:v for k,v in events[0].items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}
        event.update(game_state_before_sha256=triggers.old.start.opening._stop_state_sha256(before['game_state']),continuation_state_before_sha256=triggers.old.start._hash(before),game_state_after_sha256=triggers.old.start.opening._stop_state_sha256(current['game_state']),continuation_state_after_sha256=triggers.old.start._hash(current))
        triggers.old._verify_generated(before,current,[event]);return after,[triggers.actions.bind_event(envelope,after,event)]
