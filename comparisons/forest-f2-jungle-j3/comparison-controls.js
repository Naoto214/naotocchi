// Review navigation only; controls are outside the game's fixed 5+4 dock.
addEventListener('DOMContentLoaded',()=>{
 const a=document.createElement('a');a.href='./';a.textContent='← 景観比較';a.setAttribute('aria-label','景観比較へ戻る');
 Object.assign(a.style,{position:'fixed',right:'10px',top:'max(8px, env(safe-area-inset-top))',zIndex:9000,font:'12px system-ui',color:'#fff',background:'#183d32dd',padding:'8px 10px',borderRadius:'20px',textDecoration:'none'});document.body.append(a);
});
