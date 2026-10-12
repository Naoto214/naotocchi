// QA-only actual state read: the production multi-face facade has a setter,
// not a readable common emotion. Validate every owned face before reporting.
export function snapshotCharacterState(instance){
 const faceEmotions=instance.faces.map(face=>face.emotion);
 if(!faceEmotions.length||!faceEmotions[0]||faceEmotions.some(e=>e!==faceEmotions[0]))throw Error('Inconsistent actual face emotion');
 return {emotion:faceEmotions[0],faceEmotions,moving:instance.anim.move>.99};
}
