"""Explicit-choice, source-bound targeted execution; not a strategy/match runner.

Every public method is an atomic command. Scripts declare cooperative passes,
not complete legal inventories. Existing fixtures and historical engines are read-only.
"""
import copy
import functools
import hashlib
import inspect
import json
import re
from pathlib import Path
from proxy_same_name_two_pilots import _initial_state
from proxy_record_validator import canonical_sha256
from proxy_continuation_rules import source_section

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
FOCUS_IDS=('G-jump-quest','M-mushroom-06','M-sakura-05','M-dragon-08','M-penguin-07','M-god-08')
REFS={
 'G-jump-quest':'81-play-batch-2-card-text-draft.md',
 'M-mushroom-06':'57-plant-four-lines-card-text-draft.md',
 'M-sakura-05':'representatives/06-plant-sakura.md',
 'M-dragon-08':'59-fantasy-three-lines-card-text-draft.md',
 'M-penguin-07':'53-waterside-three-lines-card-text-draft.md',
 'M-god-08':'59-fantasy-three-lines-card-text-draft.md',
 'M-dragon-06':'59-fantasy-three-lines-card-text-draft.md',
 'G-curling-ice':'85-play-batch-4-card-text-draft.md',
 'G-basketball-3d':'81-play-batch-2-card-text-draft.md',
 'G-crane-game-3d':'79-play-batch-1-card-text-draft.md',
 'I-bond1':'77-current-items-card-text-draft.md',
}
# Text-bound capabilities, independent of fixture/path/copy IDs.
EFFECTS={
 'G-jump-quest':dict(kind='recover',zone='hand',cost=1,target='low_main',condition='two_skips',reward=5),
 'M-mushroom-06':dict(kind='recover',zone='main',cost=0,target='nonmain',condition='same_name',timing='end'),
 'M-sakura-05':dict(kind='recover',zone='main',cost=1,target='trap',timing='end'),
 'M-dragon-08':dict(kind='recover',zone='main',cost=0,target='person',timing='end',pay_zone='discard',pay_count=2,pay_type='action',pay_destination='deck'),
 'M-penguin-07':dict(kind='reserve',zone='main',cost=0,target='companion',condition='world_changed',choose_at_resolution=True,reservation='prevent_departure'),
 'M-god-08':dict(kind='reserve',zone='main',cost=1,target='nonmain_board',pay_zone='hand',pay_count=1,pay_destination='deck',reservation='discard_to_hand'),
 'M-dragon-06':dict(kind='remove',zone='main',cost=3,target='opponent_main_companion',pay_zone='hand',pay_count=1,pay_destination='discard',pay_prepared=1),
 'G-curling-ice':dict(kind='draw_growth',zone='prepared',cost=0,condition='drawn_challenge',growth=5,draw=1),
 'G-basketball-3d':dict(kind='reserve',zone='hand',cost=1,target='own_main',reservation='win_by_two'),
 'G-crane-game-3d':dict(kind='peek_bottom',zone='hand',cost=2,count=4),
}
SOURCE_FILES=sorted(set(REFS.values())|{'01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','07-advanced-rules-checkpoint.md','64-turn-boundaries-and-victory-timing.md','93-cross-type-boundary-audit.md','95-removal-supply-first-revisions.md','96-removal-defense-deadline-revisions.md','31-beetle-stagbeetle-card-master-migration.md','55-insect-three-lines-card-text-draft.md','72-companion-26-card-text-draft.md','89-world-13-card-text-draft.md'})


def source_hashes():
    return {name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in SOURCE_FILES}


EXPECTED_SOURCE_HASHES={'01-core-rules.md': 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71', '02-main-system.md': '6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127', '06-action-chain-checkpoint.md': '7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67', '07-advanced-rules-checkpoint.md': 'f346005f5f803f725d294e2fdc9f7fe98fac8a016609612c3d4fe9ab76b6874a', '31-beetle-stagbeetle-card-master-migration.md': '575535cfcbcb60343f7947b0542350ce9027368664baec021609af9a53519a47', '53-waterside-three-lines-card-text-draft.md': '239c75b5f658d31dc9b57a5d14e5adf82ffcd4055f3720f567cda38d249c1e0e', '55-insect-three-lines-card-text-draft.md': '8108f781d2e02b45139fdf7d1d573c7ac839f14cd2b8361983ecb891320f8c28', '57-plant-four-lines-card-text-draft.md': 'b26ce0065dfb23e8cf4d5df588a5810cd7f714d7ce90181bee0728faa165b9ad', '59-fantasy-three-lines-card-text-draft.md': '9711def2a10d4467d881d5af7ad6803acdb624d18f22901152b2b2b065c12f0f', '64-turn-boundaries-and-victory-timing.md': '00f9845b5b79774c48bac002e26f6b08096563a4bf1611f408aed0e2c9089a64', '72-companion-26-card-text-draft.md': '941d17e157d77badfaaab0e1f04539eb602c05b893241ff3024ecd7ae0c97117', '77-current-items-card-text-draft.md': 'ec0a630c5616f6a50ca97afcebaab22fe9de13fe5e3789552d4e7d7ee93a8a02', '79-play-batch-1-card-text-draft.md': 'cc3cdf1f52581d0e58a72190aff4792da406bdfe7abc508e57849b56fc0a900a', '81-play-batch-2-card-text-draft.md': '78aad20fd869c7b46865ced0759c3b8c6768077cd3d55e27628b918719a5e3c4', '85-play-batch-4-card-text-draft.md': 'a27d727e0254953b012edc9a47a643990640982bb7f00ecdc2b50b454701c24b', '89-world-13-card-text-draft.md': '19babfc75a43ed494a10d7be3a78f7586e1319ffc4314853689781ac74dc8269', '93-cross-type-boundary-audit.md': '58f25202bf1581cfe44a4c8397af662f9b95386160ebb58b1c6a89db08a48be5', '95-removal-supply-first-revisions.md': 'e338b2d5c9ef5b1de495a43be6f68b67a8c6bb7de5d8376001f02d59f882df3b', '96-removal-defense-deadline-revisions.md': '80ef3129e21c55bd08d8a42225f3f8b3087c3d01484eab3452c331401745f5d1', 'representatives/06-plant-sakura.md': 'b687ff752432a167bb6bbc59a3c96d36da1216183cec10d6eeceb5f9a482e7fa'}

def verify_sources(expected):
    if expected!=source_hashes():raise ValueError('canonical source drift')


def text_for(card):
    if card in REFS:return source_section(REFS[card]+'#'+card)[0]
    for name in SOURCE_FILES:
        try:return source_section(name+'#'+card)[0]
        except ValueError:pass
    raise ValueError('unregistered source text '+card)


def atomic(fn):
    @functools.wraps(fn)
    def call(self,*args,**kwargs):
        before=copy.deepcopy(self.state)
        try:
            self.validate()
            proof=fn(self,*args,**kwargs) or {}
            self.validate()
        except Exception:
            self.state=before
            raise
        bound=inspect.signature(fn).bind(self,*args,**kwargs);bound.apply_defaults()
        command=dict(kind=fn.__name__,arguments=json.loads(json.dumps({k:v for k,v in bound.arguments.items() if k!='self'})))
        self.commands.append(command)
        event=dict(seq=len(self.events)+1,command=command,before_state_sha256=canonical_sha256(before),after_state_sha256=canonical_sha256(self.state),proof=proof)
        self.events.append(event);self.snapshots.append(copy.deepcopy(self.state))
        return proof
    return call


class TargetedRunner:
    def __init__(self,fixture,source_manifest=None):
        verify_sources(EXPECTED_SOURCE_HASHES if source_manifest is None else source_manifest)
        self.fixture=copy.deepcopy(fixture)
        self.state=_initial_state(fixture)
        self.state.update(activation=None,attachments={},uses=[],turn_skips=[],last_occurrence=None)
        self.commands=[];self.events=[];self.snapshots=[copy.deepcopy(self.state)]
        self.identities=copy.deepcopy(self.state['cards'])
        self.validate()

    def validate(self):
        s=self.state;located=[]
        if s['cards']!=self.identities:raise ValueError('card identities changed')
        for a,p in s['players'].items():
            if type(p['time']) is not int or p['time']<0:raise ValueError('invalid time')
            if not 0<=p['growth']<=100 or p['growth']%5:raise ValueError('invalid growth')
            b=p['field']
            if len(b['companions'])>3 or len(b['prepared'])>3:raise ValueError('slot overflow')
            for z in ('hand','deck','discard'):located+=p[z]
            located += [i for i in (b['main'],b['partner'],b['world']) if i]+b['companions']+b['prepared']
        if s['activation'] and s['activation']['action_card']:located.append(s['activation']['source'])
        if len(located)!=len(set(located)) or set(located)!=set(s['cards']):raise ValueError('physical location coverage')
        for equipment,target in s['attachments'].items():
            if not any(equipment in p['field']['prepared'] and target in p['field']['companions'] for p in s['players'].values()):raise ValueError('attachment target missing')

    def find(self,actor,card,zone='hand',index=0):
        p=self.state['players'][actor]
        ids=p[zone] if zone in ('hand','deck','discard') else ([p['field'][zone]] if zone in ('main','world','partner') else p['field'][zone])
        found=[i for i in ids if i and self.state['cards'][i]['card_id']==card]
        if index>=len(found):raise ValueError('card absent from '+zone+': '+card)
        return found[index]

    def own(self,actor,phases=('normal',)):
        if self.state['turn_player']!=actor or self.state['phase'] not in phases or self.state['activation']:raise ValueError('wrong action opportunity')
        return self.state['players'][actor]

    def spend(self,p,cost):
        if type(cost) is not int or cost<0 or p['time']<cost:raise ValueError('unaffordable payment')
        p['time']-=cost

    def moved(self,actor,source,destination):
        p=self.state['players'][actor];b=p['field']
        for z in ('hand','deck','discard'):
            if source in p[z]:p[z].remove(source);break
        else:
            if source in b['companions']:b['companions'].remove(source)
            elif source in b['prepared']:b['prepared'].remove(source);self.state['attachments'].pop(source,None)
            elif source==b['main']:b['main']=None
            elif source==b['world']:b['world']=None
            else:raise ValueError('unsupported source zone')
            for equip,target in list(self.state['attachments'].items()):
                if target==source:b['prepared'].remove(equip);p['discard'].append(equip);del self.state['attachments'][equip]
        p[destination].append(source)

    @atomic
    def start_turn(self,actor,round_number,keep=()):
        s=self.state
        expected=('A',1) if s['turn_player'] is None else (('B',s['round']) if s['turn_player']=='A' else ('A',s['round']+1))
        if (actor,round_number)!=expected or s['phase'] not in ('before_match','ended') or round_number>10:raise ValueError('turn sequence')
        s.update(round=round_number,turn_player=actor,phase='normal',turn_skips=[],last_occurrence=None)
        expired=[]
        for key,r in s['reservations'].items():
            if r['status']=='active' and r['deadline']=='next_own_start' and r['owner']==actor:
                r['status']='expired';expired.append(key)
        p=s['players'][actor];p.update(time=round_number,person_placed=False,challenge_used=False,relationship_progressed=False)
        drawn=[]
        for _ in range(2 if p['field']['main'] is None else 1):
            if p['deck']:
                i=p['deck'].pop(0);p['hand'].append(i);drawn.append(i)
        bottom=None
        if p['field']['main'] is None and p['hand']:
            choices=[i for i in p['hand'] if s['cards'][i]['card_id'] not in keep]
            bottom=sorted(choices or p['hand'])[-1]
            self.moved(actor,bottom,'deck')
        return dict(drawn=drawn,bottom=bottom,expired=expired,choice_information='owner_hand_only',optional_start_abilities='declined')

    @atomic
    def main(self,actor,card,variant):
        p=self.own(actor);source=self.find(actor,card);previous=p['field']['main']
        species,stage=card.rsplit('-',1);stage=int(stage);text_for(card)
        if not 1<=stage<=8:raise ValueError('invalid stage')
        if variant=='birth':
            if previous or stage!=1:raise ValueError('targeted entry requires stage one')
            cost=stage
        elif variant=='time_skip':
            if not previous:raise ValueError('no previous main')
            old_species,old_stage=self.state['cards'][previous]['card_id'].rsplit('-',1)
            if species!=old_species or stage<=int(old_stage):raise ValueError('invalid lineage')
            cost=stage-int(old_stage)
        else:raise ValueError('unsupported movement')
        self.spend(p,cost)
        if previous:self.moved(actor,previous,'discard')
        p['hand'].remove(source);p['field']['main']=source
        if variant=='time_skip':self.state['turn_skips'].append(dict(source=previous,destination=source))
        self.state['last_occurrence']=dict(kind='main_movement',source=source)
        return dict(source=source,previous=previous,payment=cost,variant=variant,optional_arrival_abilities='declined',response_passes=[actor,'B' if actor=='A' else 'A'])

    @atomic
    def person(self,actor,card,replace_card=None,index=0):
        p=self.own(actor);source=self.find(actor,card,index=index);b=p['field']
        if not card.startswith('C-') or p['person_placed']:raise ValueError('person limit/type')
        text_for(card)
        if len(b['companions'])==3:
            if not replace_card:raise ValueError('replacement required')
            old=self.find(actor,replace_card,'companions');self.moved(actor,old,'discard')
        elif replace_card:raise ValueError('no free discard')
        else:old=None
        p['hand'].remove(source);b['companions'].append(source);p['person_placed']=True
        self.state['last_occurrence']=dict(kind='person_placed',source=source)
        return dict(source=source,replaced=old,payment=0,response_passes=[actor,'B' if actor=='A' else 'A'],optional_abilities='declined')

    @atomic
    def world(self,actor,card):
        p=self.own(actor);source=self.find(actor,card);text_for(card)
        if not card.startswith('W-'):raise ValueError('world type')
        self.spend(p,2);old=p['field']['world']
        if old:self.moved(actor,old,'discard')
        p['hand'].remove(source);p['field']['world']=source
        self.state['last_occurrence']=dict(kind='world_changed' if old else 'world_placed',source=source,previous=old)
        main=p['field']['main']
        pending=bool(old and main and EFFECTS.get(self.state['cards'][main]['card_id'],{}).get('condition')=='world_changed' and p['field']['companions'])
        if pending:self.state['phase']='trigger_opportunity'
        proof=dict(source=source,previous=old,payment=2,optional_world_abilities='declined',pending_trigger_opportunity=pending)
        if not pending:proof['response_passes']=[actor,'B' if actor=='A' else 'A']
        return proof

    @atomic
    def prepare(self,actor,card,target_card=None):
        p=self.own(actor);source=self.find(actor,card);body=text_for(card)
        if len(p['field']['prepared'])>=3:raise ValueError('preparation full')
        target=None
        if target_card:
            if 'なかまにみにつける' not in body:raise ValueError('unsupported equipment')
            target=self.find(actor,target_card,'companions');cost=2
        else:
            if '- プレイ方法：しかける' not in body:raise ValueError('not a trap')
            cost=int(re.search(r'- 時：(\d+)',body)[1])
        self.spend(p,cost);p['hand'].remove(source);p['field']['prepared'].append(source)
        if target:self.state['attachments'][source]=target
        self.state['last_occurrence']=dict(kind='prepared',source=source)
        return dict(source=source,target=target,payment=cost,face_up=bool(target),response_passes=[actor,'B' if actor=='A' else 'A'])

    @atomic
    def challenge_draw(self,actor,parameter):
        p=self.own(actor);other='B' if actor=='A' else 'A'
        if p['challenge_used'] or parameter not in ('power','wisdom'):raise ValueError('challenge unavailable')
        mains=[self.state['players'][a]['field']['main'] for a in (actor,other)]
        if not all(mains):raise ValueError('egg challenge')
        vals=[]
        for i in mains:
            body=text_for(self.state['cards'][i]['card_id'])
            pair=re.search(r'(?:[①②③④⑤⑥⑦⑧]\s+|ちから／ちえ：)(\d+)/(\d+)',body)
            if not pair:raise ValueError('main values unproved')
            vals.append(int(pair[1 if parameter=='power' else 2]))
        if vals[0]!=vals[1]:raise ValueError('not a draw')
        if any(q['field']['world'] or q['field']['companions'] or self.state['attachments'] for q in self.state['players'].values()):raise ValueError('challenge continuous modifiers unproved')
        p['challenge_used']=True;self.state['last_occurrence']=dict(kind='drawn_challenge',actor=actor)
        self.state['phase']='trigger_opportunity'
        return dict(participants=mains,parameter=parameter,values=vals,pre_comparison_passes=[actor,other],optional_challenge_abilities='declined',pending_post_result_opportunity=True)

    def eligible(self,actor,target,kind):
        if target is None:return False
        p=self.state['players'][actor];s=self.state;card=s['cards'][target]['card_id'];b=p['field']
        if kind in ('low_main','nonmain','trap','person'):
            if target not in p['discard']:return False
            if kind=='low_main':return card.startswith('M-') and int(card.rsplit('-',1)[1])<=3
            if kind=='nonmain':return not card.startswith('M-')
            if kind=='person':return card.startswith(('C-','P-'))
            return 'プレイ方法：しかける' in text_for(card)
        if kind=='companion':return target in b['companions']
        if kind=='nonmain_board':return target in [*b['companions'],b['partner'],b['world']]
        if kind=='own_main':return target==b['main']
        if kind=='opponent_main_companion':
            b=s['players']['B' if actor=='A' else 'A']['field'];return target in [b['main'],*b['companions']]
        raise ValueError('unknown target contract')

    def same_name(self,actor,target):
        b=self.state['players'][actor]['field'];card=self.state['cards'][target]['card_id']
        visible=[*b['companions'],b['partner'],b['world'],*[i for i in b['prepared'] if i in self.state['attachments']]]
        return any(i and self.state['cards'][i]['card_id']==card for i in visible)

    @atomic
    def activate(self,actor,card,target_card=None,payment_cards=(),prepared_card=None):
        spec=EFFECTS[card]
        phases=('trigger_opportunity',) if spec.get('condition') in ('world_changed','drawn_challenge') else ('end',) if spec.get('timing')=='end' else ('normal',)
        p=self.own(actor,phases)
        source=self.find(actor,card,spec['zone']);text_for(card)
        use=(source,self.state['round'],actor)
        if spec['zone']=='main' and list(use) in self.state['uses']:raise ValueError('ability already used')
        condition=spec.get('condition');occ=self.state['last_occurrence'] or {}
        if condition=='two_skips' and len(self.state['turn_skips'])<2:raise ValueError('two separate skips required')
        if condition in ('world_changed','drawn_challenge') and occ.get('kind')!=condition:raise ValueError('trigger occurrence absent')
        target=None
        if spec.get('choose_at_resolution'):
            if target_card is not None:raise ValueError('choice belongs to resolution')
            if not p['field']['companions']:raise ValueError('required companion absent')
        elif 'target' in spec:
            zone='discard' if spec['kind']=='recover' else 'main' if spec['target']=='own_main' else 'companions'
            owner=('B' if actor=='A' else 'A') if spec['target']=='opponent_main_companion' else actor
            if spec['target']=='opponent_main_companion' and target_card and target_card.startswith('M-'):zone='main'
            if spec['target']=='nonmain_board' and target_card and target_card.startswith('W-'):zone='world'
            target=self.find(owner,target_card,zone)
            if not self.eligible(actor,target,spec['target']):raise ValueError('invalid target')
        if condition=='same_name' and not self.same_name(actor,target):raise ValueError('same name absent')
        if len(payment_cards)!=spec.get('pay_count',0):raise ValueError('payment count differs')
        paid=[]
        for cid in payment_cards:
            source_id=self.find(actor,cid,spec['pay_zone'])
            if source_id in paid or source_id==target:raise ValueError('duplicate/target payment')
            if spec.get('pay_type')=='action' and not cid.startswith(('G-','I-','E-')):raise ValueError('action payment type')
            paid.append(source_id)
        prepared=self.find(actor,prepared_card,'prepared') if prepared_card else None
        if bool(prepared)!=bool(spec.get('pay_prepared')):raise ValueError('prepared payment differs')
        self.spend(p,spec['cost'])
        for i in paid:self.moved(actor,i,spec['pay_destination'])
        if prepared:self.moved(actor,prepared,'discard')
        action_card=spec['zone'] in ('hand','prepared')
        if action_card:
            (p['hand'] if spec['zone']=='hand' else p['field']['prepared']).remove(source)
        if spec['zone']=='main':self.state['uses'].append(list(use))
        self.state['activation']=dict(actor=actor,card=card,source=source,target=target,action_card=action_card,spec=copy.deepcopy(spec),return_phase='normal' if self.state['phase']=='trigger_opportunity' else self.state['phase'])
        self.state['phase']='chain'
        return dict(source=source,target=target,payment_time=spec['cost'],paid=paid,prepared_paid=prepared,source_reference=REFS[card]+'#'+card)

    @atomic
    def resolve(self,choice_card=None):
        s=self.state;link=s['activation']
        if not link or s['phase']!='chain':raise ValueError('no pending effect')
        actor=link['actor'];p=s['players'][actor];spec=link['spec'];target=link['target'];kind=spec['kind'];applied=False;details={}
        if spec.get('choose_at_resolution'):
            if p['field']['companions']:
                target=self.find(actor,choice_card,'companions')
            elif choice_card is not None:raise ValueError('no legal resolution choice')
        elif choice_card is not None:raise ValueError('unexpected resolution choice')
        valid='target' not in spec or self.eligible(actor,target,spec['target'])
        if kind=='recover':
            if valid and (spec.get('condition')!='same_name' or self.same_name(actor,target)):
                self.moved(actor,target,'hand');p['growth']=min(100,p['growth']+spec.get('reward',0));applied=True
        elif kind=='reserve':
            if valid:
                key='reservation-'+str(len(self.events)+1)
                s['reservations'][key]=dict(kind=spec['reservation'],owner=actor,target=target,source=link['source'],status='active',deadline='turn_end' if spec['reservation']=='win_by_two' else 'next_own_start')
                details['reservation_id']=key;applied=True
        elif kind=='remove':
            if valid:
                owner='B' if actor=='A' else 'A';destination='discard'
                for key,r in s['reservations'].items():
                    if r['status']=='active' and r['owner']==owner and r['target']==target and r['kind'] in ('prevent_departure','discard_to_hand'):
                        r['status']='consumed';destination=None if r['kind']=='prevent_departure' else 'hand';details['consumed']=key;break
                if destination:self.moved(owner,target,destination)
                details['destination']=destination;applied=True
        elif kind=='draw_growth':
            p['growth']=min(100,p['growth']+spec['growth']);details['drawn']=[]
            for _ in range(spec['draw']):
                if p['deck']:
                    i=p['deck'].pop(0);p['hand'].append(i);details['drawn'].append(i)
            applied=True
        elif kind=='peek_bottom':
            viewed=p['deck'][:spec['count']];p['deck']=p['deck'][len(viewed):]+viewed
            details.update(viewed=viewed,chosen=None,returned_order=viewed,choice='up_to_one_declined');applied=True
        else:raise ValueError('unsupported effect family')
        if link['action_card']:p['discard'].append(link['source'])
        s['activation']=None;s['phase']=link['return_phase']
        s['last_occurrence']=dict(kind='effect_resolved',card=link['card'])
        return dict(card=link['card'],target=target,effect_applied=applied,response_passes=[actor,'B' if actor=='A' else 'A'],details=details)

    @atomic
    def close_opportunity(self):
        self.own(self.state['turn_player'],('trigger_opportunity',))
        self.state['phase']='normal';self.state['last_occurrence']=None
        return dict(ordinary_triggers='declined',response_passes=[self.state['turn_player'],'B' if self.state['turn_player']=='A' else 'A'])

    @atomic
    def enter_end(self):
        self.own(self.state['turn_player']);self.state['phase']='end';self.state['last_occurrence']=dict(kind='turn_end')
        return dict(response_passes=[self.state['turn_player'],'B' if self.state['turn_player']=='A' else 'A'])

    @atomic
    def end_turn(self):
        self.own(self.state['turn_player'],('normal','end'))
        if self.state['phase']=='normal':self.state['phase']='end'
        for r in self.state['reservations'].values():
            if r['status']=='active' and r['deadline']=='turn_end':r['status']='expired'
        self.state['phase']='ended';self.state['last_occurrence']=None
        return dict(optional_end_abilities='declined',response_passes=['A','B'])


def load_scenario(focus):
    plan=json.loads((DATA/'proxy-gap-fixture-plan-112-20260918.json').read_text())
    spec=next(s for s in plan['fixtures'] if s['focus_card_id']==focus)
    fixture=json.loads((DATA/'proxy-gap-fixtures-112'/ (spec['fixture_id']+'.json')).read_text())
    return TargetedRunner(fixture)


def execute_scenario(focus):
    from proxy_targeted_scenarios import run
    r=load_scenario(focus);run(r,focus)
    effect=[e for e in r.events if e['command']['kind']=='resolve' and e['proof']['card']==focus and e['proof']['effect_applied']]
    verified=bool(effect)
    if focus in ('M-penguin-07','M-god-08'):
        verified=verified and any(e['proof'].get('details',{}).get('consumed') for e in r.events)
    return dict(schema='naotocchi.card_game.targeted_execution.v1',focus=focus,fixture=r.fixture['match_id'],fixture_sha256=canonical_sha256(r.fixture),source_sha256=source_hashes(),commands=r.commands,events=r.events,snapshots=r.snapshots,focus_verified=verified,completed_match_count=0,independent_balance_sample_count=0,policy_promoted=False,selection_mode='explicit_cooperative_targeted_choices',legal_inventory_complete=False,winner=None)


def replay(result):
    try:
        verify_sources(result['source_sha256']);r=load_scenario(result['focus'])
        if canonical_sha256(r.fixture)!=result['fixture_sha256']:raise ValueError('fixture differs')
        for cmd in result['commands']:
            if cmd['kind'] not in {'start_turn','main','person','world','prepare','challenge_draw','activate','resolve','close_opportunity','enter_end','end_turn'}:raise ValueError('unknown command')
            getattr(r,cmd['kind'])(**cmd['arguments'])
        if r.events!=result['events'] or r.snapshots!=result['snapshots']:raise ValueError('independent replay differs')
        if result!=execute_scenario(result['focus']):raise ValueError('scenario result metadata differs')
        return []
    except (ValueError,KeyError,TypeError) as e:return [str(e)]
