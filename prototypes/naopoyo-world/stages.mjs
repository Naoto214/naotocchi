const a = (id, x, y, level = 1, species = "dog") => ({
  id,
  x,
  y,
  level,
  species,
});
const base = (id, title, lesson, actors, extra = {}) => ({
  id,
  title,
  lesson,
  w: 8,
  h: 8,
  theme: "grove",
  walls: [],
  spikes: [],
  gates: [],
  exits: [{ x: 7, y: 4, exact: 1 }],
  gravity: false,
  water: [],
  guests: [],
  events: [],
  actors,
  ...extra,
});
const barrier = (x, gap) =>
  Array.from({ length: 8 }, (_, y) => [x, y]).filter((p) => p[1] !== gap);
const wave = {
  id: "tide",
  kind: "wave",
  period: 8000,
  warn: 2000,
  on: 800,
  rows: [3, 4, 5],
  dx: 1,
  dy: 0,
};
const beam = {
  id: "light",
  kind: "beam",
  period: 9000,
  warn: 2500,
  on: 2200,
  cells: Array.from({ length: 8 }, (_, y) => [3, y]),
  power: 2,
};
export const stages = [
  base(
    "A",
    "ひかりの牢屋",
    "集まって門を開けたら、トゲでほどこう。小さな星は1だけ。",
    [a("a", 0, 4, 2), a("b", 1, 4, 1)],
    {
      gates: [{ x: 2, y: 4, exact: 3 }],
      walls: barrier(2, 4),
      spikes: [{ x: 4, y: 4, power: 2 }],
      hint: "2＋1で3の門へ。右側の2連トゲで1を3体に。",
      story: "散らばった星の道を、いっしょにほどこう。",
      ending: "小さくわかれた光が、森への道を照らした。",
    },
  ),
  base(
    "B",
    "あわの海 — 波の門",
    "魚1＋2で3に。色の帯へ運び、右向きの波で『波3』の門を通ろう。",
    [a("a", 1, 5, 1, "fish"), a("b", 2, 5, 2, "fish")],
    {
      revision: 2,
      theme: "shore",
      water: Array.from({ length: 32 }, (_, i) => [
        i % 8,
        3 + Math.floor(i / 8),
      ]),
      walls: barrier(4, 4),
      gates: [{ x: 4, y: 4, exact: 3, waveOnly: true }],
      spikes: [{ x: 5, y: 4, power: 2 }],
      events: [{ ...wave, warn: 3000, on: 600, rows: [4] }],
      exits: [{ x: 7, y: 4, exact: 1, species: "fish" }],
      hint: "1と2を合体し、波3の門のすぐ左へ。3秒の予告後、波が門へ1マス押します。門の先の2連トゲで1ずつに分かれ、星へ。波の帯は門と同じ横一列です。",
      story:
        "ものしりふくろうの豆知識：この門は、3になって波に乗ると通れるよ。つかんだ指は、そのままで大丈夫。",
      ending: "集まって波に乗り、ほどけて帰る。海の道がつながった。",
    },
  ),
  base(
    "C",
    "光のほどきかた",
    "光をあえて浴びて、3を1・1・1に。光の予告は金色。",
    [a("a", 2, 4, 3)],
    {
      theme: "cave",
      events: [beam],
      hint: "3列目の光に入って、予告後の照射を待つ。生まれた1をそれぞれ星へ。",
      story: "閉じた扉の鍵は、光の中にあった。",
      ending: "こわかった光が、帰り道をつくってくれた。",
    },
  ),
  base(
    "D",
    "ほどいてから、通る",
    "3の門と1の門。同じ姿では通り抜けられない。",
    [a("a", 0, 4, 2), a("b", 1, 4, 1)],
    {
      theme: "snow",
      walls: [...barrier(2, 4), ...barrier(5, 4)],
      gates: [
        { x: 2, y: 4, exact: 3 },
        { x: 5, y: 4, exact: 1 },
      ],
      spikes: [{ x: 4, y: 4, power: 2 }],
      hint: "左では集まり、真ん中でわかれる。先に3の門を通ってから2連トゲへ。",
      story: "一緒に進む道と、ひとりずつ進む道。",
      ending: "姿を変えても、みんな一緒に帰れる。",
    },
  ),
  base(
    "E",
    "タコさんの波の試練",
    "タコさんが合図したら、波と光を借りて1に分かれよう。",
    [a("a", 1, 4, 3, "fish")],
    {
      theme: "shore",
      water: Array.from({ length: 32 }, (_, i) => [
        i % 8,
        3 + Math.floor(i / 8),
      ]),
      events: [
        { ...wave, host: "rock_octopus" },
        { ...beam, id: "boss-light", warn: 2000, host: "rock_octopus" },
      ],
      narrator: {
        id: "owl",
        name: "ものしりふくろう",
        category: "companion",
        asset: "assets/characters/companions/owl.png",
      },
      guests: [
        {
          id: "rock_octopus",
          name: "いわばのタコさん",
          role: "puzzle-host",
          category: "partner",
          x: 5,
          y: 1,
          operable: false,
          asset: "assets/characters/partners/rock_octopus.png",
        },
      ],
      hint: "波で光の列まで進み、照射で3つの1に。タコさんにHPはなく、全員脱出で成功。",
      story:
        "ものしりふくろう：タコさんが波と光の合図を出すよ。魚3を光でほどいて、みんなを星へ。タコさんは敵ではなく、試練を手伝う役だよ。",
      ending: "「上手にほどけたね」タコさんが次の海を教えてくれた。",
    },
  ),
];
