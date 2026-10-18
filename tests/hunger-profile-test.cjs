const assert = require('node:assert/strict');
const {test} = require('node:test');
const expression = require('../pet-expression.js');

const expected = {
  man: ['milk','rice','rice','rice','rice','rice','rice','rice'],
  woman: ['milk','rice','rice','rice','rice','rice','rice','rice'],
  dog: ['milk','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl'],
  cat: ['milk','fish','fish','fish','fish','fish','fish','fish'],
  penguin: ['fish','fish','fish','fish','fish','fish','fish','fish'],
  turtle: ['food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl'],
  frog: ['algae_aquatic_plant','algae_aquatic_plant','algae_aquatic_plant','neutral_nutrition','insect','insect','insect','insect'],
  salmon: ['neutral_nutrition','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','neutral_nutrition','neutral_nutrition'],
  clownfish: ['aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey'],
  butterfly: ['leaf','leaf','leaf','leaf','neutral_nutrition','neutral_nutrition','nectar','nectar'],
  beetle: ['humus','humus','humus','neutral_nutrition','neutral_nutrition','tree_sap','tree_sap','tree_sap'],
  stagbeetle: ['decaying_wood_humus','decaying_wood_humus','decaying_wood_humus','neutral_nutrition','neutral_nutrition','tree_sap','tree_sap','tree_sap'],
  cicada: ['plant_sap','plant_sap','plant_sap','plant_sap','neutral_nutrition','plant_sap','plant_sap','plant_sap'],
  antlion: ['insect','insect','insect','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  hermit_crab: ['omnivore_food','omnivore_food','omnivore_food','omnivore_food','omnivore_food','omnivore_food','omnivore_food','omnivore_food'],
  jellyfish: ['aquatic_small_prey','neutral_nutrition','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey'],
  starfish: ['aquatic_small_prey','aquatic_small_prey','neutral_nutrition','benthic_small_prey','benthic_small_prey','benthic_small_prey','benthic_small_prey','benthic_small_prey'],
  coral: ['neutral_nutrition','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey','aquatic_small_prey'],
  dandelion: ['neutral_nutrition','water','water','water','water','water','neutral_nutrition','neutral_nutrition'],
  sakura: ['neutral_nutrition','water','water','water','water','water','water','water'],
  venus_flytrap: ['neutral_nutrition','water','water','fly','fly','fly','fly','fly'],
  mushroom: ['neutral_nutrition','organic_nutrients','organic_nutrients','organic_nutrients','organic_nutrients','organic_nutrients','organic_nutrients','organic_nutrients'],
  dragon: ['food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl','food_bowl'],
  phoenix: ['neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  god: ['neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  world_tree: ['neutral_nutrition','water','water','water','water','water','water','water'],
  ghost: ['neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  star: ['neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  plush: ['neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  unknown: ['neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition','neutral_nutrition'],
  ren: ['milk','rice','rice','rice','rice','rice','rice','rice'],
};

test('approved hunger profile covers exactly 31 playable growth lines and all 248 stages', () => {
  assert.equal(Object.keys(expected).length,31);
  let count=0;
  for (const [species,want] of Object.entries(expected)) {
    assert.equal(want.length,8,species);
    for (let stage=1;stage<=8;stage++) {
      const base=`assets/characters/${species}/${String(stage).padStart(2,'0')}.png`;
      assert.equal(expression.hungerCategoryFor(base),want[stage-1],base);
      count++;
    }
  }
  assert.equal(count,248);
});

test('hunger category resolver does not silently fallback for unsupported or malformed assets', () => {
  for (const value of [
    'assets/characters/author/naoto.png',
    'assets/characters/cat/09.png',
    'assets/characters/not-a-species/01.png',
    '',
    null,
    undefined,
  ]) assert.equal(expression.hungerCategoryFor(value),null);
});

const iconForCategory = {
  rice:'rice', food_bowl:'bowl', omnivore_food:'bowl', fish:'fish',
  insect:'insect', fly:'insect', aquatic_small_prey:'aquatic', milk:'milk',
  neutral_nutrition:'neutral', water:'water', algae_aquatic_plant:'algae',
  leaf:'leaf', nectar:'nectar', humus:'organic', organic_nutrients:'organic',
  decaying_wood_humus:'wood', tree_sap:'sap', plant_sap:'sap', benthic_small_prey:'benthic',
};

test('all 248 hungry displays use the approved food artwork, including life-stage overrides', () => {
  const fs = require('node:fs'), path = require('node:path');
  const used = new Set();
  for (const [species,categories] of Object.entries(expected)) {
    categories.forEach((category,index) => {
      const base=`assets/characters/${species}/${String(index+1).padStart(2,'0')}.png`;
      const markup=expression.accentFor(base,'hungry');
      const images=[...markup.matchAll(/<image\b[^>]*href="([^"]+)"/g)];
      const icon=`assets/marks/hunger/${iconForCategory[category]}.svg`;
      assert.deepEqual(images.map(m=>m[1]),[icon],base);
      assert.ok(fs.existsSync(path.join(__dirname,'..',icon)),icon);
      assert.equal((markup.match(/class="accent-thought"/g)||[]).length,2,base);
      used.add(icon);
    });
  }
  assert.equal(used.size,15);
});

test('mushroom07 hunger bubble separates from spores without moving other state marks', () => {
  const base='assets/characters/mushroom/07.png';
  assert.match(expression.accentFor(base,'hungry'),/translate\(-23 -9\)/);
  assert.match(expression.accentFor(base,'happy'),/translate\(16.5 -10\)/);
  assert.match(expression.accentFor(base,'strained'),/translate\(-15.5 15\)/);
  assert.equal(expression.accentFor('assets/characters/author/naoto.png','hungry'),'');
  assert.equal(expression.accentFor('assets/characters/cat/09.png','hungry'),'');
});
