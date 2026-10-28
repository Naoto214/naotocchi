const resultBox=document.getElementById('position-out');
const delay=()=>new Promise(r=>setTimeout(r,250));
const anchor=()=>{const y=document.querySelector('.toolbar').getBoundingClientRect().bottom+12;const n=[...document.querySelectorAll('.source')].find(n=>n.getBoundingClientRect().bottom>y);const r=n.getBoundingClientRect();return {index:n.dataset.sourceIndex,offset:(r.top-y)/r.height,y:scrollY}};
const same=(a,b)=>a.index===b.index&&Math.abs(a.offset-b.offset)<.03;
document.getElementById('position-run').onclick=async()=>{
 const results=[];const p=document.querySelector('[data-source-index="185"]');p.scrollIntoView();scrollBy(0,16);await delay();const a=anchor();
 document.querySelector('nav a[href="#chapter-6"]').click();await delay();results.push({test:'chapter6',pass:document.querySelector('#chapter-6').getBoundingClientRect().top>=58});
 const back=new Promise(r=>addEventListener('popstate',r,{once:true}));history.back();await back;await delay();results.push({test:'back',pass:same(a,anchor()),before:a,after:anchor()});
 document.querySelector('[data-size="21"]').click();await delay();results.push({test:'font-anchor',pass:same(a,anchor()),after:anchor()});
 const b=anchor();document.querySelector('.book-name').click();await delay();const resume=document.querySelector('#resume');results.push({test:'cover',pass:scrollY===0&&!resume.hidden});resume.click();await delay();results.push({test:'resume',pass:same(b,anchor()),before:b,after:anchor()});
 const c=anchor();resume.click();await delay();results.push({test:'same-hash-resume',pass:same(c,anchor())});
 sessionStorage.setItem('white-qa-pending',JSON.stringify({results,anchor:anchor()}));location.reload();
};
addEventListener('load',async()=>{const data=sessionStorage.getItem('white-qa-pending');if(!data)return;sessionStorage.removeItem('white-qa-pending');await delay();const q=JSON.parse(data);q.results.push({test:'reload',pass:same(q.anchor,anchor()),before:q.anchor,after:anchor()});resultBox.textContent=JSON.stringify({complete:true,results:q.results},null,2)});
