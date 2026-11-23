"""Repeat only stationary drag rows and sample safe first steps around the selected native body."""
import os
from pathlib import Path
from unittest.mock import patch

import regional

original=Path.read_text

def observe(path,*args,**kwargs):
    text=original(path,*args,**kwargs)
    if path==regional.HERE/'regional-probe.js':
        snapshots='''window.regionTrace.clearance??=[];window.regionTrace.clearance.push(surroundingClearance());'''
        text=original(regional.HERE/'drag-clearance.js')+text
        if os.environ.get('REGIONAL_OPEN_DIRECTION')=='1':
            text=regional.once(text,'return {key:a.key,from,goal};', '''const open=surroundingClearance().radii.at(-1).alternate;
        return {key:a.key,from,goal:open||goal,original:goal,open};''')
        text=regional.once(text,'for(let i=0;i<seconds*10;i++) model.step(.1,{blocked:false,reducedMotion:false});',
            'for(let i=0;i<seconds*10;i++){if([0,10,50,100,200,299].includes(i)){'+snapshots+
            '}model.step(.1,{blocked:false,reducedMotion:false});}')
    return text
if __name__=='__main__':
    with patch.object(Path,'read_text',observe):
        regional.main()
