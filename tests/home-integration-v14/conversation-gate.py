"""Repeat a regional observation with a read-only explanation of the game's question-start gate."""
from pathlib import Path
from unittest.mock import patch

import regional

READ=Path.read_text
GATE="""
    const readiness={context:conv2ContextOk(),unit:conv2Unit?.kind||null,hasMessage:!!message,
      speech:speechActive,busy:conversationIsBusy(),emotion:deriveHomeEmotion().state,
      suppressIdle:!!deriveHomeEmotion().suppressPetIdle,careAfterglow:!!careAfterglowTimer,
      petBusy:Date.now()<petBusyUntil,petMotion:!!castMotion?.isActive({kind:'pet'})};
"""

def observe(path,*args,**kwargs):
    text=READ(path,*args,**kwargs)
    if path==regional.HERE/'regional-game.js':
        text=regional.once(text,'    const conversation=conv2Ask(',GATE+'    const conversation=conv2Ask(')
        text=regional.once(text,'return {first,changed,conversation,','return {first,changed,readiness,conversation,')
    return text

if __name__=='__main__':
    with patch.object(Path,'read_text',observe):
        regional.main()
