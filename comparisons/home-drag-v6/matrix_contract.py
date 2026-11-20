"""Validate the paired input and distinguish missing observations from game outcomes."""
import math

REGIONS=('home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake')
COUNTS=(1,4,10,20,28)
WIDTHS=(320,375,390,430)
ARMS=('v5','v6')
KINDS=('historical','diagonal','occupied','clear','obstacle','tap')


def require(ok,message):
    if not ok:
        raise ValueError(message)


def finite(value):
    return isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)


def case_keys(count):
    indexes=(0,min(1,count-1),min(2,count-1),0,0,min(4,count-1))
    return [f'{kind}/{index}' for kind,index in zip(KINDS,indexes)]


def validate_cell(cell,region,count,width):
    fixture=f'{region}/{count}/{width}'
    def check(ok,detail):
        require(ok,f'{fixture}: {detail}')

    check(cell.get('schema')==1 and cell.get('suite')=='matrix' and cell.get('paired') is True,'schema, suite or pairing')
    check((cell['region'],cell['count'],cell['width'])==(region,count,width),'incorrect grid coordinates')
    check(cell['engine']=='chromium','unexpected matrix engine')
    check(set(cell['arms'])==set(ARMS),'missing arm')
    before,after=(cell['arms'][name] for name in ARMS)
    check(before.get('seed') is not None and before['seed']==after['seed'],'different or missing fixture seed')
    check(before['opening']==after['opening'],'independent openings differ')
    roster=before['opening']
    check(len(roster)==len({r[0] for r in roster})==count,'resident IDs or count')
    check(all(len(r)>=7 and all(finite(x) for x in r[1:7]) for r in roster),'unmeasured native feet or dimensions')
    keys=case_keys(count)
    for name,arm in cell['arms'].items():
        check(arm.get('canonicalOpening') is True,name+' missing canonical owner opening')
        check(arm['viewport']==[width,cell['height']],name+' viewport mismatch')
        check(arm.get('browser') and arm.get('hashes'),name+' browser/source provenance')
        check(set(arm['rows'])==set(keys),name+' missing or duplicate planned gestures')
    for key in keys:
        a,b=(arm['rows'][key] for arm in (before,after))
        for field in ('kind','index','key','start','goal','origin','modelGoal','scale','foot','startClass','goalClass'):
            check(a.get(field)==b.get(field),key+' nonidentical '+field)
        kind,index=key.split('/')
        check(a['kind']==kind and a['index']==int(index),key+' label mismatch')
        check(bool(a.get('skip'))==bool(b.get('skip')),key+' only one arm skipped')
        if a.get('skip'):
            check(isinstance(a['skip'],str) and a['skip']==b['skip'],key+' missing shared skip reason')
            continue
        check(a['key']==roster[int(index)][0],key+' target identity differs from opening roster')
        for field in ('start','goal'):
            point=a.get(field)
            check(isinstance(point,list) and len(point)==2 and all(finite(v) for v in point),key+' invalid input coordinate')
        classification=a['goalClass']
        if kind=='clear':
            check(all(classification[k] for k in ('insideBounds','terrain','visible','straightClear')) and not classification['contacts'],key+' clear goal is obstructed')
        elif kind=='obstacle':
            check(classification['insideBounds'] and not classification['terrain'],key+' obstacle goal is passable or out of bounds')
        elif kind=='occupied':
            check(count>1,key+' single resident cannot target another resident')
        for name,row in zip(ARMS,(a,b)):
            label=name+'/'+key
            check(row.get('trusted') is True,label+' missing trusted physical input')
            for field in ('selected','issued','accepted','routed','arrived','moved','near4','terminalArrived','terminalNear4'):
                check(isinstance(row.get(field),bool),label+' absent outcome '+field)
            check(not row['arrived'] or row['issued'],label+' arrival without command')
            check(bool(row['near4'])==(bool(row['arrived']) and finite(row.get('fingerErrorCss')) and row['fingerErrorCss']<=4),label+' invalid near-arrival count')
            if row['arrived']:
                check(finite(row['fingerErrorCss']) and row['fingerErrorCss']>=0,label+' missing arrival distance')
            for field in ('searchCount','searchMaxMs','searchTotalMs','unsafeSteps','sweptViolations'):
                check(finite(row.get(field)) and row[field]>=0,label+' missing observation '+field)
            check(bool(row['terminalNear4'])==(bool(row['terminalArrived']) and finite(row.get('endFingerErrorCss')) and row['endFingerErrorCss']<=4),label+' invalid stationary near-arrival count')
            if row['terminalArrived']:
                check(row['stepCount']>0 and finite(row['terminalChosenErrorCss']) and row['terminalChosenErrorCss']<=.01 and not row['demandAtEnd']['target'],label+' insufficient terminal arrival proof')
            searches=row.get('searches')
            check(isinstance(searches,list) and len(searches)==row['searchCount'] and all(s.get('phase') in ('pointerdown','pointermove','pointerup','pointercancel','simulation') and finite(s.get('ms')) and s['ms']>=0 for s in searches),label+' unavailable graph search phase or time')
            events=row.get('pointerEvents') or []
            check(events and events[0][0]=='pointerdown' and events[-1][0]=='pointerup'
                  and all(e[1]=='touch' and e[2] is True for e in events),label+' missing trusted touchscreen delivery')
            for stage in ('demandAtRelease','demandAtEnd'):
                demand=row.get(stage)
                check(isinstance(demand,dict) and isinstance(demand.get('pending'),bool),label+' unavailable '+stage)
            jump=row.get('releaseJumpCss')
            check((not row['issued'] and jump is None) or (finite(jump) and jump>=0),label+' invalid measured release jump')
    return cell
