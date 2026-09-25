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
