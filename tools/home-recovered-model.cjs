// Only the independent recovered trial receives this presentation adapter.
// The v22 model and previous comparisons remain byte-identical.
exports.recoveredModelSource=source=>{
 const marker='const best=candidates.find(fits);';
 if(!source.includes(marker))throw Error('Recovered crowd adapter: upstream seating changed');
 return source.replace(marker,`let best=candidates.find(fits);
          // A narrow painted path cannot always fit 28 fully separated bodies.
          // Keep every foot on the path and preserve the pet's reserved exit;
          // among those seats minimize overlap with already seated residents.
          if(!best&&a!==lead&&exit.length){
            const allowed=candidates.filter(p=>(!scene.navigation||scene.navigation.valid(p))&&visible(a,p)&&exit.every(q=>separated(lead,q,{...a,x:p.x,y:p.y})));
            const overlap=p=>seated.reduce((sum,b)=>sum+Math.max(0,1-clearance(a,p,b))**2,0);
            allowed.sort((p,q)=>overlap(p)-overlap(q)||p.d-q.d);best=allowed[0];
          }`);
};
