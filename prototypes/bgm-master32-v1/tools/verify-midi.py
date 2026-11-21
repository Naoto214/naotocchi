"""Independent Standard MIDI File parser: verify the exported lead and source MIDI."""
import pathlib,struct,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
def parse(p):
 data=p.read_bytes();ppq=int.from_bytes(data[12:14],'big');pos=14;tracks=[]
 while pos<len(data):
  assert data[pos:pos+4]==b'MTrk';length=int.from_bytes(data[pos+4:pos+8],'big');track=data[pos+8:pos+8+length];pos+=length+8
  i=t=0;running=None;active={};notes=[]
  def vlq():
   nonlocal i
   n=0
   while True:
    b=track[i];i+=1;n=(n<<7)|(b&127)
    if b<128:return n
  while i<len(track):
   t+=vlq();status=track[i]
   if status>=128:i+=1
   else:status=running
   if status==255:
    i+=1;n=vlq();i+=n;continue
   if status in (240,247):i+=vlq();continue
   running=status;n=1 if status&240 in (192,208) else 2;msg=track[i:i+n];i+=n
   channel=status&15;kind=status&240
   if kind==144 and msg[1]>0:
    key=(channel,msg[0]);assert key not in active,(p,'overlapping same-pitch notes on one MIDI track/channel',key)
    active[key]=t
   elif kind==128 or (kind==144 and msg[1]==0):
    key=(channel,msg[0]);start=active.pop(key,None)
    if start is not None:notes.append({'channel':channel,'midi':msg[0],'tick':start,'duration':t-start})
  tracks.append(sorted(notes,key=lambda n:(n['tick'],n['midi'])))
 return ppq,tracks
def verify_delivery():
 scores=json.loads((ROOT/'scores.json').read_text());count=0
 for s in scores:
  ppq,tracks=parse(ROOT/'midi'/(s['id']+'.mid'))
  lead=[n for tr in tracks for n in tr if n['channel']==0]
  expected=sorted([{'midi':e['midi'],'tick':round(e['t']*s['bpm']/60*ppq),'duration':round(e['dur']*s['bpm']/60*ppq)} for e in s['events'] if e['role']=='melody'],key=lambda n:(n['tick'],n['midi']))
  assert len(lead)==len(expected),(s['id'],'lead count',len(lead),len(expected))
  for a,b in zip(lead,expected):
   assert a['midi']==b['midi'] and abs(a['tick']-b['tick'])<=1 and abs(a['duration']-b['duration'])<=1,(s['id'],a,b)
  count+=1
 return count
def verify_sources():
 src=json.loads((ROOT/'source.json').read_text());count=0
 for s in src:
  candidates=[ROOT.parent/'bgm-complete-v3-20261109/midi'/('naotocchi-bgm-v3-'+s['id']+'.mid'),ROOT.parent/'bgm-survey-20261108/midi'/('naotocchi-bgm-'+s['id']+'.mid')]
  p=next((p for p in candidates if p.exists()),None)
  if p is None:continue
  ppq,tracks=parse(p);lead=[n for tr in tracks for n in tr if n['channel']==0];expected=s['flat']['notes']
  assert len(lead)==len(expected),(s['id'],'source count')
  for a,b in zip(lead,expected):assert a['midi']==b['midi'] and abs(a['tick']-b['beat']*ppq)<1 and abs(a['duration']-(b['dur']*ppq-4))<1,(s['id'],a,b)
  count+=1
 return count
if __name__=='__main__':print(json.dumps({'deliveryLeadVerified':verify_delivery(),'sourceMidisVerified':verify_sources()}))
