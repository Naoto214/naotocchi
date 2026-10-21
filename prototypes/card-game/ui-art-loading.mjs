// Fail closed to the stable, identity-safe placeholder already under the image.
// No retry, alternate private identity, prefetch, layout mutation or rule coupling.
export function hideFailedArt(image){
 if(!image?.classList?.contains('dedicated-art'))return;
 image.hidden=true;image.removeAttribute('src');image.removeAttribute('srcset');
 image.parentElement?.classList.add('art-unavailable');
}
export function installArtFallback(root=document){
 const onError=event=>hideFailedArt(event.target);
 root.addEventListener('error',onError,true);
 return ()=>root.removeEventListener('error',onError,true);
}

// Exact approved art-pilot overflow fitting, scoped to the current full detail face.
// The independent readable effect column, card dimensions and canonical text are untouched.
export function fitMainCardCopy(face){
 const copy=face?.querySelector('.card-copy');
 if(!face?.isConnected||!copy?.clientHeight)return;
 for(let size=3.1;copy.scrollHeight>copy.clientHeight+1&&size>=2.39;size-=0.1)copy.style.fontSize=size.toFixed(1)+'cqw';
}
