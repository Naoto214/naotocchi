// Inserted into each game's closure by the test runner in its disposable page.
window.regionGame={
  state:()=>[state.regionId,state.stageIndex,state.lifetime.equippedItemId,state.lifetime.timeMode,state.companions.length,!!state.partner],
  transitions() {
    const first=this.state();
    clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;
    if(careAfterglowTimer)clearTimeout(careAfterglowTimer);careAfterglowTimer=null;
    castMotion.clear();el.storyFlash.classList.add('hidden');el.lifeCardOverlay.classList.add('hidden');render();
    const conversation=conv2Ask(CONVERSATION_BANTER.QUESTIONS[0]);
    const companion=state.companions.pop();
    if(!companion)state.companions.push({id:NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.companions.normal[0].id,bond:85});
    const ages=stageMinsForLine(state.speciesLine);
    const age=ages.find(a=>a>currentAge())||ages[1];
    state.ageTicks=age*AGE_TICKS_PER_YEAR;onAgeChanged(age-1);
    const evolved=state.stageIndex===stageForAge(age,state.speciesLine); state.lifetime.equippedItemId='ribbon'; state.lifetime.ownedShopItems=['ribbon'];
    state.lifetime.timeMode='night';window.HomeCastTrial?.apply({time:'night'});homeCastLayoutKey='';render();homeDiorama.sync();
    const changed={state:this.state(),rendered:regional.summary()};
    if(companion)state.companions.push(companion);else state.companions.pop();
    homeCastLayoutKey='';render();homeDiorama.sync();saveState();
    return {first,changed,conversation,evolved,save:JSON.parse(localStorage.getItem(SAVE_KEY)),restored:this.state()};
  }
};
