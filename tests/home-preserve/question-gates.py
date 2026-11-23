"""Repeat the snow and desert question-start checks with the shipped readiness state attached."""
import argparse
import json
import os
from pathlib import Path
from unittest.mock import patch

from playwright.sync_api import sync_playwright

import regional

READ=Path.read_text
CHECK="""
    const readiness={context:conv2ContextOk(),active:conv2Unit?.kind||null,message:!!message,
      speech:speechActive,busy:conversationIsBusy(),emotion:deriveHomeEmotion().state,
      suppressIdle:!!deriveHomeEmotion().suppressPetIdle,careAfterglow:!!careAfterglowTimer,
      petBusy:Date.now()<petBusyUntil,petMotion:!!castMotion?.isActive({kind:'pet'})};
"""


def instrument(path,*args,**kwargs):
    source=READ(path,*args,**kwargs)
    if path==regional.HERE/'regional-game.js':
        source=regional.once(source,'    const conversation=conv2Ask(',CHECK+'    const conversation=conv2Ask(')
        return regional.once(source,'return {first,changed,conversation,','return {first,changed,readiness,conversation,')
    return source


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path);p.add_argument('roots',type=Path,nargs='+')
    args=p.parse_args();rows=[]
    with sync_playwright() as pw,patch.object(Path,'read_text',instrument):
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for path in args.roots:
            url=regional.serve(path)
            for region in ('snow','desert'):
                r=regional.run(browser,path,url,region,4,375,'candidate',30,pairs=True)
                rows.append(dict(arm=path.name,region=region,count=4,width=375,fixture=r['fixture'],
                                 readiness=r['lifecycle']['readiness'],started=r['lifecycle']['conversation']))
                args.out.write_text(json.dumps(rows,indent=2)+'\n')
        browser.close()


if __name__=='__main__':main()
