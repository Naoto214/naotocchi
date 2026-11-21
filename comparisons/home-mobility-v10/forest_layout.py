"""Shared opening controls for the live forest and its isolated touch replays."""
from urllib.parse import urlencode

SAVE_KEY='naotocchi-cast-size-v1-fixture'


def fixture_script(source, order, seed, saved=None):
    """Reorder the native saved companion list before it is loaded, leaving the two lead roles intact."""
    return fixture_seeded(source, order, seed, saved is not None)


def fixture_seeded(source, order, seed, load_saved=False):
    seed_anchor='let seed=214;'
    save_anchor="  localStorage.setItem('naotocchi-cast-size-v1-fixture',JSON.stringify(state));"
    assert source.count(seed_anchor)==source.count(save_anchor)==1
    source=source.replace(seed_anchor,f'let seed={int(seed)};')
    shuffle='''
  let rosterSeed=ORDER;
  if (rosterSeed) {
    for (let i=state.companions.length-1;i>0;i--) {
      rosterSeed=(Math.imul(1664525,rosterSeed)+1013904223)>>>0;
      const j=Math.floor(rosterSeed/4294967296*(i+1));
      [state.companions[i],state.companions[j]]=[state.companions[j],state.companions[i]];
    }
  }
'''.replace('ORDER',str(int(order))) if order else ''
    if load_saved:
        return source.replace(save_anchor,"  localStorage.setItem('naotocchi-cast-size-v1-fixture',globalThis.forestSavedRaw);")
    return source.replace(save_anchor,shuffle+save_anchor)


def forest_url(base, arm, paired=True):
    query=urlencode(dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=int(paired),variant='B',season='autumn',weather='sunny'))
    return base.rstrip('/')+'/game/mobility-'+arm+'.html?'+query
