// Invoke the game’s normal presentation owners to schedule reproducible real
// notices/animations. User input still travels through the browser touch stack.
window.touchQA.triggerGate=(name,ms=1100)=>{
  if(name==='notice') {
    setSpeechBubble('おさんぽしよう。',petSpeaker(),{event:'idle',important:true,holdMs:ms});
  } else if(name==='bounce') {
    castMotion.emote('bounce');
  } else if(name==='modal') {
    openTravelOverlay();
  } else if(name==='close-modal') {
    closeAllMenuOverlays();render();
  }
  return {lowerLeft:homeV11Presentation().lowerUntil-Date.now(),reaction:el.castResponse.dataset.reaction||null,
    modal:isAnyMenuOverlayOpen(),speech:!el.speechBubble.classList.contains('hidden'),hard:homeDioramaBlocked(true),
    ordinary:homeDioramaBlocked()};
};
