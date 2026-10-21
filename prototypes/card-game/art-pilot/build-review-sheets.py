"""Compose review contact sheets; original illustration pixels/files are never changed."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
p=Path(__file__).parent
cards=json.loads((p/'pilot-cards.json').read_text())
font=ImageFont.truetype('/root/.local/share/fonts/mplus-rounded.ttf',20)
def sheet(cs,name):
 out=Image.new('RGB',(1280,500),'#f4efe2');d=ImageDraw.Draw(out)
 for i,c in enumerate(cs):
  x=(i%4)*320;y=(i//4)*250
  im=Image.open(p/'illustrations'/f"{c['id']}.png");im.thumbnail((308,205));out.paste(im,(x+6,y+6));d.text((x+8,y+214),c.get('form',c['name']),font=font,fill='#453c2e');d.text((x+8,y+236),c['id'],fill='#453c2e')
 out.save(p/'previews'/name)
sheet(cards[7:15],'main-eight-art.png');sheet(cards[15:],'other-eight-art.png')
out=Image.new('RGB',(1120,440),'#f4efe2');d=ImageDraw.Draw(out)
for i,c in enumerate(cards[:7]):
 x=i*160
 d.text((x+8,5),c['id'],fill='#453c2e')
 for row,sub in [(0,'evidence/before'),(1,'previews')]:
  out.paste(Image.open(p/sub/f"{c['id']}-110.png"),(x+25,35+row*200))
d.text((5,205),'Before / After',font=font,fill='#453c2e');out.save(p/'previews/spacing-before-after.png')
a=Image.open(p/'previews/iphone-width-80.png');b=Image.open(p/'previews/iphone-width-110.png');out=Image.new('RGB',(800,max(a.height,b.height)+30),'#f4efe2');out.paste(a,(0,30));out.paste(b,(410,30));d=ImageDraw.Draw(out);d.text((15,5),'80 x 120',font=font,fill='#453c2e');d.text((425,5),'110 x 165',font=font,fill='#453c2e');out.save(p/'previews/all23-small-comparison.png')
