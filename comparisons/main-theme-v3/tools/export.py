"""Reproducible MIDI / MusicXML / engraved SVG export. Requires mido and verovio.
Run node tools/catalog.cjs, then python tools/export.py from the audition directory.
"""
import json,pathlib,xml.etree.ElementTree as X,html,hashlib
import mido,verovio
P=pathlib.Path(__file__).resolve().parents[1]
songs=json.loads((P/'catalog.json').read_text())
PC={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def midi(n):
 if isinstance(n,int):return n
 return (int(n[-1])+1)*12+PC[n[0]]+('#' in n)-('b' in n)
def pitch(n):
 if isinstance(n,int):
  name=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][n%12]+str(n//12-1)
 else:name=n
 return name[0],int('#' in name)-int('b' in name),name[-1]
def sub(el,name,text=None,**attrs):
 o=X.SubElement(el,name,attrs)
 if text is not None:o.text=str(text)
 return o
links=[]
for s in songs:
 mid=mido.MidiFile(ticks_per_beat=480);track=mido.MidiTrack();mid.tracks.append(track)
 track.append(mido.MetaMessage('track_name',name=s['id']))
 track.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(s['bpm'])))
 track.append(mido.MetaMessage('time_signature',numerator=s['signature'][0],denominator=s['signature'][1]))
 ev=[]
 for n in s['events']['notes']:
  channel=0 if n['role']=='melody' else 1
  tick=round(n['time']*s['bpm']/60*480);length=round(n['dur']*s['bpm']/60*480)
  ev.append((tick,1,mido.Message('note_on',note=n['midi'],velocity=84 if channel==0 else 45,channel=channel)))
  ev.append((tick+length,0,mido.Message('note_off',note=n['midi'],velocity=0,channel=channel)))
 last=0
 for tick,_,msg in sorted(ev,key=lambda x:(x[0],x[1])):msg.time=tick-last;track.append(msg);last=tick
 track.append(mido.MetaMessage('end_of_track',time=max(0,round(s['events']['beats']*480)-last)))
 mid.save(P/'midi'/f"{s['id']}.mid")
 # Read back: count note-on events and ensure declared musical duration.
 check=mido.MidiFile(P/'midi'/f"{s['id']}.mid")
 assert sum(m.type=='note_on' and m.velocity>0 for m in check.tracks[0])==len(s['events']['notes'])
 assert abs(check.length-s['events']['duration'])<.001
 root=X.Element('score-partwise',version='4.0')
 work=sub(root,'work');sub(work,'work-title',s['id']+' — '+s['title'])
 identification=sub(root,'identification');sub(identification,'creator','Astra V3' if s['id'] in 'ABCDEF' else 'Reference: Naotocchi / Claude PR 524',type='composer')
 pl=sub(root,'part-list');sp=sub(pl,'score-part',id='P1');sub(sp,'part-name','Melody');part=sub(root,'part',id='P1')
 for i,bar in enumerate(s['bars']):
  measure=sub(part,'measure',number=str(i+1))
  if i==0:
   attrs=sub(measure,'attributes');sub(attrs,'divisions',4);key=sub(attrs,'key');sub(key,'fifths',{'C':0,'G':1,'D':2,'F':-1}[s['key']]);time=sub(attrs,'time');sub(time,'beats',s['signature'][0]);sub(time,'beat-type',s['signature'][1]);clef=sub(attrs,'clef');sub(clef,'sign','G');sub(clef,'line',2)
   direction=sub(measure,'direction');dt=sub(direction,'direction-type');met=sub(dt,'metronome');sub(met,'beat-unit','quarter');sub(met,'per-minute',s['bpm']);sub(direction,'sound',tempo=str(s['bpm']))
  # Chord symbols at their actual offsets; melody is the notated part.
  offset=0
  import re
  for chord,d in bar['ch']:
   match=re.match(r'([A-G])([#b]?)([^/]*)(?:/([A-G])([#b]?))?$',chord)
   h=sub(measure,'harmony');rr=sub(h,'root');sub(rr,'root-step',match[1]);alt={'#':1,'b':-1}.get(match[2],0)
   if alt:sub(rr,'root-alter',alt)
   kinds={'':'major','m':'minor','7':'dominant','maj7':'major-seventh','m7':'minor-seventh','m6':'minor-sixth','6':'major-sixth','7sus4':'suspended-fourth','sus4':'suspended-fourth','add9':'major'}
   k=sub(h,'kind',kinds[match[3]]);k.set('text',match[3])
   if match[4]:
    bass=sub(h,'bass');sub(bass,'bass-step',match[4]);a={'#':1,'b':-1}.get(match[5],0)
    if a:sub(bass,'bass-alter',a)
   if offset:sub(h,'offset',round(offset*4))
   offset+=d
  for n,d in bar['m']:
   # 2.5 beats is a tied half + eighth, not a nonstandard duration.
   chunks=[2,.5] if d==2.5 else [d]
   for j,duration in enumerate(chunks):
    note=sub(measure,'note')
    if n=='r':sub(note,'rest')
    else:
     step,alt,octave=pitch(n);pp=sub(note,'pitch');sub(pp,'step',step)
     if alt:sub(pp,'alter',alt)
     sub(pp,'octave',octave)
    sub(note,'duration',round(duration*4))
    if len(chunks)>1 and n!='r':sub(note,'tie',type='start' if j==0 else 'stop')
    types={.25:'16th',.5:'eighth',.75:'eighth',1:'quarter',1.5:'quarter',2:'half',3:'half',4:'whole'}
    sub(note,'type',types[duration])
    if duration in [.75,1.5,3]:sub(note,'dot')
    if len(chunks)>1 and n!='r':sub(sub(note,'notations'),'tied',type='start' if j==0 else 'stop')
 xml=X.tostring(root,encoding='unicode');(P/'scores'/f"{s['id']}.musicxml").write_text(xml)
 tk=verovio.toolkit();tk.setOptions({'pageWidth':1800,'pageHeight':2600,'scale':40,'adjustPageHeight':True,'breaks':'auto'});assert tk.loadData(xml)
 svgs=[]
 for p in range(1,tk.getPageCount()+1):
  name=f"{s['id']}-{p}.svg";(P/'scores'/name).write_text(tk.renderToSVG(p));svgs.append(name)
 links.append(f'<article id="{s["id"]}"><h2>{html.escape(s["title"])}</h2><p>{html.escape(s["character"])}</p><a href="{s["id"]}.musicxml" download>MusicXML</a> · <a href="../midi/{s["id"]}.mid" download>MIDI（伴奏付き）</a>'+''.join((P/'scores'/name).read_text() for name in svgs)+'</article>')
(P/'scores'/'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V3 譜面</title><style>body{max-width:1000px;margin:auto;padding:24px;font-family:system-ui;background:#faf9f2;color:#233c43}svg{width:100%;height:auto;background:white;display:block}p{line-height:1.9}article{margin:60px 0}a{color:#356960}</style><a href="../index.html">← 試聴室</a><h1>旋律のスケッチブック</h1><p>五線譜は1周分。MIDIは試聴と同じ周回数・原速・伴奏付きです。合成音色や音量正規化はMIDIには含まれません。</p>'+''.join(links))
print('8 MusicXML, 8 MIDI read-back verified, engraved scores generated')
