"""Original score + sample-free synthesis. Python 3 / numpy / ffmpeg.
Run from repository root. Masters go to .work-output (not committed).
No external recordings, soundfonts, pretrained models or music inputs.
A and C quote the repository's existing home score; see RIGHTS.md.
"""
from pathlib import Path
import json, re, subprocess, hashlib, wave
import numpy as np
ROOT=Path(__file__).resolve().parent
SR=32000
OUT=Path('.work-output/music-v1'); OUT.mkdir(parents=True,exist_ok=True)
(ROOT/'audio').mkdir(exist_ok=True)
# Explicitly composed four-beat phrases: MIDI pitches / rests, one slot per half beat.
THEME=[[74,78,81,None,83,81,78,None],[76,78,81,78,76,None,74,None],[71,74,78,None,81,78,76,None],[73,76,78,76,73,None,69,None],
[74,None,78,81,86,None,83,81],[83,81,78,None,76,78,81,None],[79,78,76,74,76,None,78,None],[81,None,78,76,73,None,74,None]]
DAILY=[[74,None,78,81,78,None,76,None],[73,76,None,78,76,None,73,None],[71,None,74,78,81,None,78,None],[69,73,76,None,78,76,73,None],
[74,78,None,81,83,None,81,78],[76,None,78,None,81,78,76,None],[79,None,78,76,74,None,76,None],[73,76,None,78,76,73,74,None]]
NIGHT=[[81,None,None,78,None,None,74,None],[78,None,None,76,None,None,73,None],[78,None,81,None,83,None,None,None],[81,None,None,76,73,None,None,None],
[86,None,None,83,81,None,78,None],[83,None,None,81,78,None,None,None],[79,None,78,None,76,None,74,None],[76,None,None,73,74,None,None,None]]
PUZZLE=[[76,None,83,81,None,78,None,None],[74,None,81,78,None,76,None,None],[72,None,79,83,None,81,79,None],[71,None,78,76,None,74,None,None],
[76,78,83,None,86,None,83,None],[81,None,78,76,None,74,None,None],[79,83,None,81,79,None,76,None],[78,None,75,None,76,None,None,None]]
JOURNEY=[[74,78,81,None,83,81,78,None],[81,None,78,76,74,None,73,None],[71,74,78,None,81,None,83,81],[78,76,73,None,69,None,73,None],
[74,78,81,83,86,None,83,81],[83,None,81,78,76,None,78,None],[79,78,76,None,74,76,78,None],[81,78,76,73,74,None,None,None]]
CARD=[[69,None,76,None,79,76,None,72],[67,None,74,None,76,None,74,None],[65,None,72,76,None,74,72,None],[64,None,71,None,74,71,None,None],
[76,None,79,83,None,81,79,None],[74,None,76,None,79,76,74,None],[77,76,74,None,72,None,69,None],[71,None,68,None,69,None,None,None]]
LATE=[[69,76,None,79,81,79,76,None],[71,74,78,None,81,78,74,None],[72,76,None,79,83,None,81,79],[68,71,76,74,71,None,68,None],
[81,79,76,None,83,81,79,76],[78,None,81,83,86,83,81,None],[77,76,74,72,74,76,77,None],[76,None,74,71,68,None,69,None]]
STORY=[[74,None,None,None,78,None,81,None],[76,None,None,78,73,None,None,None],[71,None,74,None,None,None,78,None],[76,None,None,None,73,None,None,None],
[74,None,78,None,83,None,81,None],[78,None,None,None,76,None,None,None],[79,None,78,None,76,None,74,None],[73,None,None,None,74,None,None,None]]
MAJOR=[[50,57,61,66],[49,56,59,64],[47,54,57,62],[45,52,57,61],[50,57,61,66],[47,54,59,62],[43,50,57,59],[45,52,55,61]]
MINOR=[[45,52,55,60],[43,50,55,59],[41,48,52,57],[40,47,52,56],[45,52,55,60],[43,50,55,59],[41,48,53,57],[40,47,52,56]]
EMIN=[[40,47,55,59],[38,45,54,57],[36,43,52,55],[35,42,50,54],[40,47,55,59],[38,45,54,57],[36,43,52,55],[35,42,51,57]]
# Extract only the pre-existing home data for A/C; preserve full original audio.js separately.
src=(ROOT/'legacy-audio.js').read_text(); home=src.split('home: {',1)[1].split('night: {',1)[0]
oldlead=json.loads('['+home.split('lead: [',1)[1].rsplit('}')[0].strip().rstrip(',').strip()[:-1].replace('_','null')) if False else None
leadpart=home.split('lead: [',1)[1]; oldlead=json.loads('['+leadpart[:leadpart.rfind(']')+1].replace('_','null'))
chpart=home.split('chords: ',1)[1].split(',\n',1)[0]; oldch=json.loads(chpart)
def notes(phrases,chords,bpm,bars,style,old=False):
    ev=[]
    def add(b,n,d,v,inst,pan=0):
        if n is not None: ev.append([round(b,4),n,d,v,inst,pan])
    for bar in range(bars):
        chord=chords[bar%len(chords)]; phr=phrases[bar%len(phrases)]
        for j,n in enumerate(phr):
            # second half answer: rare octave lift, spacious cadences retained
            inst='flute' if style in ('theme','journey') and bar>=8 else ('bell' if style in ('night','puzzle') else 'piano')
            if style=='card': inst='marimba'
            add(bar*4+j*4/len(phr),n,(0.78 if style in ('night','story') else 0.42),0.22 if style=='story' else 0.28,inst,.12)
        add(bar*4,chord[0]-12,3.3,.13,'bass',-.08)
        for n in chord[1:]: add(bar*4,n,3.85,.035 if style=='story' else .048,'pad',-.2)
        pattern=[0,2,1,3,1,2,0,2] if style in ('journey','late') else [0,2,1,3]
        for j,c in enumerate(pattern):
            if style=='story' and j%2: continue
            add(bar*4+j*4/len(pattern)+.025,chord[c%len(chord)]+(12 if style in ('night','puzzle') else 0),.8,.065 if style in ('night','story') else .095,'guitar' if style in ('daily','journey','fusion') else 'piano',-.45)
        if style in ('theme','daily','fusion','journey','late'):
            for beat in (0,2): add(bar*4+beat,36,.18,.035,'pulse',0)
        if style in ('puzzle','night') and bar%2==1: add(bar*4+3,phr[0]+12,1.5,.045,'bell',.55)
    return ev
specs=[
('main-a','A｜おかえり、いつもの庭','既存メロディーを保持した改良案',88,16,'piano',oldlead,oldch,'C major','ピアノ・柔らかい弦・分散和音'),
('main-b','B｜ひかりの種','完全新規メインテーマ',80,16,'theme',THEME,MAJOR,'D major','ピアノ・木管・柔らかい弦'),
('main-c','C｜昨日から、明日へ','前半に既存曲、後半に新テーマをつなぐ融合案',84,16,'fusion',oldlead[:4]+THEME[4:],oldch[:4]+MAJOR[4:],'C → D major','ピアノ・ギター風の撥弦・柔らかい弦'),
('home-day','窓辺の小さな日々','2.5Dホーム｜日常',84,16,'daily',DAILY,MAJOR,'D major','ピアノ・ギター風の撥弦'),
('home-night','星の寝息','2.5Dホーム｜夜',60,8,'night',NIGHT,MAJOR,'D major / B minor','オルゴール風ベル・柔らかい弦'),
('naopoyo','鍵穴の向こう','なおぽよ。｜パズル',72,16,'puzzle',PUZZLE,EMIN,'E minor','ベル・ピアノ・淡いパッド'),
('naokoro','寄り道の地図','なおころ。｜人生の旅',92,16,'journey',JOURNEY,MAJOR,'D major','ギター風の撥弦・木管・ピアノ'),
('card-normal','静かな一手','CARD GAME｜通常対戦',88,16,'card',CARD,MINOR,'A minor','マリンバ風・ピアノ・柔らかい弦'),
('card-late','残された針','CARD GAME｜終盤',108,16,'late',LATE,MINOR,'A minor','ピアノ・弦・控えめな低いパルス'),
('story','微睡みに灯るもの','微睡みの箱庭｜物語',64,12,'story',STORY,MAJOR,'D major / B minor','余白の多いピアノ・薄い弦')]

def synth_note(n,d,inst):
    t=np.arange(int((d+1.4)*SR))/SR; f=440*2**((n-69)/12); phase=2*np.pi*f*t
    if inst in ('piano','guitar','marimba','bell'):
        ratios,amps,decay={'piano':([1,2,3,4,5],[1,.32,.15,.07,.025],1.2),'guitar':([1,2,3,4,5],[1,.38,.16,.08,.03],.65),'marimba':([1,4,10],[1,.16,.025],.48),'bell':([1,2.756,5.404],[1,.20,.055],1.9)}[inst]
        y=sum(a*np.sin(phase*r)*np.exp(-t*(1+i*.7)/decay) for i,(r,a) in enumerate(zip(ratios,amps)))
        env=np.minimum(t/.008,1)*np.minimum(np.maximum(d+1.4-t,0)/.12,1)
    elif inst=='pad':
        y=(np.sin(phase)+.26*np.sin(phase*1.0015)+.16*np.sin(phase*2))/1.42
        env=np.minimum(t/.38,1)*np.minimum(np.maximum(d+.7-t,0)/.8,1)*.8
    elif inst=='flute':
        vib=.003*np.sin(2*np.pi*4.8*t)*np.minimum(t/.3,1)
        y=np.sin(phase+vib*32)+.16*np.sin(2*phase)+.04*np.sin(3*phase)
        env=np.minimum(t/.07,1)*np.minimum(np.maximum(d+.18-t,0)/.25,1)
    elif inst=='pulse':
        y=np.sin(2*np.pi*(48*t+1.6*(1-np.exp(-t*30)))); env=np.exp(-t*25)*np.minimum(t/.008,1)
    else:
        y=np.sin(phase)+.1*np.sin(2*phase); env=np.minimum(t/.02,1)*np.exp(-t/1.15)*np.minimum(np.maximum(d+.2-t,0)/.2,1)
    return y*env
tracks=[]
for ident,title,scene,bpm,bars,style,phr,ch,key,instruments in specs:
    duration=bars*4*60/bpm; length=round(duration*SR); x=np.zeros((length,2),dtype=np.float64)
    events=notes(phr,ch,bpm,bars,style)
    for b,n,d,v,inst,pan in events:
        y=synth_note(n,d*60/bpm,inst)*v; start=round(b*60/bpm*SR)
        ix=(np.arange(len(y))+start)%length
        # Circular overlap-add keeps release tails and room decay across the loop seam.
        x[ix,0]+=y*np.sqrt((1-pan)/2); x[ix,1]+=y*np.sqrt((1+pan)/2)
    dry=x.copy()
    for delay,g in ((.071,.09),(.113,.07),(.191,.055),(.307,.035),(.433,.02)):
        x+=np.roll(dry[:,::-1],round(delay*SR),axis=0)*g
    # Match RMS without dynamic compression, keep >= 1 dB sample peak headroom.
    rms=np.sqrt(np.mean(x*x)); gain=min(.085/rms,.85/np.max(np.abs(x))); x*=gain
    pcm=np.round(x*32767).astype('<i2'); wav=OUT/(ident+'.wav')
    with wave.open(str(wav),'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    dest=ROOT/'audio'/(ident+'.mp3')
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k','-write_xing','1',str(dest)],check=True)
    tracks.append(dict(id=ident,title=title,scene=scene,bpm=bpm,bars=bars,key=key,instruments=instruments,seconds=round(duration,4),file='audio/'+dest.name,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),masterSha256=hashlib.sha256(wav.read_bytes()).hexdigest(),peakDb=round(20*np.log10(np.max(np.abs(x))),2),rmsDb=round(20*np.log10(np.sqrt(np.mean(x*x))),2),seamDelta=float(np.max(np.abs(x[0]-x[-1]))),events=events))
    print(ident,round(duration,2),dest.stat().st_size,flush=True)
(ROOT/'scores.json').write_text(json.dumps(tracks,ensure_ascii=False,separators=(',',':')))
(ROOT/'manifest.json').write_text(json.dumps([{k:v for k,v in t.items() if k!='events'} for t in tracks],ensure_ascii=False,indent=2))
