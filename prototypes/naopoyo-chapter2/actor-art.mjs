import {spriteSpec} from '../naopoyo-rescue/sprites.mjs';
// Fit the opaque crop first, then anchor its feet. drawSprite's centered
// letterboxing is appropriate elsewhere but made short forest actors hover.
export function actorSpriteBox(a,cell,held=false){
 const [, ,w,h]=spriteSpec(a.species,a.level).crop;
 const size=cell*(held?.78:.73),scale=Math.min(size/w,size/h);
 const width=w*scale,height=h*scale*(1-(a.landing||0)*.1);
 return {x:(a.x+.5)*cell-width/2,y:(a.y+.96)*cell-height,w:width,h:height};
}
