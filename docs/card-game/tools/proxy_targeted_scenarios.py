"""Authored test inputs, not card-specific execution patches or policy choices."""

# (round, actor, method, keyword arguments). These inputs never alter source decks.
SCHEDULES={
 'G-jump-quest':[
  (1,'A','main',dict(card='M-beetle-01',variant='birth')),
  (3,'A','main',dict(card='M-beetle-02',variant='time_skip')),
  (3,'A','main',dict(card='M-beetle-03',variant='time_skip')),
  (3,'A','activate',dict(card='G-jump-quest',target_card='M-beetle-01'))],
 'M-mushroom-06':[
  (1,'A','main',dict(card='M-mushroom-01',variant='birth')),
  (1,'A','person',dict(card='C-otter')),
  (2,'A','person',dict(card='C-bat')),
  (3,'A','person',dict(card='C-box')),
  (4,'A','person',dict(card='C-otter',replace_card='C-otter')),
  (5,'A','main',dict(card='M-mushroom-06',variant='time_skip')),
  (5,'A','enter_end',{}),
  (5,'A','activate',dict(card='M-mushroom-06',target_card='C-otter'))],
 'M-sakura-05':[
  (1,'A','main',dict(card='M-sakura-01',variant='birth')),
  (1,'B','main',dict(card='M-antlion-01',variant='birth')),
  (2,'A','prepare',dict(card='G-curling-ice')),
  (2,'A','challenge_draw',dict(parameter='wisdom')),
  (2,'A','activate',dict(card='G-curling-ice')),
  (5,'A','main',dict(card='M-sakura-05',variant='time_skip')),
  (5,'A','enter_end',{}),
  (5,'A','activate',dict(card='M-sakura-05',target_card='G-curling-ice'))],
 'M-dragon-08':[
  (1,'A','main',dict(card='M-dragon-01',variant='birth')),
  (1,'A','person',dict(card='C-bat')),
  (2,'A','person',dict(card='C-box')),
  (2,'A','activate',dict(card='G-basketball-3d',target_card='M-dragon-01')),
  (3,'A','person',dict(card='C-chameleon')),
  (3,'A','activate',dict(card='G-crane-game-3d')),
  (5,'A','person',dict(card='C-chicken',replace_card='C-bat')),
  (7,'A','main',dict(card='M-dragon-08',variant='time_skip')),
  (7,'A','enter_end',{}),
  (7,'A','activate',dict(card='M-dragon-08',target_card='C-bat',payment_cards=['G-basketball-3d','G-crane-game-3d']))],
 'M-penguin-07':[
  (1,'A','person',dict(card='C-bat')),
  (7,'A','main',dict(card='M-penguin-01',variant='birth')),
  (8,'A','main',dict(card='M-penguin-07',variant='time_skip')),
  (9,'A','world',dict(card='W-countryside')),
  (9,'A','world',dict(card='W-city')),
  (9,'A','activate',dict(card='M-penguin-07',resolution_choice='C-bat'))],
 'M-god-08':[
  (1,'A','main',dict(card='M-god-01',variant='birth')),
  (1,'A','person',dict(card='C-bat')),
  (7,'A','main',dict(card='M-god-08',variant='time_skip')),
  (8,'A','activate',dict(card='M-god-08',target_card='C-bat',payment_cards=['G-stack-snowman']))],
}
DEFENSE_SETUP=[
 (3,'B','main',dict(card='M-dragon-01',variant='birth')),
 (3,'B','person',dict(card='C-bat')),
 (4,'B','prepare',dict(card='I-bond1',target_card='C-bat')),
 (5,'B','main',dict(card='M-dragon-06',variant='time_skip')),
]


def schedule(focus):
    rows=list(SCHEDULES[focus])
    if focus in ('M-penguin-07','M-god-08'):
        rows+=DEFENSE_SETUP
        rows.append((9 if focus=='M-penguin-07' else 8,'B','activate',dict(card='M-dragon-06',target_card='C-bat',payment_cards=['M-antlion-04'],prepared_card='I-bond1')))
    return sorted(enumerate(rows),key=lambda row:(row[1][0],row[1][1],row[0]))


def run(r,focus):
    rows=[row for _,row in schedule(focus)]
    keep={a:sorted({v for _,actor,_,args in rows if actor==a for key,value in args.items() for v in (value if isinstance(value,list) else [value]) if isinstance(v,str) and v.startswith(('M-','C-','G-','I-','W-','P-','E-'))}) for a in 'AB'}
    last_round=max(row[0] for row in rows)
    last_actor=max(row[1] for row in rows if row[0]==last_round)
    for number in range(1,last_round+1):
        for actor in 'AB':
            r.start_turn(actor,number,keep=keep[actor])
            for n,a,method,args in rows:
                if (n,a)!=(number,actor):continue
                if method=='enter_end':r.enter_end()
                else:getattr(r,method)(actor,**{k:v for k,v in args.items() if k!='resolution_choice'})
                if method=='activate':r.resolve(**({'choice_card':args['resolution_choice']} if 'resolution_choice' in args else {}))
            r.end_turn()
            if (number,actor)==(last_round,last_actor):return
