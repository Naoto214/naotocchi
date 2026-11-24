const fs = require('node:fs');
const path = require('node:path');

function replaceOnce(source, old, updated) {
  if (source.split(old).length !== 2) throw new Error('Unexpected #570 code at ' + old.slice(0, 78));
  return source.replace(old, () => updated);
}

function removeOverview(controller) {
  const patches = [
    [',view=args.overview?.84:1', ''], ['size*relative*view*density', 'size*relative*density'],
    ['*(.94+.06*sizeSlot.depth)*view;', '*(.94+.06*sizeSlot.depth);'],
    ['onViewChange=()=>{},', ''],
    ["    let overview=false;\n    const view=doc.createElement('button'),selectedLabel=doc.createElement('span');\n    view.className='diorama-view';view.type='button';view.textContent='みんなを見る';view.hidden=true;", "    const selectedLabel=doc.createElement('span');"],
    ['stage.appendChild(view);stage.appendChild(selectedLabel);', 'stage.appendChild(selectedLabel);'],
    ["    view.addEventListener('click',()=>{overview=!overview;view.textContent=overview?'いつもの表示':'みんなを見る';view.setAttribute('aria-pressed',String(overview));onViewChange(overview);});\n", ''],
    ['rows=next;view.hidden=!enabled||rows.size<=5;', 'rows=next;'],
    ['enabled=false;view.hidden=true;selectedLabel.hidden=true;', 'enabled=false;selectedLabel.hidden=true;'],
    ['overview:()=>overview,', ''], ['view.remove();selectedLabel.remove();', 'selectedLabel.remove();'],
  ];
  for (const [anchor, value] of patches) controller = replaceOnce(controller, anchor, value);
  return controller;
}

function adaptFinalGame({read, write}) {
  const controller = removeOverview(read('home-production-diorama.js'));
  write('home-production-diorama-v2.js', replaceOnce(controller,
    "import('./home-production-world.mjs?", "import('./home-production-world-v2.mjs?"));
  let script = replaceOnce(read('script.js'), 'overview:homeDiorama?.overview()||false,', '');
  script = replaceOnce(script, "      onViewChange:()=>{homeCastLayoutKey='';renderHomeCast();},\n", '');
  write('script-v2.js', script);
  const world = replaceOnce(read('home-production-world.mjs'), "   revision++;lastPaint='';",
    "   nav=win.HomeOpeningSeats.withOpeningSeats(nav,spec,win.innerWidth,win.innerHeight);\n   revision++;lastPaint='';");
  write('home-production-world-v2.mjs', world);
  write('seating.js', fs.readFileSync(path.join(__dirname, 'seating.js'), 'utf8'));
  return {replacements: {'home-production-diorama.js': 'home-production-diorama-v2.js', 'script.js': 'script-v2.js'}, extraScripts: ['seating.js']};
}

module.exports = {adaptFinalGame, removeOverview};
