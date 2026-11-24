"""Replay an actual #570 serialized save through the final game's ordinary loader.

All saves belong to temporary browser profiles. The source household intentionally
wears no ribbon, which distinguishes a successful restore from the V2 default.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
from verify_interaction_scenes import launch, new_context, write

SAVE = 'naotocchi-cast-size-v1-fixture'
RECORD = """key=>{
    dispatchEvent(new Event('beforeunload'));
    return localStorage.getItem(key);
}"""
DISPLAY = """()=>({actors:HomeCastTrial.inspect().map(a=>a.key).sort(),gear:document.querySelector('#petAccessory')?.getBoundingClientRect().width||0,
    partnerRing:document.querySelector('.partner-ring')?.getBoundingClientRect().width||0,
    character:document.querySelector('#petSprite img.character-asset')?.getAttribute('src')||null})"""


def read_game(page, url):
    page.goto(url,wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function("window.HomeCastTrial?.ready && HomeCastTrial.inspect().length===28",polling=200,timeout=120000)
    return page.evaluate(DISPLAY)


def profile(raw):
    s=json.loads(raw)
    return {'species':s['speciesLine'],'stageIndex':s['stageIndex'],'sodachi':s['sodachi'],'evolutionStage':s['stage'],
            'partner':s['partner']['id'],'married':s['partner']['married'],'companions':[c['id'] for c in s['companions']],
            'equipment':s['lifetime'].get('equippedItemId'),'ownedEquipment':s['lifetime'].get('ownedShopItems',[])}


def run(args):
    with sync_playwright() as pw:
        browser=launch(pw,'chromium')
        prefix=args.url.rstrip('/')+'/game/'
        params='?region=river_lake&count=28&paused=1&time=day'
        ctx=new_context(browser,390,True)
        page=ctx.new_page()
        before=read_game(page,prefix+'index.html'+params+'&gear=none')
        assert not before['gear'] and before['partnerRing']>0,before
        old=page.evaluate(RECORD,SAVE)
        original=profile(old)
        assert len(original['companions'])==26 and original['married'] and not original['equipment']
        old_revision=json.loads(old)['lifetime']['saveRevision']
        ctx.close()
        ctx=new_context(browser,390,True)
        wire=urlopen(prefix+'beauty/fixture.js',timeout=20).read().decode()
        # Substitute only this test fixture's value, after the isolated store is
        # installed and before the unchanged loader reads its normal save key.
        altered=wire+'\nlocalStorage.setItem('+json.dumps(SAVE)+','+json.dumps(old)+');\n'
        ctx.route('**/beauty/fixture.js*',lambda route:route.fulfill(content_type='application/javascript',body=altered))
        page=ctx.new_page()
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        restored=read_game(page,prefix+'final.html'+params)
        updated=page.evaluate(RECORD,SAVE)
        new_revision=json.loads(updated)['lifetime']['saveRevision']
        assert original==profile(updated) and before['actors']==restored['actors']
        assert not restored['gear'] and restored['partnerRing']>0 and not errors
        assert new_revision>old_revision
        result={'browser':browser.version,'source':'serialized by /game/index.html (#570), gear=none',
                'target':'loaded and serialized by /game/final.html, default V2 fixture has a ribbon',
                'originSaveSha256':hashlib.sha256(old.encode()).hexdigest(),'region':'river_lake','residentCount':len(restored['actors']),
                'rolesAndSpeciesEqual':True,'evolutionAndSodachiEqual':True,'marriedPairAndRingEqual':True,
                'equipmentAndInventoryEqual':True,'nativeSaveRevision':[old_revision,new_revision],'pageErrors':errors}
        write(args.out,result)
        print(json.dumps(result),flush=True)
        browser.close()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('url');cli.add_argument('--out',type=Path,required=True)
    run(cli.parse_args())
