"""Concealed-preparation response windows after a text-proven non-removal activation.

The frozen preparation.response_inventory admits a response window with
face-down preparations only after origins known to carry no opponent main
removal (the only concealed reaction, I-poop1, answers that). The current layer
added two activations it does not list: the paid draw of M-antlion-02/08
(own face-down or discard cards to the deck bottom, draw 1) and C-cat_friend
(itself to the deck bottom, one own discarded companion to hand). Neither text
removes a main. Only for those origins, with the card-text sections pinned and
re-verified through the start catalog, the frozen projection is run as-is; every
other origin still goes to the frozen function. No concealed identity is read.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_batch as batch
import proxy_continuation_preparation as preparation
import proxy_continuation_state as state
import proxy_population_start_obligations as starts

ORIGINS={
 'M-antlion-02':('activate_main_ability','4432f70d28f09cb94cc60015178a8b7204e2bc7cb21b25266ff095dd67140346'),
 'M-antlion-08':('activate_main_ability','f741ca3a7bb090554d0c08efaef5fb764b47b989f06e5d6d94ef845ae13c646e'),
 'C-cat_friend':('activate_companion_ability','41b133fc4248abc95361a57dda56978e1c017e76af74322ca8cbd92ce9cc8880'),
}
_LOCK=Lock()


def projected(envelope,initial,events,delegate):
 """The frozen function's body after its origin classification, unchanged."""
 references=preparation.concealed_pool();c=state.current(envelope);ctx=c['response_context'];old=preparation.old
 projected=copy.deepcopy(envelope);exclusions=[];actor=ctx['priority_actor']
 for owner,p in projected['legacy_continuation']['game_state']['players'].items():
  for index,source in enumerate(list(p['board']['prepared'])):
   meta=envelope['runtime']['public_prepared'][source]
   if meta['face_up']:continue
   row=dict(controller=owner,slot=index,reason='public_origin_has_no_opponent_main_removal_activation',source_references=references)
   if owner==actor:row['source_instance_id']=source
   exclusions.append(row);p['board']['prepared'].remove(source);del projected['runtime']['public_prepared'][source]
 previous=batch.RESPONSE_FULL_CURRENT;previous_runtime=batch.RESPONSE_FULL_RUNTIME;batch.RESPONSE_FULL_CURRENT=c;batch.RESPONSE_FULL_RUNTIME=envelope['runtime']
 projected_events=copy.deepcopy(events);current=state.current(projected)
 projected_events[-1]['game_state_after_sha256']=old.start.opening._stop_state_sha256(current['game_state'])
 projected_events[-1]['continuation_state_after_sha256']=old.start._hash(current)
 try:opportunity=delegate(projected,initial,projected_events)
 finally:batch.RESPONSE_FULL_CURRENT=previous;batch.RESPONSE_FULL_RUNTIME=previous_runtime
 return dict(opportunity,preparation_exclusions=exclusions,envelope_sha256=state.state_hash(envelope))


def proven_origin(envelope,events):
 """The origin's card and kind, bound to the live link and pinned text; None when not one of ORIGINS."""
 c=state.current(envelope);ctx=c['response_context'];origin=next((e for e in events if e['seq']==ctx['origin_event_seq']),None)
 if origin is None:return None
 card=c['game_state']['cards'].get(origin.get('source_instance_id'),{}).get('card_id')
 if card not in ORIGINS or origin['action_type']!=ORIGINS[card][0]:return None
 links=[l for l in c['activation_zone'] if l['link_id']==origin.get('chain_link_id')]
 if len(links)!=1 or links[0]['source_instance_id']!=origin['source_instance_id'] or links[0]['card_id']!=card or links[0]['actor']!=origin['actor']:raise ValueError('concealed origin activation link differs')
 row=starts.catalog()['cards'][card]
 if row['section_sha256']!=ORIGINS[card][1]:raise ValueError('concealed origin card text changed')
 return dict(card_id=card,action_type=origin['action_type'],origin_event_seq=origin['seq'],source_reference=row['reference'],section_sha256=row['section_sha256'])


def inventory(native,envelope,initial,events,delegate):
 if not any(not r['face_up'] for r in envelope['runtime']['public_prepared'].values()):return native(envelope,initial,events,delegate)
 proof=proven_origin(envelope,events)
 if proof is None:return native(envelope,initial,events,delegate)
 return dict(projected(envelope,initial,events,delegate),concealed_origin_proof=proof)


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('concealed origin scope concurrency/reentry forbidden')
 native=preparation.response_inventory
 try:
  preparation.response_inventory=lambda envelope,initial,events,delegate:inventory(native,envelope,initial,events,delegate);yield
 finally:preparation.response_inventory=native;_LOCK.release()
