"""Regression guard for the upper half of the sea E comparison slider."""
import sys
from playwright.sync_api import sync_playwright

CHECK = """async()=>{
  const {drawSeaE}=await import('/game/beauty/sea-e.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const image=new Image();
  image.src='/game/'+DAYPARTS.sea.evening;
  await image.decode();
  const canvas=document.createElement('canvas');
  canvas.width=320; canvas.height=480;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  function frame(variant,strength) {
    ctx.globalAlpha=1;
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    drawSeaE(ctx,{variant,strength,region:'sea',time:'evening',weather:'sunny',
      season:'summer',image,seconds:22.75,width:canvas.width,height:canvas.height,
      reduced:false,opacity:1,effects:{}});
    return ctx.getImageData(0,0,canvas.width,canvas.height).data;
  }
  const rows=[];
  for(const variant of ['E1','E2','E3']){
    const a=frame(variant,1.5),b=frame(variant,2);
    let changed=0;
    for(let i=0;i<a.length;i+=4){
      const delta=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
      if(delta>12)changed++;
    }
    rows.push({variant,changed});
  }
  return rows;
}"""

if __name__ == "__main__":
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page()
        page.goto(sys.argv[1].rstrip('/')+'/game/beauty/bridge.js')
        rows=page.evaluate(CHECK)
        browser.close()
    print(rows)
    assert all(r['changed'] > 100 for r in rows), "150% and 200% must paint distinguishable original-art frames"
