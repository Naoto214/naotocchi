// Apply only to the owner trial's native diorama/controller.
function patchRender(source, kind) {
  if (kind !== 'diorama') return source;
  function replace(old, next) {
    if (source.split(old).length !== 2) throw Error('Unexpected foreground source: ' + old);
    source = source.replace(old, () => next);
  }

  // The images can still animate while a resident stands still. Read them all
  // on every paint, after all sibling boxes have received their final positions.
  replace('function paintForeground(a,row){', 'function paintForeground(a,row,edits){');
  replace("if(!near.length){if(n.style.maskImage){n.style.maskImage=n.style.webkitMaskImage='';}continue;}",
    "if(!near.length){if(n.style.maskImage)edits.push([n,'']);continue;}");
  const writeMask = "n.style.maskImage=n.style.webkitMaskImage=url;n.style.maskSize=n.style.webkitMaskSize='100% 100%';n.style.maskPosition=n.style.webkitMaskPosition='0px 0px';n.style.maskRepeat=n.style.webkitMaskRepeat='no-repeat';n.style.maskClip=n.style.webkitMaskClip='no-clip';";
  replace(writeMask, 'edits.push([n,url]);');

  const mode = "['17','18'].includes(doc.body?.dataset.homeDisplayVersion)";
  replace('const finishGround=env.HomeFinishGround?.prepare(', 'const batchForeground=' + mode + ';\n        const finishGround=env.HomeFinishGround?.prepare(');
  replace('if(row.paintStamp===stamp){if(' + mode + ')paintForeground(a,row);onPosition',
    'if(row.paintStamp===stamp){onPosition');
  replace('if(' + mode + ')paintForeground(a,row);\n        else if(world&&scene.navigation',
    'if(!batchForeground&&world&&scene.navigation');
  const end = "        onPosition(a,dx,dy);\n      }\n      const poop=";
  replace(end, `        onPosition(a,dx,dy);
      }
      if(batchForeground){
        const edits=[];
        for(const a of snapshot){
          const row=rows.get(a.key);
          if(row)paintForeground(a,row,edits);
        }
        for(const [n,url] of edits){
          if(!url){n.style.maskImage=n.style.webkitMaskImage='';continue;}
          ${writeMask}
        }
      }
      const poop=`);
  return source;
}

module.exports = {patchRender};
