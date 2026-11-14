import{growthRows}from'../v5/characters.mjs';
export const formalSpecies=['dog','frog','fish','penguin'];
export const speciesRegistry=[...new Set(growthRows.map(r=>r.species))].map(source=>{const rows=growthRows.filter(r=>r.species===source),id=source==='clownfish'?'fish':source;return{id,source,label:rows[0].label,formal:formalSpecies.includes(id),stages:rows.map(r=>({level:r.stage,name:r.name,path:`assets/characters/${source}/${String(r.stage).padStart(2,'0')}.png`}))}});
export const speciesIds=speciesRegistry.map(r=>r.id);
export const speciesLabel=id=>speciesRegistry.find(s=>s.id===id)?.label||id;
export const rulesetId=d=>[...d.board.actors.map(a=>a.species),...d.board.exits.map(t=>t.species),...d.board.gates.map(t=>t.species),...d.board.tiles.flatMap(t=>[t.params.species,t.params.partner])].filter(Boolean).some(s=>!formalSpecies.includes(s))?'v6-ground-31-trial':'formal-four-v1';
export const rulesetLabel=d=>rulesetId(d)==='formal-four-v1'?'正式4種のルール':'V6拡張試作ルール（追加系統は共通地上移動・能力追加なし）';
