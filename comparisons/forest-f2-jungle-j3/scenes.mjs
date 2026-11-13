// Candidate-only geometry, traced against these originals (1024 × 1536).
// Coordinates are normalized original-art foot points. Rules come unchanged
// from the pinned runtime; this module does not mutate its adopted manifest.
export const CANDIDATE_SCENES={
 'forest-f2':{
  candidate:'forest-f2',region:'forest',
  ground:[[.28,.565],[.70,.565],[.83,.59],[.90,.66],[.91,.79],[.84,.91],[.71,.945],[.41,.94],[.30,.88],[.17,.82],[.12,.71],[.15,.63]],
  exclude:[],
  foreground:[[[0,.79],[.12,.80],[.23,.86],[.29,.94],[.48,1],[0,1]],[[1,.80],[.92,.82],[.88,.94],[.89,1],[1,1]]],
  seats:[[.50,.75],[.38,.61],[.65,.64],[.29,.75],[.76,.78],[.56,.88]],
  forbidden:[[.05,.65],[.50,.50],[.12,.91],[.95,.86],[.16,.54]],
  points:[[.42,.62,'observe','sunlit-leaves'],[.66,.81,'rest','soft-grass']],
  depth:[.565,.945,.78,1],accent:'pollen'
 },
 'jungle-j3':{
  candidate:'jungle-j3',region:'jungle',
  ground:[[.26,.600],[.68,.600],[.81,.625],[.88,.665],[.92,.72],[.87,.81],[.82,.89],[.72,.935],[.42,.93],[.34,.865],[.23,.81],[.16,.735],[.16,.665]],
  exclude:[],
  foreground:[[[0,.75],[.13,.77],[.20,.82],[.27,.88],[.35,1],[0,1]],[[1,.70],[.94,.72],[.90,.79],[.91,.88],[1,.93]],[[.84,.95],[1,.89],[1,1],[.74,1]]],
  seats:[[.50,.75],[.36,.64],[.64,.65],[.28,.75],[.76,.78],[.58,.87]],
  forbidden:[[.5,.52],[.8,.54],[.28,.55],[.08,.73],[.20,.90],[.95,.82]],
  points:[[.58,.63,'observe','quiet-wetland'],[.64,.81,'rest','fern-shade']],
  depth:[.60,.935,.78,1],accent:'pollen'
 }
};
export const CANDIDATES=[
 {id:'forest-f2',region:'forest',name:'森F2 · 木漏れ日の広場',src:'comparison-art/forest-f2.webp',adoption:'comparison-only'},
 {id:'jungle-j3',region:'jungle',name:'ジャングルJ3 · 生命の水辺',src:'comparison-art/jungle-j3.webp',adoption:'comparison-only'}
];

CANDIDATE_SCENES['forest-f3']={
 candidate:'forest-f3',region:'forest',
 ground:[[.28,.565],[.70,.565],[.83,.59],[.90,.66],[.91,.79],[.84,.91],[.71,.93],[.41,.93],[.30,.88],[.17,.82],[.12,.71],[.15,.63]],
 exclude:[],
 foreground:[[[0,.79],[.12,.80],[.23,.86],[.29,.94],[.48,1],[0,1]],[[1,.80],[.92,.82],[.88,.94],[.89,1],[1,1]]],
 seats:[[.50,.75],[.38,.61],[.65,.64],[.29,.75],[.76,.78],[.56,.88]],
 forbidden:[[.05,.65],[.50,.50],[.12,.91],[.95,.86],[.16,.54]],
 points:[[.42,.62,'observe','fresh-green-canopy'],[.66,.81,'rest','morning-grass']],
 depth:[.565,.93,.78,1],accent:'pollen'
};
CANDIDATE_SCENES['jungle-j4']={
 candidate:'jungle-j4',region:'jungle',
 ground:[[.28,.615],[.68,.615],[.80,.635],[.87,.675],[.91,.73],[.86,.81],[.81,.89],[.71,.925],[.42,.925],[.34,.865],[.23,.81],[.17,.735],[.18,.675]],
 exclude:[],
 foreground:[[[0,.75],[.13,.77],[.20,.82],[.27,.88],[.35,1],[0,1]],[[1,.70],[.94,.72],[.90,.79],[.91,.88],[1,.93]],[[.84,.95],[1,.89],[1,1],[.74,1]]],
 seats:[[.50,.75],[.36,.65],[.64,.66],[.29,.75],[.75,.78],[.58,.87]],
 forbidden:[[.5,.52],[.8,.54],[.28,.55],[.08,.73],[.20,.90],[.95,.82],[.5,.59]],
 points:[[.58,.65,'observe','mist-over-jade-water'],[.64,.81,'rest','ancient-fern-shade']],
 depth:[.615,.925,.78,1],accent:'pollen'
};
CANDIDATES.push(
 {id:'forest-f3',region:'forest',name:'森F3 · 輝く新緑の広場',src:'comparison-art/forest-f3.webp',adoption:'comparison-only'},
 {id:'jungle-j4',region:'jungle',name:'ジャングルJ4 · 深緑の神秘的な湿地',src:'comparison-art/jungle-j4.webp',adoption:'comparison-only'}
);
