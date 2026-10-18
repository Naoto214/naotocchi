"""Observe existing-handler occurrences at the event that actually caused them.

This is limited to the existing adapter's source scope. Unsupported sources
remain explicit; observing no supported occurrence is not a completeness proof.
"""
import copy
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_existing as existing
import proxy_population_trigger_sequential as sequential


def observe(journal,envelope,event,history,chain_status):
    sequential.audit_ledger(journal)
    if type(event.get('seq')) is not int or event['seq']!=envelope['event_seq']:
        raise ValueError('actual observation event/envelope differs')
    proof=existing.ExistingAdapter(history).proof(envelope,event['seq'])
    past=[r for r in proof['occurrences'] if r['origin_event_seq']!=event['seq']]
    new=[r for r in proof['occurrences'] if r['origin_event_seq']==event['seq'] and ledger.identity(r) not in journal['occurrences']]
    result=ledger.observe(journal,new,chain_status) if new else copy.deepcopy(journal)
    return result,dict(proof,new_occurrences=new,not_new_occurrences=past,
                       observation_chain_status=chain_status,origin_authenticated=False)


class Adapter:
    """Dispatch already-classified occurrences, never merge their semantics."""
    def __init__(self,history):
        self.existing=existing.ExistingAdapter(history)
        self.start=sequential.StartAdapter()
    def for_occurrence(self,occurrence):
        return self.start if occurrence['ability_key'] in ('own_start_reveal_companion','own_start_hand_at_most_two_draw') else self.existing
    def enumerate(self,envelope,occurrence):return self.for_occurrence(occurrence).enumerate(envelope,occurrence)
    def activate(self,envelope,action,occurrence):return self.for_occurrence(occurrence).activate(envelope,action,occurrence)
    def compare(self,envelope,inventory):return self.existing.compare(envelope,inventory)
