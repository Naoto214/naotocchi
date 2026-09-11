const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./helpers/runtime-harness.cjs');

test('comment text reuses matching illustrations and escapes arbitrary text',()=>{
  const h=harness();
  const html=h.api.commentTextHTML('<img src=x onerror="bad()">💕 💰5000 🌸 🫧');
  assert.match(html,/&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/);
  assert.doesNotMatch(html,/<img src=x/);
  for(const [type,key] of [['care','love'],['care','coin'],['ui','cherry_blossom'],['ui','bubbles']]) {
    assert.match(html,new RegExp(`data-${type}-icon="${key}"`));
  }
  assert.match(html,/aria-label="コイン"/);
  assert.match(html,/>5000 /);
});

test('whole emoji sequences stay intact and unrelated food keeps its meaning',()=>{
  const h=harness();
  for(const text of ['🍙おにぎり','🥚たまごやき','❤️‍🔥','👩🏽‍🚀','1️⃣','© 2026']) {
    assert.equal(h.api.commentTextHTML(text),text);
  }
  assert.match(h.api.commentTextHTML('☀ ☀️'),/data-ui-icon="sun"/);
  assert.equal((h.api.commentTextHTML('☀ ☀️').match(/data-ui-icon="sun"/g)||[]).length,2);
});

test('speech shows the current actor illustration and leaves conversation and saves unchanged',()=>{
  const h=harness();h.api.render();
  h.api.state().lifeLog=[{age:5,icon:'💕',text:'💕いっしょにいた'}];
  const before=JSON.stringify(h.api.state());
  h.api.setSpeechBubble('💕いっしょにいよう',{kind:'pet',emoji:'🐕',label:'いぬ'});
  assert.match(h.get('speechSpeaker').innerHTML,/assets\/characters\/dog\/\d+\.png/);
  assert.equal(h.get('speechSpeaker').dataset.label,'いぬ','the mobile bubble has a visible speaker name');
  assert.match(h.get('speechText').innerHTML,/data-care-icon="love"/);
  assert.match(h.get('speechText').innerHTML,/いっしょにいよう/);
  assert.equal(JSON.stringify(h.api.state()),before);
  assert.equal(h.get('speechText').scrollTop,0);
  h.advance(2500);assert.ok(h.get('speechBubble').classList.contains('hidden'));
});

test('notices retain their scroll position until the actual message changes',()=>{
  const h=harness();h.get('lifeCardOverlay').classList.add('hidden');
  h.api.setMessage('🎁ごほうび。💰5000');
  const node=h.get('message');assert.match(node.innerHTML,/data-care-icon="gift"/);
  node.scrollTop=20;h.api.render();assert.equal(node.scrollTop,20);
  h.api.setMessage('🌸はるになった');assert.equal(node.scrollTop,0);
  h.api.state().health=0;h.api.render();
  assert.equal(node.dataset.careSeverity,'critical');
  assert.match(node.textContent,/けんこう/);
});

test('event text, captions and birthday notices use the same inline presentation',()=>{
  const h=harness();
  h.api.showStoryEvent({emoji:'🎁',message:'💰+8。🌸をみつけた'});
  assert.match(h.get('storyFlashEmoji').innerHTML,/data-care-icon="gift"/);
  assert.match(h.get('storyFlashText').innerHTML,/data-care-icon="coin"/);
  h.api.setBirthdayToast('🎁10さいのおいわい');
  assert.match(h.get('birthdayToast').innerHTML,/data-care-icon="gift"/);
  const source=fs.readFileSync('script.js','utf8');
  assert.doesNotMatch(source,/el\.(speechText|dateMovieCaption|storyFlashText|birthdayToast)\.textContent\s*=/);
  assert.equal((source.match(/setCommentText\(el\.dateMovieCaption,/g)||[]).length,6);
});

test('birthday and milestone symbols depict their own objects without unrelated atlas substitutes',()=>{
  const h=harness();
  for(const [emoji,key] of [['🎂','cake'],['🎊','celebration'],['✨','sparkles'],['💐','bouquet'],
    ['🗝️','key'],['🧭','compass'],['🌈','rainbow'],['⚡','bolt'],['🔥','fire'],['🙂','smile'],['💑','couple'],['♾️','infinity']]) {
    const html=h.api.commentTextHTML(emoji);
    assert.match(html,new RegExp(`data-comment-symbol="${key}"`));
    assert.match(html,/<svg\b[^>]*viewBox="0 0 24 24"/);
    assert.doesNotMatch(html,/data-care-icon="food"|assets\/characters\/egg/);
  }
  h.api.setBirthdayToast('🎂10さいになった');
  assert.match(h.get('birthdayToast').innerHTML,/data-comment-symbol="cake"/);
});

test('all 26 companions and 18 partners keep their own speech portraits',()=>{
  const master=new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const h=harness(),companions=[...master.companions.normal,...master.companions.rare];
  h.api.state().companions=companions.map(c=>({id:c.id,bond:95}));
  for(const c of companions){
    h.api.setSpeechBubble('またあそぼう💕',{kind:'companion',id:c.id,emoji:'?',label:c.label});
    assert.ok(h.get('speechSpeaker').innerHTML.includes(`src="${c.asset}"`),c.id);
  }
  for(const p of master.partners){
    h.api.state().partner={id:p.id,emoji:'💕',label:p.label};
    h.api.setSpeechBubble('いっしょにいよう💕',{kind:'partner',...h.api.state().partner});
    assert.ok(h.get('speechSpeaker').innerHTML.includes(`src="${p.asset}"`),p.id);
  }
  h.api.showStoryEvent({character:{id:'anglerfish',emoji:'🐟',label:'チョウチンアンコウ'},emoji:'🐟',message:'🐟「こっちだよ」'});
  assert.match(h.get('storyFlashText').innerHTML,/assets\/characters\/partners\/anglerfish\.png/);
  assert.doesNotMatch(h.get('storyFlashText').innerHTML,/salmon/);
});

test('comment image failure stays local and works for newly inserted pictures',()=>{
  const h=harness();h.api.render();const before=JSON.stringify(h.api.state());
  const failed=h.get('failedComment'),other=h.get('otherComment');
  const img=h.document.createElement('img');img.tagName='IMG';img.classList.add('comment-asset');
  img.closest=selector=>selector==='.comment-picture'?failed:null;
  Object.defineProperty(h.get('petArea'),'clientWidth',{get(){throw Error('comment failure must not reposition the cast');}});
  h.dispatch(img,'error',{bubbles:false});
  assert.ok(failed.classList.contains('asset-failed'));
  assert.equal(other.classList.contains('asset-failed'),false);
  assert.equal(JSON.stringify(h.api.state()),before);
});

test('pet reaction notices keep their words and identify the actual pet with its PNG',()=>{
  const h=harness({reducedMotion:true});
  for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  const before=JSON.stringify(h.api.state());
  h.api.showStoryEvent({petReaction:true,emoji:'😲',message:'おおきくなった！'});
  assert.match(h.get('storyFlashEmoji').innerHTML,/assets\/characters\/dog\/\d+\.png/);
  assert.equal(h.get('storyFlashText').textContent,'おおきくなった！');
  assert.equal(JSON.stringify(h.api.state()),before);
});
