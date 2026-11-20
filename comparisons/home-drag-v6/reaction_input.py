"""Open a real game gate, deliver a native touch, observe acknowledgment, issue and arrival."""
import math


CASES=['notice','bounce','during','softtap','emptyground','expire','modal','pause','cancel','replace','hardatpress']


def dispatch(touch,event,point=None):
    points=[] if point is None else [dict(x=point[0],y=point[1],id=1,radiusX=5,radiusY=5,force=.7)]
    touch.send('Input.dispatchTouchEvent',{'type':event,'touchPoints':points})


def check_gate(page,touch,index,kind,reference):
    page.evaluate('HomeCastTrial.apply({paused:false})')
    plan=page.evaluate('p=>touchQA.prepare(p)',dict(index=index,kind='empty' if kind=='emptyground' else 'clear'))
    if plan.get('skip'):return {'index':index,'key':plan['key'],'kind':kind,'skip':plan['skip']}
    start,goal=plan['start'],plan['goal']
    if kind=='emptyground':goal=[start[0]+32,start[1]+16]
    if kind=='softtap':goal=start[:]
    if reference:
        start,goal=reference['start'],reference['goal']
    page.evaluate('touchQA.gateClock=true;touchQA.gateStarted=performance.now()')
    if kind=='during':dispatch(touch,'touchStart',start)
    entered=page.evaluate('p=>touchQA.triggerGate(p[0],p[1])',['bounce' if kind=='bounce' else 'notice',4100 if kind=='expire' else 1300])
    if kind=='hardatpress':
        entered=page.evaluate("touchQA.triggerGate('modal')")
    entered['hitAtPress']=page.evaluate('p=>({native:touchQA.hit(...p),tag:document.elementFromPoint(...p)?.tagName,id:document.elementFromPoint(...p)?.id,cls:document.elementFromPoint(...p)?.className})',start)
    if not entered['ordinary']:raise RuntimeError(('native gate was not established',kind,entered))
    if kind!='during':dispatch(touch,'touchStart',start)
    if kind!='softtap':
        for f in (.2,.5,.8,1):dispatch(touch,'touchMove',[x+(y-x)*f for x,y in zip(start,goal)])
    dispatch(touch,'touchCancel' if kind=='cancel' else 'touchEnd')
    released=page.evaluate('({gate:touchQA.gates(),intent:touchQA.waiting(),clock:performance.now()-touchQA.gateStarted,selected:touchQA.model.selected(),marker:!document.querySelector(".diorama-target").hidden,issued:!!touchQA.log.directRequests?.length})')
    if kind in ('pause','modal','replace'):
        if kind=='pause':page.evaluate('HomeCastTrial.apply({paused:true})')
        if kind=='modal':page.evaluate("touchQA.triggerGate('modal')")
        if kind=='replace':
            dispatch(touch,'touchStart',start);dispatch(touch,'touchEnd')
    # Poll the real UI / frame through the retention window, plus a margin.
    if kind in ('notice','bounce','during'):
        page.wait_for_function('!touchQA.gates().blocked&&!touchQA.waiting()',timeout=12000)
        page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    else:
        page.wait_for_timeout(2950 if kind not in ('expire','hardatpress') else 4450)
        if kind in ('modal','hardatpress'):page.evaluate("touchQA.triggerGate('close-modal')")
        if kind=='pause':page.evaluate('HomeCastTrial.apply({paused:false})')
        page.wait_for_timeout(180)
    observed=page.evaluate('''() => {
      touchQA.gateClock=false;
      const manual=touchQA.demand(), now=performance.now()-touchQA.gateStarted;
      touchQA.advance(12.35,false);
      return {now,manual,result:touchQA.result(),intent:touchQA.waiting(),gate:touchQA.gates()};
    }''')
    r=observed['result']
    moves=[x for x in r.get('directRequests',[]) if x['key']==plan['key']]
    arrivals=[x for x in r['reactions'] if x[1:3]==['arrive','drag']]
    s=plan['scale']
    target=[plan['modelGoal'][k] for k in ('x','y')]
    def dist(a,b):return round(math.hypot((a[0]-b[0])*s[0],(a[1]-b[1])*s[1]),3)
    ev=r['pointers']
    return dict(index=index,key=plan['key'],kind=kind,skip=None,start=start,goal=goal,modelGoal=target,foot=plan['foot'],
        scale=s,trusted=bool(ev) and all(e[1:3]==['touch',True] for e in ev),pointerEvents=ev,gateHistory=r['gates'],entered=entered,
        released=released,retentionEnd=observed['intent'],ended=observed['now'],gateAfter=observed['gate'],
        nativeRequests=moves,nativePlans=r.get('modelPlans',[]),plans=r['plans'],issued=bool(moves),arrived=bool(arrivals),
        fingerErrorCss=min([dist(x[3],target) for x in arrivals],default=None),releaseGoalErrorCss=min([dist(x['request'],target) for x in moves],default=None),
        actualIssueAfterReleaseMs=moves[0]['wall']-r['inputTimes']['pointerup']['end'] if moves and r['inputTimes'].get('pointerup',{}).get('end') else None,
        markers=r.get('markers',[]),reactions=r['reactions'],end=r['end'],unsafeSteps=r['unsafeSteps'],sweptViolations=r['sweptContactViolations'])
