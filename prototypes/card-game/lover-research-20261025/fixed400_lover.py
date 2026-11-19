"""Lover (partner) metrics from the 400 official fixed matches (read-only, from saved records).

Usage: fixed400_lover.py <root> <out.json>
<root> holds either attempt-0001..0400/record.json.gz (the run directory) or 0001..0400/record.json.gz
(rows/ of the results branch fixed400-results/fixed400-e8e7202ac717; the bytes are identical).
"""
import json,gzip,sys,collections,os
root,out=sys.argv[1],sys.argv[2]
seats=[];by_card=collections.defaultdict(lambda:collections.Counter());abil=collections.Counter();skipped=collections.Counter()
for i in range(1,401):
  path=f'{root}/attempt-{i:04d}/record.json.gz'
  if not os.path.exists(path):path=f'{root}/{i:04d}/record.json.gz'
  r=json.loads(gzip.open(path).read());rt=r['runtime']
  mid=r['binding']['match_id'];first='A' if mid.endswith('A-first') else 'B'
  g=rt['final_envelope']['legacy_continuation']['game_state'];cards=g['cards']
  cid=lambda inst:(cards.get(inst) or {}).get('card_id')
  res=rt.get('result') or {};winner=res.get('winner')
  st={p:dict(match=mid,seat=p,first=(p==first),deck_partners=sorted(cid(k) for k in cards if k.startswith(p+'-') and (cid(k) or '').startswith('P-')),
     placements=[],progress=[],marriage=None,marriage_turn=None,final_partner=None,final_stage=None,final_growth=g['players'][p]['growth'],
     result=('win' if winner==p else 'draw' if winner=='draw' else 'loss'),partner_ability_events=0,place_legal_turns=0,place_legal_not_chosen=0,
     progress_legal=0,progress_legal_not_chosen=0,decisions_partner_blocked_by_slot=0,decisions_partner_blocked_only_by_slot=0) for p in 'AB'}
  turns={'A':0,'B':0}
  for e in rt['events']:
    a=e.get('action_type');p=e.get('actor')
    if a in('turn_start_and_egg_draw','turn_start_and_normal_draw') and p in turns:turns[p]+=1
    if p not in st:continue
    if a in('relationship_start','place_partner'):
      inst=e.get('source_instance_id');pl=st[p]['placements']
      if not(pl and pl[-1]['instance']==inst and pl[-1]['turn']==turns[p]):pl.append(dict(card=cid(inst),instance=inst,turn=turns[p],event=a))
    elif a=='relationship_progress':st[p]['progress'].append(dict(variant=e.get('candidate_variant'),turn=turns[p],time=e.get('payment_time')))
    elif a=='relationship_marriage':st[p]['marriage']=cid(e.get('source_instance_id'));st[p]['marriage_turn']=turns[p]
    src=e.get('source_instance_id')
    if src and (cid(src) or '').startswith('P-') and a not in('place_partner','relationship_start','relationship_progress','relationship_marriage','activate_response'):
      st[p]['partner_ability_events']+=1;abil[(cid(src),a)]+=1
  for d in rt['decisions']:
    if d.get('decision_kind') is not None or 'choice' not in d:continue
    c=d['choice'];p=d['context']['actor'];legal=c['legal_candidates'];sel=c['selected_candidate']
    units=[u for u in (d.get('inventory') or {}).get('enumeration_units',[]) if str(u.get('card_id') or '').startswith('P-') and u.get('source_zone')=='hand' and u.get('action_type')=='place_partner']
    if any('partner_slot_occupied' in u['reason_codes'] for u in units):st[p]['decisions_partner_blocked_by_slot']+=1
    if any(u['reason_codes']==['partner_slot_occupied'] for u in units):st[p]['decisions_partner_blocked_only_by_slot']+=1
    pl=[x for x in legal if x.startswith('candidate-place-partner')];pr=[x for x in legal if x.startswith('candidate-relationship')]
    if pl:
      st[p]['place_legal_turns']+=1
      if sel not in pl:st[p]['place_legal_not_chosen']+=1
    if pr:
      st[p]['progress_legal']+=1
      if sel not in pr:st[p]['progress_legal_not_chosen']+=1
  for p in 'AB':
    b=g['players'][p]['board'];st[p]['final_partner']=cid(b.get('partner')) if b.get('partner') else None;st[p]['final_stage']=b.get('partner_stage')
    st[p]['final_hand_partners']=sum(1 for h in g['players'][p]['hand'] if (cid(h) or '').startswith('P-'))
    st[p]['turns']=turns[p];seats.append(st[p])
def rate(n,d):return round(n/d,3) if d else None
S=len(seats);placed=[s for s in seats if s['placements']];married=[s for s in seats if s['marriage']]
stage_reached=collections.Counter()
for s in placed:
  v=[x['variant'] for x in s['progress']];top=0
  for k,t in (('0-to-1',1),('1-to-2',2),('2-to-3',3)):
    if k in v:top=t
  stage_reached['married' if s['marriage'] else top]+=1
card=collections.defaultdict(lambda:collections.Counter())
for s in seats:
  for c in set(s['deck_partners']):card[c]['seat_decks_with_card']+=1
  for c in s['deck_partners']:card[c]['copies_in_decks']+=1
  for x in s['placements']:card[x['card']]['placements']+=1
  if s['marriage']:card[s['marriage']]['marriages']+=1
for (c,a),n in abil.items():card[c]['ability_events']+=n
def summ(group):
  n=len(group);return dict(seats=n,win=sum(s['result']=='win' for s in group),draw=sum(s['result']=='draw' for s in group),loss=sum(s['result']=='loss' for s in group),
    win_rate=rate(sum(s['result']=='win' for s in group),n),mean_growth=round(sum(s['final_growth'] for s in group)/n,2) if n else None)
summary=dict(
  seats=S,matches=S//2,
  seats_with_partner_in_deck=sum(bool(s['deck_partners']) for s in seats),
  seats_with_partner_placed=len(placed),
  partner_placements_total=sum(len(s['placements']) for s in seats),
  seats_with_multiple_placements=sum(len(s['placements'])>1 for s in seats),
  stage_reached_after_placement=dict(stage_reached),
  marriages=len(married),marriage_rate_of_placed=rate(len(married),len(placed)),
  marriage_turn_mean=round(sum(s['marriage_turn'] for s in married)/len(married),2) if married else None,
  placement_turn_mean=round(sum(s['placements'][0]['turn'] for s in placed)/len(placed),2) if placed else None,
  turns_placement_to_marriage_mean=round(sum(s['marriage_turn']-s['placements'][0]['turn'] for s in married)/len(married),2) if married else None,
  own_turns_lover_on_board_mean=round(sum(s['turns']-s['placements'][0]['turn'] for s in placed)/len(placed),2) if placed else None,
  turn_index_note='turn indices count own turn-start events in runtime events; 0 is the own turn before the first counted start',
  partner_on_board_at_end=sum(bool(s['final_partner']) for s in seats),
  breakups_observed=sum(1 for s in placed if not s['final_partner'] or len(s['placements'])>1),
  place_partner_legal_decisions=sum(s['place_legal_turns'] for s in seats),place_partner_legal_not_chosen=sum(s['place_legal_not_chosen'] for s in seats),
  seats_with_partner_blocked_by_slot=sum(s['decisions_partner_blocked_by_slot']>0 for s in seats),
  decisions_partner_blocked_by_slot=sum(s['decisions_partner_blocked_by_slot'] for s in seats),
  decisions_partner_blocked_only_by_slot=sum(s['decisions_partner_blocked_only_by_slot'] for s in seats),
  normal_decisions_total=None,
  final_hand_partners_with_partner_on_board=sum(s['final_hand_partners'] for s in seats if s['final_partner']),
  seats_ending_with_unusable_partner_in_hand=sum(1 for s in seats if s['final_partner'] and s['final_hand_partners']>0),
  progress_legal_decisions=sum(s['progress_legal'] for s in seats),progress_legal_not_chosen=sum(s['progress_legal_not_chosen'] for s in seats),
  by_outcome=dict(married=summ(married),placed_not_married=summ([s for s in placed if not s['marriage']]),partner_in_deck_not_placed=summ([s for s in seats if s['deck_partners'] and not s['placements']]),no_partner_in_deck=summ([s for s in seats if not s['deck_partners']])),
  partner_ability_resolutions_by_card_action={f'{c}|{a}':n for (c,a),n in sorted(abil.items())})
json.dump(dict(schema='fixed400_lover_metrics.v1',source='official fixed400 records (attempt fixed400-e8e7202ac717)',policy_note='normal actions chosen by seeded_fallback (sha256 modulo over legal candidates); not a strategic player',
  summary=summary,cards={c:dict(v) for c,v in sorted(card.items())},seats=seats),open(out,'w'),indent=1,ensure_ascii=False)
print(json.dumps(summary,ensure_ascii=False,indent=1));print(json.dumps({c:dict(v) for c,v in sorted(card.items())},ensure_ascii=False))
