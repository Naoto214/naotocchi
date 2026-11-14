import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserializeBoard, serializeBoard } from './engine.mjs';
import { findWitness, replay, solve } from './solver.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const reports = resolve(here, '../../docs/naopoyo-100-v1');
const specs = [];
const D = (level, species = 'dog') => ({ actor: { level, species } });
const E = (exact, species, range = {}) => ({ exit: { exact, species, ...range } });
const G = (exact, species, range = {}) => ({ gate: { exact, species, ...range } });
const S = power => ({ spike: { power } });
const T = (catalogId, params = {}) => ({ tile: { catalogId, params } });
const W = () => T('terrain.water');
const I = () => T('terrain.ice');
const C = (id = 'C', min = 1, weight = 2) => T('object.crate', { id, min, weight });
const Door = (id, ...needs) => T('fixture.door', { id, needs });
const Hold = (id, conditions = {}) => T('fixture.plate.hold', { id, ...conditions });
const Weight = (id, conditions) => T('fixture.plate.weight', { id, ...conditions });
const Latch = (id, conditions = {}) => T('fixture.latch', { id, ...conditions });
const Toggle = (id, conditions = {}) => T('fixture.toggle', { id, ...conditions });
const Seq = (id, groupId, step, conditions = {}) => T('fixture.sequence', { id, groupId, step, ...conditions });
const One = orientation => T('fixture.oneway', { orientation });
const Warp = (pairId, conditions = {}) => T('fixture.warp', { pairId, ...conditions });
const Wind = (orientation, conditions = {}) => T('field.wind', { orientation, ...conditions });
const Up = conditions => T('field.updraft', conditions);
const Current = orientation => [W(), T('field.current', { orientation })];
const Bubble = conditions => [W(), T('field.bubble', conditions)];
const Phase = (period, phase) => T('fixture.phase', { period, phase });
const Crumble = (id = 'C') => T('fixture.crumble', { id });

function stage(mainGimmick, title, layout, pieces, idea, difference, hint, options = {}) {
  const number = specs.length + 1;
  const rows = layout.split('/');
  if (rows.length > 8 || rows.some(row => row.length > 8)) throw new Error(`Board exceeds 8×8: ${title}`);
  const ox = Math.floor((8 - Math.max(...rows.map(row => row.length))) / 2);
  const oy = Math.floor((8 - rows.length) / 2);
  const id = String(number).padStart(2, '0');
  const board = {
    id: `naopoyo-100-${id}`, title, w: 8, h: 8,
    gravity: Boolean(options.gravity), walls: [], actors: [], exits: [], gates: [], spikes: [], tiles: []
  };
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const mark = rows[y - oy]?.[x - ox] || '#';
      if (mark === '#') board.walls.push([x, y]);
      if (mark === '.' || mark === '#') continue;
      if (!Object.hasOwn(pieces, mark)) throw new Error(`Unknown stage marker ${mark} in ${id}`);
      const position = { x, y };
      for (const { actor, exit, gate, spike, tile } of [pieces[mark]].flat(Infinity)) {
        if (actor) board.actors.push({ ...position, ...actor, id: `actor-${board.actors.length + 1}` });
        if (exit) board.exits.push({ ...position, ...exit });
        if (gate) board.gates.push({ ...position, ...gate });
        if (spike) board.spikes.push({ ...position, ...spike });
        if (tile) board.tiles.push({ ...position, ...tile });
      }
    }
  }
  if (!board.actors.length || !board.exits.length) throw new Error(`Missing actors or exits: ${title}`);
  if (options.gravity) board.tiles.push({ catalogId: 'sign.gravity', x: 0, y: 0, params: {} });
  if (options.scenery) {
    for (const [catalogId, x, y] of options.scenery) board.tiles.push({ catalogId, x, y, params: {} });
  }
  const materials = [...new Set(serializeBoard(board).instances.map(t => t.catalogId))];
  const supportGimmicks = materials.filter(key => !['terrain.floor', 'terrain.wall', mainGimmick].includes(key) && !key.startsWith('scenery.'));
  if (!materials.includes(mainGimmick)) throw new Error(`Main mechanic absent: ${title} (${mainGimmick})`);
  const speciesNames = { dog: 'いぬ', frog: 'かえる', fish: 'さかな', penguin: 'ペンギン' };
  const conditions = [...new Set(board.exits.map(e => [
    speciesNames[e.species],
    e.exact === undefined ? undefined : `＝${e.exact}`,
    e.min === undefined ? undefined : `${e.min}以上`,
    e.max === undefined ? undefined : `${e.max}以下`
  ].filter(Boolean).join('')).filter(Boolean))];
  specs.push({
    id, number, difficulty: number, title,
    text: options.text || difference,
    goal: options.goal || (conditions.length ? `全員を星の出口へ。出口の条件は ${conditions.join('・')}。` : '全員を星の出口へ送ろう。'),
    hint, idea, difference, learning: options.learning || (number <= 12 ? '応用' : supportGimmicks.length > 2 ? '複合' : '応用'),
    mainGimmick, supportGimmicks, materials, board,
    ...(options.probe ? { probe: options.probe } : {}),
    ...(options.authored ? { authored: options.authored } : {})
  });
}

const spike = 'fixture.spike', gate = 'fixture.gate', exit = 'fixture.exit', gravity = 'sign.gravity';
const hold = 'fixture.plate.hold', weight = 'fixture.plate.weight', latch = 'fixture.latch';
const sequence = 'fixture.sequence', toggle = 'fixture.toggle', crate = 'object.crate', one = 'fixture.oneway';
const water = 'terrain.water', current = 'field.current', bubble = 'field.bubble', ice = 'terrain.ice';
const wind = 'field.wind', updraft = 'field.updraft', warp = 'fixture.warp', phase = 'fixture.phase', crumble = 'fixture.crumble';

stage(exit, 'ひとすじの星', 'a.e', { a: D(1), e: E(1) },
  '右へ二歩進んで最初の星に触れる。', '一人とひとつの星を結ぶ短い一本道。', 'いぬを選んで右へ二歩。', { learning: '導入', text: 'いぬを選ぶと、隣のマスへ一歩進める。' });
stage(exit, '二つの名札', 'a..e/..../f..j', { a: D(1), f: D(1,'frog'), e: E(1,'frog'), j: E(1,'dog') },
  '近さではなく種族で出口を選ぶ。', '出口の場所と担当の種族が交差する。', 'いぬは右下、かえるは右上。先に好きな方を送れる。', { learning: '導入' });
stage(gate, 'ちいさな門番', 'a..g.e/...#../...#../...h..', { a: D(2), g: G(3), h: G(2), e: E(2) },
  '二つの門のうち、自分の段階が合う方を選ぶ。', '近い上の門より、条件の合う下の門を使う。', 'いぬは2。上の門の3には足りないので下へ回ろう。', { learning: '導入', probe:'event' });
stage(exit, '背中合わせの足音', 'a.fej', { a: D(1), f: D(1,'frog'), e: E(1,'dog'), j: E(1,'frog') },
  '異種族の接触を一時的な場所交換にする。', '一列の通路で追い越しを試す。', 'いぬをかえるに重ねる向きへ動かすと場所が入れ替わる。', { learning: '導入' });
stage(spike, '二つにして通る', 'a.sge/#.###', { a: D(2), s: S(1), g: G(1), e: E(1) },
  '門を通るために全体を分ける。', '出口より先に、通路の条件を満たす。', '針の右にいる1から門へ。後ろに生まれた1は間を空けて続こう。', { learning: '導入' });
stage(gate, '反対側の大きさ', 'a..g.e/#b.#.#', { a: D(1), b: D(2), g: G(3), e: E(3) },
  '数の足りない二体を門の手前で一つにする。', '小さい二体で門の前へ。合体する場所を選ぶ。', '下の2と上の1を合わせて3にすると、門の数字に揃う。');
stage(spike, 'わけ前は一つだけ', 'a.s.e/##..j', { a: D(4), s: S(1), e: E(3), j: E(1) },
  '分裂の残り3と生まれた1を違う出口に渡す。', '針を一回使って異なる二つの段階を作る。', '右にいる本体3を先に上の星へ。後ろの1は下の星へ。');
stage(gate, '門の向こうで会おう', 'a.g...e/.#g.###/b.#..##', { a: D(1), b: D(1), g: G(1), e: E(2) },
  '合体できる二体を門より後で合わせる。', '同じ数字の門が二段。近道でも早い合体は禁物。', '先に一体で向こうへ進み、もう一体を待ってから合わせよう。');
stage(spike, '針の曲がる小窓', '#..je/a.s../##.##', { a: D(4), s: S(2), e: E(2), j: E(1) },
  '横に伸び切れない二本目の針を上へ逃がす。', '出口を針が避けるため、上の空きマスが受け皿になる。', '針に向かって右へ。左が詰まると針は上へ曲がる。2は一番右の星へ。');
stage(exit, '八と余りの二', 'a.b..e/#.##j#', { a: D(6), b: D(4), e: E(8), j: E(2) },
  '上限8の合体で手前に余剰2を作る。', '針がないので合体の余剰だけが分配手段。', '6と4を重ねると8が前、余り2が手前。右端とくぼみの星へ送り分けよう。');

stage(gravity, '底で光る星', 'a.####/#.####/#....e', { a: D(1), e: E(1) },
  '足場の切れた場所を一方向の落下路にする。', '手前の道と下の星が縦に離れる。', '右の縦穴へ一歩。落ちた先から星へ。', { gravity: true, learning: '導入' });
stage(gravity, '飛び石の段差', '###..e/##..##/#..###/a.####', { a: D(2), e: E(2) },
  '低い支えから一段ずつ斜め上へ乗り継ぐ。', '落下の逆。足場がなければ上へ進めない。', '右端に立って、足元に壁がある斜め上へ。', { gravity: true, learning: '導入' });
stage(gate, '門の屋根道', '###.e#/##..g#/#..###/a.####', { a: D(2), g: G(2), e: E(2) },
  '門の上面を足場として扱う。', '門の条件は一致するが真上からは通り抜けられない。', '下から直接は登れない。横の段から門の屋根へ回り込もう。', { gravity: true });
stage(gravity, '背を貸して、返して', 'a...e#/###.##/##f..j', { a: D(2), f: D(1,'frog'), e: E(2,'dog'), j: E(1,'frog') },
  'かえるで着地点の高さを調整してから犬を救出する。', '支え役は犬を通した後、自分の出口へ移る。', 'かえるを犬が落ちる縦穴の真下に置く。犬は着いた高さから斜め上。', { gravity: true });
stage(spike, '二つの着地点', 'as.../#.##./#.##./#j..e', { a: D(3), s: S(1), e: E(1), j: E(2) },
  '分裂した個体を別々の落下口へ仕分ける。', '左は1、右は2。上の針で分けた時点から復帰不能。', '先に右へ2を送り、左に落ちた1の位置を確かめよう。', { gravity: true });
stage(gravity, '落ちた順にひとつ', 'a..###/##.###/##.###/b....e', { a: D(2), b: D(2), e: E(4) },
  '下段の仲間を落下先へ置いて空中から合体する。', '同じ種族の着地点を受け止め役が作る。', '下の2を縦穴の真下へ。上の2が穴に入ると合体する。', { gravity: true });
stage(crumble, '一歩ぶんの橋', 'a...##/##c###/##...j', { a: D(2), c: Crumble(), j: E(2) },
  '橋の上を離れてから低い戻り道を作る。', '崩れる足場が落下経路の入口になる。', '一度ひびの上に立ち、左か右へ離れる。戻ると下段に落ちる。', { gravity: true, learning: '導入', probe: 'require' });
stage(spike, '天井の針と床の針', 'as..##/###.##/###.##/##.tej', { a: D(4), s: S(1), t: S(1), e: E(1), j: E(2) },
  '高さの違う二つの針で、本体と子の落ち方を調整する。', '上の針と縦穴の針で進入方向が変わる。', '1を二つ取り出して、残った2をいちばん下の星へ。', { gravity: true });
stage(gravity, '足場の受け渡し', 'e..###/##...a/#..###/jf####', { a: D(2), f: D(1,'frog'), e: E(2,'dog'), j: E(1,'frog') },
  '下の仲間を横移動させ、上の仲間の足を運ぶ。', 'かえるは支える場所と自分の出口の高さが違う。', '上の段に行ける位置の真下へ、かえるを先に移そう。', { gravity: true });
stage(gravity, '石屋根と二人の背', '##...e/a..###/##..fj/k.p###', { a: D(2), f: D(1,'frog'), p: D(1,'penguin'), e: E(2,'dog'), j: E(1,'frog'), k: E(1,'penguin') },
  '異種族の足場を二段につくり、上から解体する。', '先に下段を救出すると上段の支えまでなくなる。', 'ペンギンを土台、かえるを中段にする。まず犬を上の星に送ろう。', { gravity: true });

stage(hold, '石戸の向こう', 'apde', { a: D(1), p: Hold('A'), d: Door('D','A'), e: E(1) },
  '板を離れた瞬間と一歩の通過を比較する。', '板と扉が隣なので、扉に入る手だけ板を離れられる。', '踏んだまま隣の扉へ入れる位置に立てるか、道の間隔を見よう。', { learning: '導入', probe: 'require' });
stage(latch, '離れても灯る', 'ap..de', { a: D(1), p: Latch('A'), d: Door('D','A'), e: E(1) },
  '記憶の留め具は空に戻っても開きを保つ。', '保持式との違いを同じ一人の通路で確認する。', '左の留め具を踏んでから、そのまま右端へ。', { learning: '導入', probe: 'require' });
stage(hold, '先に通すのは誰', 'f.p#../..adej', { a: D(2), f: D(1,'frog'), p: Hold('A',{species:'frog'}), d: Door('D','A'), e: E(2,'dog'), j: E(1,'frog') },
  'かえるで扉を保持し、犬を先に通す。', '板を踏める種族と最初に救出する種族が別。', 'かえるを板へ。犬は扉を抜けてから、板を離れたかえるに道を渡そう。', { probe: 'require' });
stage(sequence, '二つの合図', 'a.2.de/#.##.#/#.1..#', { a: D(1), '1': Seq('A','S',1), '2': Seq('B','S',2), d: Door('D','S'), e: E(1) },
  '手前に見える2番を先に押さず、1番へ回る。', '近い順と必要な順が逆になる。', 'まず下の1、次に上の2。順を間違えても踏み直せる。', { learning: '導入', probe: 'require' });
stage(latch, '三の釣り合い', 'a..d.e/.p.###/b..###', { a: D(2), b: D(1), p: Latch('A',{exact:3}), d: Door('D','A'), e: E(3) },
  '二体を合わせてちょうど3を作り、留め具に乗せる。', '重いだけでは足りず、条件値ちょうどで作動する。', '下の1を上の2に合わせ、真ん中の板に3を乗せよう。', { probe: 'require' });
stage(toggle, '二度踏むと戻る', 'a.t.de/##.###', { a: D(1), t: Toggle('A'), d: Door('D','A'), e: E(1) },
  '一度離れて同じ板へ入ると開閉が反転する。', '記憶式の板と似て見えるが二回目は閉じる。', 'レバーを一回だけ踏んだ状態で右の扉へ進もう。', { learning: '導入', probe: 'require' });
stage(weight, '二人ぶんの合図', 'fpfq###/...adej/#####l#', { a: D(2), f: D(1,'frog'), p: Weight('A',{exact:1,species:'frog'}), q: Weight('B',{exact:1,species:'frog'}), l: Latch('L',{species:'dog'}), d: T('fixture.door',{needs:['A','B'],any:['L']}), e: E(2,'dog'), j: E(1,'frog') },
  '二つの板に別々の1を置き、合体を避ける。', '一つ点灯しても扉は開かない。二つを保持する。', 'かえるを一体ずつ板に止める。犬を先に扉へ入れてから、かえるを回収。', { probe: 'require' });
stage(hold, '合図を引き継ぐ', 'f.p###ej/...ad.q.', { a: D(2), f: D(1,'frog'), p: Hold('A',{species:'frog'}), q: Latch('B',{species:'dog'}), d: T('fixture.door',{any:['A','B']}), e: E(2,'dog'), j: E(1,'frog') },
  '一時の保持を記憶式の入力へ渡す。', '保持板を離れる前に、別の仕掛けを点灯すると扉が開き続ける。', 'かえるで上の板を押し、犬は下の留め具を点けてから出口へ。', { probe: 'require' });
stage(sequence, '順序と重量の違い', 'b..2.de/a...###/#.1.###', { a: D(1), b: D(2), '1': Seq('A','S',1,{exact:1}), '2': Seq('B','S',2,{exact:2}), d: Door('D','S'), e: E(3) },
  '1と2を別々に残したまま順番に押し、最後に合体する。', '合体は出口では必要だが、合図の前では失敗になる。', '下に1、上に2。二つ点いた後で初めて3にしよう。', { probe: 'require' });
stage(latch, '分けた後の合鍵', 'a.s..d.e/##..p###/##..j###', { a: D(4), s: S(1), p: Latch('A',{exact:1}), d: Door('D','A'), e: E(3), j: E(1) },
  '針で生んだ1を鍵役にし、3を先に通す。', '針の置き場所、留め具の重さ、出口の配分が一本につながる。', '針の後ろの1を留め具へ。上の扉が開いたら3を進めよう。', { probe: 'require' });

stage(crate, '箱の横顔', 'a.c..#/###..e', { a: D(2), c: C(), e: E(2) },
  '箱を動かして曲がり角までの道を空ける。', '箱を引く操作がなく、向こう側を予約する。', '箱を右へ二度押すと、手前から下の星へ曲がれる。', { learning: '導入', probe: 'event' });
stage(crate, '板に残る重さ', 'acp#../....de', { a: D(2), c: C(), p: Weight('A',{exact:2}), d: Door('D','A'), e: E(2) },
  '箱を板の上に残し、重さを一人で二箇所に配る。', '操作役の犬を板に残すと星まで届かない。', '右へ一押しして箱を板に載せ、下の道から扉へ。', { probe: 'event' });
stage(one, '片方だけの横断', 'a..#.#/#.o..e/#..#.#', { a: D(1), o: One('E'), e: E(1) },
  '矢印の左側へ回って、同じ向きから入る。', '縦の近道では通れない一方通行。', '矢印を右に通るには、同じ行の左隣へ回り込もう。', { learning: '導入', probe: 'event' });
stage(crate, '箱を置くくぼみ', 'a..####/##c..e#/##..###', { a: D(2), c: C(), e: E(2) },
  '押した先をふさがないよう横道の奥へ箱を逃がす。', '進行方向に押し続けると最後の道が閉じる。', '左上から箱の真上へ回り、下のくぼみへ押そう。', { probe: 'event' });
stage(crate, '箱は小さな壁', '##..###/a.c.s.e/###..##/###..j#', { a: D(3), c: C(), s: S(1), e: E(2), j: E(1) },
  '箱を脇へ逃がしてから針へ入り、出口を分ける。', '箱をただ前に押すと針が邪魔になり、回り込む準備が必要。', '箱を右へ一押し。上を回って下へ押し、通路が空いたら針へ。右の星は2、下は1。', { probe: 'event' });
stage(one, '帰れない合流点', 'a.o..#/#.##.e/b.o..#', { a: D(1), b: D(2), o: One('E'), e: E(3) },
  '二つの一方通行を通った先でだけ合体する。', '戻れない道の先に共通の集合点がある。', '右側の広がりへ1と2を別々に送り、着いてから合わせよう。', { probe: 'event' });
stage(crate, 'ちいさな押し手', 'a.b.c..#/##.##.##/##.##sej', { a: D(2), b: D(1), c: C('C',3), e: E(2), s: S(1), j: E(1) },
  '箱のためだけに一時的に3を作り、仕事後に分ける。', '合体の段階が箱を動かす条件。最後は別の段階で救出。', '3で箱を動かせる。針に入る時点で箱の仕事が終わっているか考えよう。', { probe: 'event' });
stage(crate, '箱二つ、板一つ', 'ac..p#/.b...d/....#e', { a: D(2), c: C('A',2,2), b: C('B',1,1), p: Weight('P',{exact:2}), d: Door('D','P'), e: E(2) },
  '同じ箱でも重さが違うので、軽い箱を板から外す。', '先に動かしやすい箱と使うべき箱が違う。', '重さ2の箱を板へ。重さ1の箱は別の列へ避けておこう。', { probe: 'event' });
stage(one, '右行きと左行き', 'a..o.f/...#../j..q.e', { a: D(2), f: D(1,'frog'), o: One('E'), q: One('W'), j: E(1,'frog'), e: E(2,'dog') },
  '上と下で渡れる向きが反対なので、担当する道を変える。', '往復する同じ通路がなく、種族の出発側が別。', '犬は右向きの板、かえるは左向きの板。先に交差する場所を空けよう。');
stage(crate, '橋番の代わり', 'af.cp##/#...dje/#...###', { a: D(3), f: D(1,'frog'), c: C('C',3,2), p: Weight('P',{exact:2}), d: Door('D','P'), j: E(1,'frog'), e: E(3,'dog'), l: Hold('H',{species:'frog'}) },
  '先に小さい仲間をどかして押す列をつくり、箱で板を保持する。', '箱を動かす犬と箱を通すかえるで仕事が分かれる。', 'かえるは一度下のくぼみへ。犬が箱を板に置いたら、星への順番を考えよう。', { probe: 'event' });

stage(water, '青い道と石の道', 'fwwwe/a###./...j.', { f: D(1,'fish'), a: D(1), w: W(), e: E(1,'fish'), j: E(1,'dog') },
  '水を渡れるさかなと、陸を回る犬を分ける。', '盤面は一つでも通行できる地形は種族で異なる。', 'さかなは青い床へ。犬は下の石道から右側へ。', { learning: '導入' });
stage(current, '流れの終点', 'f.r###/##v###/##v###/##...e', { f: D(2,'fish'), r: Current('S'), v: Current('S'), e: E(2,'fish') },
  '下へ続く水の停止点を読み、星までの横道へ。', '水の通過と自動移動の停止点が違う。', '右の青い入口から下へ流される。水が途切れた岸で右へ曲がろう。', { learning: '導入', probe: 'event' });
stage(water, '水に二つの数字', 'f.wg.e/.bs#../...#j#', { f: D(2,'fish'), b: D(1,'fish'), w: W(), g: G(1,'fish'), s: S(1), e: E(2,'fish'), j: E(1,'fish') },
  '大きい個体を水路の細い門のために分け、後で2をつくる。', '水に入れる種族でも門には段階制限がある。', '手前で合体すると門を通れない。針と星の数字で1を置く順を決めよう。');
stage(bubble, '水の縦窓', '##b.e/##b##/##b##/f.b##', { f: D(2,'fish'), b: Bubble({min:2}), e: E(2,'fish') },
  '泡で水中から持ち上がり、上の横穴へ抜ける。', '泡が合う段階のさかなだけを上へ運ぶ。', '右の泡に入って上へ。最後の泡から斜め上の床を使う。', { gravity: true, learning: '導入', probe: 'event' });
stage(current, '逆風の岸', 'f.r..e/#.###./#u....', { f: D(1,'fish'), r: Current('W'), u: Current('N'), e: E(1,'fish') },
  '逆向きの流れを避けて、別の流れから右岸に着く。', '最短に見える道は戻される。下の岸を経由する。', '上の青いマスを越そうとすると左へ戻る。縦の枝から下を回ろう。');
stage(water, 'ひとつの水門', 'pww.e#/##w###/fwwj##', { p: D(2,'penguin'), f: D(1,'fish'), w: W(), e: E(1,'fish'), j: E(2,'penguin') },
  '泳げる二種族が狭い水中ですれ違う。', '水路を犬とさかなの区別だけに使わず、両方が同じ水路へ進む。', '違う種族は重なる向きに動くと場所を交換できる。出口の上下を確認。');
stage(current, '流されて出会う', 'frr..e/###b##/###.##', { f: D(2,'fish'), b: D(1,'fish'), r: Current('E'), e: E(3,'fish') },
  '下の1を停止点へ置き、流れて来る2を合体で受ける。', '同じ流れでも先に受け手を配置すると次の動作が変わる。', '1を流れの右端に置き、2が右へ流れるときに受け取ろう。', { probe: 'event' });
stage(current, '水路の仕分け口', 'f.srd.e/#.wu###/#...j##', { f: D(3,'fish'), s: S(1), r: Current('E'), u: Current('S'), w: W(), d: G(2,'fish'), e: E(2,'fish'), j: E(1,'fish') },
  '流れへ入る前に段階を配分して、門の先と下段へ分かれる。', '流れと条件門の順が固定で、先に針の作業が必要。', '針を踏んだ2は右の流れ。小さな1は下向きの流れか下の回廊へ。', { probe: 'event' });
stage(bubble, '泡に乗る荷の重さ', '##b.e/##b##/fwx##/#.j##', { f: D(3,'fish'), w: W(), b: Bubble({exact:2}), x: [S(1),...Bubble({exact:2})], e: E(2,'fish'), j: E(1,'fish') },
  '針で2に整えた時だけ泡が本体を持ち上げる。', '同じ泡にいても段階で上下の出口が分かれる。', '泡の底の針で3を2と1にする。2は上、1は下の星へ。', { gravity: true, probe: 'event' });
stage(current, 'うずの外から', 'frd..e/.###.#/.sl#j#/...###', { f: D(4,'fish'), r: Current('E'), d: Door('D','A'), s: S(1), l: Latch('A',{exact:1}), e: E(3,'fish'), j: E(1,'fish') },
  '閉じた水路に飛び込む前に、脇道で小さい開錠役をつくる。', '同じ流れが準備前は壁で止まり、準備後は最短経路になる。', '下の針で1を用意し、留め具へ。3は上の流れに戻ろう。', { probe: 'event' });

export { specs };

stage(ice, '白い曲がり角', 'a..####/#iii###/###.###/###...e', { a: D(1), i: I(), e: E(1) },
  '上から氷に入り、次は右へ滑って曲がり角へ。', '入る向きを変えると停止する場所が変わる。', '上から入って一度止まる。右へ滑って岩に当たった所から下へ。', { learning: '導入', probe: 'event' });
stage(ice, '止まる場所はひとつ', 'a.####/.iii.#/##.#.e/##...#', { a: D(2), i: I(), e: E(2) },
  '途中で曲がれない氷へ別の向きから入り直す。', '入口の向きが、到達できる側道を決める。', '氷の右端まで滑り切る場合と、下から上へ入る場合を試そう。', { probe: 'event' });
stage(ice, '氷の受け手', 'aiii.e/##f###/##.j##', { a: D(2), f: D(1,'frog'), i: I(), e: E(2,'dog'), j: E(1,'frog') },
  '仲間の横移動で滑り先の交換位置をつくる。', '氷の上に出る順で、救出までに使う列が変わる。', 'かえるを氷の受け手にするか、下の星へ先に引くか考えよう。', { probe: 'event' });
stage(ice, '終点で針が伸びる', 'aiiis.e/###..j#', { a: D(3), i: I(), s: S(1), e: E(2), j: E(1) },
  '氷から針へ入る向きで、1が戻る足元を読む。', '氷が選んだ向きがそのまま針の向きになる。', '滑った先の針で2と1に分かれる。1はそのまま合体させないよう下へ。', { probe: 'event' });
stage(ice, '道を留める箱', 'aiiic##/###e.##/###...#', { a: D(2), i: I(), c: C(), e: E(2) },
  '箱の手前を停止点にして下へ折れる。', '邪魔に見える箱が滑りの歯止めになる。', '箱を押す前に、滑った先から斜め下の星に届くか見よう。', { probe: 'event' });
stage(ice, '同じ氷、違う出口', 'a.iii.e/f.#.#.j/..#....', { a: D(2), f: D(1,'frog'), i: I(), e: E(2,'dog'), j: E(1,'frog') },
  '二種族を氷へ送る順序と、氷を避ける道を比較する。', '同じ停止点を使えるが、必要な出口は上下に違う。', '上の列で滑る方と、下を歩く方を分けるとぶつからない。', { probe: 'event' });
stage(ice, '滑りすぎた合体', 'aiiig.e/##b#s.j/##..###', { a: D(2), b: D(2), i: I(), g: G(4), s: S(1), e: E(3), j: E(1) },
  '滑走で合体を起こす位置をつくり、その後一つだけ切り離す。', '氷の曲がり方と、3＋1になる分割の場所を分けて考える。', '4に合わせた後、針で3と1へ。滑り途中の2を支えにする手もある。', { probe: 'event' });
stage(ice, '氷の片道券', 'aoii..#/#####.e/b...o..', { a: D(2), b: D(1), i: I(), o: One('E'), e: E(3) },
  '上の滑走路と下の片道通路から右岸へ別々に渡る。', '合流の場所に加えて帰れない進入向きがある。', '上は右へ滑る。下は矢印へ横から入り、右岸で段階を合わせよう。', { probe: 'event' });
stage(ice, '白い階段、黒い穴', 'aii..e/###.##/###..j', { a: D(3), i: I(), e: E(1), j: E(3) },
  '氷の先の穴を落下の入口にする。', '進入時の一手で滑走と落下がつながる。', '滑りの先には床の切れ目。下へ落ちてから3の星を探そう。', { gravity: true, probe: 'event' });
stage(ice, '氷上の合鍵', 'aiis.d.e/###.p###/###.j###', { a: D(4), i: I(), s: S(1), d: Door('D','P'), p: Latch('P',{exact:1}), e: E(2), j: E(1) },
  '氷の先で二度割り、開錠役と救出役を分ける。', '針を踏み直すと鍵の1が増え、必要な2まで減らしかねない。', '針を二回で止めて本体を2に。どちらかの1で留め具を点けよう。', { probe: 'event' });

stage(wind, '壁まで届く風', 'a...###/###>>../#####.#/#####.e', { a: D(2), '>': Wind('E'), e: E(2) },
  '複数の風をつないで吹き抜けた先の道を読む。', '氷と違い、風向きは入った向きで決まらない。', '上の道から風に入ると右の壁際へ。風を抜けてから下へ曲がろう。', { learning: '導入', probe: 'event' });
stage(wind, '下から回り込む風', 'a.>v../##.#../##.>.e', { a: D(1), '>': Wind('E'), v: Wind('S'), e: E(1) },
  '折れた風の最後を予測して進入点を選ぶ。', '同じ一手の途中で風が直角に曲がる。', '風の印を一つずつたどり、止まるマスから星へ。', { probe: 'event' });
stage(updraft, '気流の階段', '##u.e/##u##/##u##/a.u##', { a: D(2), u: Up({min:2}), e: E(2) },
  '段差を上る代わりに気流の止まり際へ出る。', '支えのない上りを外力で行う。', '右の上向きの風へ入る。いちばん上で横に出られる。', { gravity: true, learning: '導入', probe: 'event' });
stage(wind, '風の中を歩ける重さ', 'a.v..e/#.b###/#.j###', { a: D(2), b: D(1), v: Wind('S',{max:2}), e: E(3), j: E(1) },
  '先に3をつくると軽い仲間を押し戻す風を無視できる。', '風に乗ることより、吹き返されない重さが鍵になる。', '2のまま風へ行くと下へ戻る。1を合わせた3で渡ろう。');
stage(wind, '小さい仲間の裏口', 'a.s>.d.e/###w.p##/##...j##', { a: D(4), s: S(1), '>': Wind('S',{exact:1}), w: Wind('E',{exact:1}), d: Door('D','P'), p: Latch('P',{exact:1}), e: E(3), j: E(1) },
  '1だけ風で横道へ運び、連動扉を開ける。', '本体と子が同じ風に入っても進路が別れる。', '針のあと1を下向きの風へ。次の風が留め具のそばまで運ぶ。3は流されず上の扉へ。', { probe: 'event' });
stage(updraft, '二段の吹き上げ', '####u.e/####u##/##u.u##/##u####/a.u####', { a: D(2), u: Up({exact:2}), e: E(2) },
  '一つ目の気流の途中から、別の気流へ乗り継ぐ。', '同じ縦穴にとどまると、一段目より高く進めない。', '最初の上昇気流から横に一歩。次の気流を探そう。', { gravity: true, probe: 'event' });
stage(wind, '押し風と横道', 'a.>.c..#/#####.e#', { a: D(2), '>': Wind('E'), c: C(), e: E(2) },
  '風は箱に当たって止まる。止まった後の自分の手で箱を押す。', '外力と箱を動かせる入力が分かれている。', '風だけでは箱が押せない。風に止められた地点から押し直そう。', { probe: 'event' });
stage(wind, 'ふたつの風の棚', 'a.v.>.e/#.v###./#.>..b./###.###', { a: D(2), b: D(1), v: Wind('S'), '>': Wind('E'), e: E(3) },
  '上下で風に流される順序を使い、右岸で合体する。', '風を出た先で再び別の風を受ける。', '1を右の待避所に残し、2を下へ回して合流させよう。', { probe: 'event' });
stage(updraft, '風が届かない重さ', '##u..e/##u###/a.s###/##.###/##...j', { a: D(4), s: [S(1),Up({exact:3})], u: Up({exact:3}), e: E(3), j: E(1) },
  '針で3にした本体を持ち上げ、小さい1を下へ落とす。', '先に分けないと重力と風のどちらも出口に届かない。', '針で3と1。3だけ気流へ乗れる。1は針の下へ。', { gravity: true, probe: 'event' });
stage('npc.owl', '谷の相棒', 'a.o.d.e/#f###../#..##.j', { a: D(2), f: D(1,'frog'), o: T('npc.owl',{id:'O',species:'dog',partner:'frog'}), d: Door('D','O'), e: E(2,'dog'), j: E(1,'frog') },
  'ふくろうの位置に犬、隣にかえるを揃えて道を借りる。', '訪問役と同行役が別で、同じ場所に集まればよいわけではない。', '犬はふくろうのマスへ。かえるはその上下左右のどこかで待とう。', { probe: 'event', learning: '導入' });

stage(warp, '離れた石環', 'a.p#q.e', { a: D(1), p: Warp('A'), q: Warp('A'), e: E(1) },
  '壁で離れた小部屋を同じ印の環で渡る。', '出口までの距離を環の対で読み替える。', '左の環へ。右の同じ印の環から出られる。', { learning: '導入', probe: 'event' });
stage(warp, '受け取り場所を空ける', 'a.p#qfe/###.#.j', { a: D(2), p: Warp('A'), q: [Warp('A'),D(1,'frog')], f: T('scenery.lamp'), e: E(2,'dog'), j: E(1,'frog') },
  '受け取り側を空けてから転送する。', '環が動かないとき、操作するべき場所は遠い側。', '向こうの環にいるかえるを隣へ。犬が左の環に入り直せるようにする。', { probe: 'event' });
stage(warp, '輪の先に待つ時間', 'a.p#qbe/##.#..#', { a: D(2), b: D(1), p: Warp('A'), q: Warp('A'), e: E(3) },
  '離れた2を送って、対岸の1と合わせる。', '合体役が環を使うが、受け取り役は環の外で待つ。', '右の1を環に置かないまま、左の2を送ろう。', { probe: 'event' });
stage(warp, '同じ岸へ、別の環', 'ap#q..e/..##.##/br#s..#', { a: D(2), b: D(1), p: Warp('A',{exact:2}), q: Warp('A',{exact:2}), r: Warp('B',{exact:1}), s: Warp('B',{exact:1}), e: E(3) },
  'それぞれが通れる環に別々に入り、向こうで3をつくる。', '二組の環を両方使う。早く合体するとどちらも通れない。', '2はA、1はB。環の対を越えてから合わせる。', { probe: 'event' });
stage(warp, '押し出された環', 'a.p#qc../######.e/#####...', { a: D(2), p: Warp('A'), q: Warp('A'), c: C(), e: E(2) },
  '環を出た後で、箱を先に動かせる位置を確保する。', '環で渡っても右岸の箱が残る。着地場所の手順が要る。', '環の着地点から箱を二度押すと、下へ曲がる場所ができる。', { probe: 'event' });
stage('fixture.burrow', '土の下は片道', 'a.p#qte', { a: D(1), p: T('fixture.burrow',{pairId:'A',role:'entrance',orientation:'E',max:1}), q: T('fixture.burrow',{pairId:'A',role:'exit'}), t: T('terrain.tunnel',{max:1}), e: E(1) },
  '小さい体で、矢印の向きから地中へ入る。', '往復できる環と違い、出口からは送り返されない。', '入口の左から右へ。着いたら細道をそのまま進もう。', { learning: '導入', probe: 'event' });
stage('fixture.burrow', '土の入口へ回る', 'a..###/.sp#q.e/..j###', { a: D(3), s: S(1), p: T('fixture.burrow',{pairId:'A',role:'entrance',orientation:'E',exact:1}), q: T('fixture.burrow',{pairId:'A',role:'exit'}), e: E(1), j: E(2) },
  '1を針で作り、入口の左に立てる場所へ持っていく。', '段階に加えて進入方向も条件になる。', '2は手前の星。1で針のマスに立ち、右へ入口へ入ろう。', { probe: 'event' });
stage(warp, '水の環と石の環', 'fwp#qwe/a.r#s.j', { f: D(2,'fish'), a: D(1), w: W(), p: [W(),Warp('A',{species:'fish'})], q: [W(),Warp('A',{species:'fish'})], r: Warp('B',{species:'dog'}), s: Warp('B',{species:'dog'}), e: E(2,'fish'), j: E(1,'dog') },
  '同じ岸の二種族を水中と地上の別々の環で送る。', '水と種族条件で環の使い分けが必要。', 'さかなは上の青い環、犬は下の石の環を選ぶ。', { probe: 'event' });
stage(warp, '逆向きの着地', 'a.s.p#q./###..#d#/###.l#ej', { a: D(3), s: S(1), p: Warp('A'), q: Warp('A'), d: Door('D','L'), l: Latch('L',{exact:1}), j: E(1), e: E(2) },
  '片岸の留め具を点け、対岸の出口へ順番に送る。', '鍵役も最後には環を通るので受け口を開け直す。', '1で手前の留め具を点け、2を先に環から右へ。最後に1も渡ろう。', { probe: 'event' });
stage('fixture.burrow', '足跡の帰らない森', 'asp#qte/#.g##.#/##r#u.j', { a: D(4), s: S(1), p: T('fixture.burrow',{pairId:'A',role:'entrance',orientation:'E',exact:1}), q: T('fixture.burrow',{pairId:'A',role:'exit'}), t: T('terrain.tunnel',{max:1}), r: Warp('B',{exact:3}), u: Warp('B',{exact:3}), g: G(3), e: E(1), j: E(3) },
  '1は細道、3は条件門を経て環。違う道を越えて両側の星へ。', '片道入口と往復環が同じ役には使えない。', '1を土へ送る。3は下の環を使うので、細道へ回さなくてよい。', { probe: 'event' });

stage(phase, '石戸が息をする', 'a.v.e/..###', { a: D(1), v: Phase(3,2), e: E(1) },
  '成功した一手で時計が進むので、横の空きで位相を調整する。', '動かない方向への入力では扉を待てない。', '閉じていたら左の小部屋で一手進め、数字を見て入り直そう。', { learning:'導入', probe:'event' });
stage(phase, '二つの時計はずれる', 'a.v..w.e/..#..###', { a: D(2), v: Phase(2,1), w: Phase(3,0), e: E(2) },
  '二つの周期の位相を一緒に考えて前室へ入る。', '扉を一つ越えても次の扉の開く手は揃わない。', '間の空きで歩いて調整できる。左の扉を通った手数を数えよう。', { probe:'event' });
stage('field.wave', '波を待つ小湾', 'f.v..e/#.##.#/#..#.#', { f: D(2,'fish'), v: [W(),T('field.wave',{orientation:'W',period:3,phase:1})], e: E(2,'fish') },
  '逆向きの波がない相を選んで上の近道を抜ける。', '常時流れる水路と違い、同じ入口が別の結果を作る。', '波の色を見て、逆に押される相なら左の水際で調整しよう。', { learning:'導入' });
stage(phase, '時計係を残す', 'aov.e/.f#j#', { a: D(2), f: D(1,'frog'), o: One('E'), v: Phase(3,0), e: E(2,'dog'), j: E(1,'frog') },
  '犬が片道入口に来たら、別の仲間の移動で時計を回す。', '片開きの先で足踏みする代わりに、残した仲間を動かせる。', '犬の次の扉が閉じていたら、かえるを星に入れる前に一手動かす。', { probe:'event' });
stage(sequence, '一と三のあいだ', 'a.3.d.e/..###../b.1.2##', { a: D(2), b: D(1), '1': Seq('A','S',1,{exact:1}), '2': Seq('B','S',2,{exact:2}), '3': Seq('C','S',3,{exact:1}), d: Door('D','S'), e: E(3) },
  '1が両端の合図を受け持ち、2は真ん中の作動役になる。', '小さい仲間が二度戻るので、順序だけでなく役の保存が必要。', '1を下の左へ、次は2を下の右へ。その後で1を上の板へ。', { probe:'require' });
stage(toggle, '返事は一回ずつ', 'a.td.uve/#...##.#/#...w..#', { a: D(2), t: Toggle('A'), d: Door('D','A'), u: Toggle('B'), v: Door('V','B'), w: Door('W','B'), e: E(2) },
  '同じ板を二度踏むと扉の状態が変わる。帰りの経路を選ぶ。', '行きに通れた道が帰りにも通れるとは限らない。', '板を踏んでから、もう一度その板へ戻らない道を探そう。', { probe:'require' });
stage(phase, '針が二拍進めない', 'a.sv..e/##.#.j#', { a: D(3), s: S(1), v: Phase(3,2), e: E(2), j: E(1) },
  '分裂は一手分と数えて、子と本体の前進を交互にする。', '仲間が増えても時計の進みは入力数のまま。', '扉の手前で止まったら、後ろの1を動かして時計を進めよう。', { probe:'event' });
stage('field.wave', '押し波で出会う', 'f.rvb.e/#..####/#....##', { f: D(3,'fish'), b: D(1,'fish'), r: Current('E'), v: [W(),T('field.wave',{orientation:'E',period:3,phase:1})], e: E(4,'fish') },
  '波が出る相では流れの先まで届き、出ない相では間の水に止まる。', '合体の置き場を水の二つの停止点から選ぶ。', '1の位置を決めてから、水路へ入る手を数える。', { probe:'event' });
stage(latch, '戻さない留め具', 'atdp.e/f###j#', { a: D(2), f: D(1,'frog'), t: Toggle('A'), d: T('fixture.door',{id:'D',any:['A','B']}), p: Latch('B',{exact:2}), e: E(2,'dog'), j: E(1,'frog') },
  '切替で一度通し、その奥で記憶式へ引き継ぐ。', '同じ開いた表示でも、帰路を保証する入力の種類が異なる。', '犬が先に扉の奥の留め具を作動させてから、かえるを動かそう。', { probe:'require' });
stage('npc.owl', 'ふくろうの合図と星時計', 'a..ovde/#..###j/#f...##', { a: D(2), f: D(1,'frog'), o: T('npc.owl',{id:'O',species:'dog',partner:'frog'}), v: Phase(3,1), d: Door('D','O'), e: E(2,'dog'), j: E(1,'frog') },
  '二種族の合図が揃った後、相棒が最後の時計合わせも助ける。', '同行役が連動と周期の二つの問題に関わる。', 'ふくろうと話す犬の隣へかえる。扉の位相はそのあと揃えよう。', { probe:'event' });

stage(crate, '二枚の板と借りた重さ', 'af.cp###/#....qdj/#..b###e', { a: D(2), b: D(1), f: D(1,'frog'), c: C('C',3,2), p: Weight('P',{exact:2}), q: Latch('Q',{exact:1,species:'frog'}), d: Door('D','P','Q'), j: E(1,'frog'), e: E(3,'dog') },
  '押す3をつくり、かえるで別条件を記憶させ、箱を保持役にする。', '合体・回り込み・重量の保持を一つずつ引き継ぐ。', '下の1と犬を合わせる。かえるは留め具、箱は上の板。', { probe:'event' });
stage(latch, '八を先に通す', 'a.b.gd.e/..p#l###/..j#####', { a: D(6), b: D(4), g: G(8), d: Door('D','L'), l: T('fixture.signalLamp',{needs:['L']}), p: Latch('L',{exact:2}), e: E(8), j: E(2) },
  '余剰2を鍵役にし、8を門の向こうへ残す。', '分配に使えるのは8を超えた余剰だけ。先に救出すると鍵が失われる。', '6と4を合わせると8＋2。2を板へ、8を数字の門へ。', { probe:'event' });
stage('fixture.burrow', '土と氷の二重底', 'asip#qte/...#.#.#/##.r#u.j', { a: D(5), s: S(2), i: I(), p: T('fixture.burrow',{pairId:'A',role:'entrance',orientation:'E',exact:1}), q: T('fixture.burrow',{pairId:'A',role:'exit'}), t: T('terrain.tunnel',{max:1}), r: Warp('B',{exact:3}), u: Warp('B',{exact:3}), e: E(1), j: E(3) },
  '二人の1を片道へ送り、氷を避けた3を環から渡す。', '同じ土の入口に二人を送り込むため、出口側を空け続ける。', '氷の勢いで1を入口へ。3は氷の手前から下の環へ。', { probe:'event' });
stage(hold, '先に床を消すか', '##..e/a.pd#/#.c##/#f..j', { a: D(2), f: D(1,'frog'), p: Hold('P',{species:'dog'}), d: Door('D','P'), c: Crumble(), e: E(2,'dog'), j: E(1,'frog') },
  '一瞬開く扉と一度だけの床を、同じ足元の判断に使う。', '橋を失うと犬とかえるの位置関係が戻せなくなる。', '板から扉へ入る手と、橋から離れる手を続けて考えよう。', { gravity:true, probe:'require' });
stage(bubble, '泡の上、石環の下', '##b.p#q/##b###e/##b####/fws..j#', { f: D(4,'fish'), w: W(), s: [S(1),...Bubble({exact:3})], b: Bubble({exact:3}), p: Warp('A',{exact:3}), q: Warp('A',{exact:3}), e: E(3,'fish'), j: E(1,'fish') },
  '3は泡で上がり、1は下の水際へ分かれる。', '上の環が救出手前の入口を、下の道が分裂体の出口を担当する。', '3に分けて泡に乗せる。小さい子の位置を見て下の星を選ぶ。', { gravity:true, probe:'event' });
stage(toggle, '凍った引き継ぎ線', 'a.siid.e/##.###.j/##t#p###/##...###', { a: D(3), s: S(1), i: I(), d: T('fixture.door',{any:['T','P']}), t: Toggle('T',{exact:1}), p: Latch('P',{exact:2}), e: E(2), j: E(1) },
  '1で切替え、氷に乗せる2の道を開けてから子を回収する。', '氷の途中で止まれないため、切替を行う順序が経路に効く。', '2を滑らせる前に下の1で切替。最後の1も数を変えずに通そう。', { probe:'event' });
stage('field.wave', '潮目で鍵を受け渡す', 'f.rvd.pe/#..##.#j/#s.t..##', { f: D(4,'fish'), r: Current('E'), v: [W(),T('field.wave',{orientation:'E',period:2,phase:1})], d: Door('D','T'), t: Latch('T',{exact:1}), p: Phase(3,2), s: S(1), e: E(3,'fish'), j: E(1,'fish') },
  '1を鍵役に残し、波の相と時計の相の両方を合わせる。', '分裂で操作役が増えることがタイミング調整に役立つ。', '下の針で1をつくり、留め具へ。上の波と右の時計は別に合わせる。', { probe:'event' });
stage(sequence, '星の合図は三つ', 'a.s..d.e/##2#.##j/##..3###/##1..###', { a: D(5), s: S(2), '1': Seq('P','Q',1,{exact:1}), '2': Seq('R','Q',2,{exact:3}), '3': Seq('S','Q',3,{exact:1}), d: Door('D','Q'), e: E(3), j: E(2) },
  '二人の1と本体3を別々に使って合図し、合図後に1同士を合わせる。', '最後の合体は鍵の仕事を全部終えるまで先送りする。', '下1→上2→右3。点いたら小さな二人を2に戻して出口へ。', { probe:'require' });
stage(warp, '左岸に残す仕事', 'as.p#qde/#.##.#j./#.lr#u../#f..####', { a: D(5), f: D(1,'frog'), s: S(2), p: Warp('A',{exact:3}), q: Warp('A',{exact:3}), r: Warp('B',{max:2}), u: Warp('B',{max:2}), l: Latch('L',{exact:1,species:'dog'}), d: Door('D','L'), e: E(3,'dog'), j: E(undefined,undefined,{max:2}) },
  '本体を先に転送し、小さい仲間と相棒で別の環の送り順を決める。', '環の入口条件が異なるため、戻って助けられる仲間が限られる。', '3は上の環。残りの1は下の環を一人ずつ渡し、対岸をふさがない。', { probe:'event' });
stage('npc.owl', '時の塔の最後の灯り', 'a.s.vode/#.##.f#j/#.p####k/#...####', { a: D(5), f: D(1,'frog'), s: S(2), o: T('npc.owl',{id:'O',exact:3,species:'dog',partner:'frog'}), d: Door('D','O','P'), p: Latch('P',{exact:1,species:'dog'}), v: Phase(3,2), e: E(3,'dog'), j: E(2,'dog'), k: E(1,'frog') },
  '3を訪問役、かえるを相棒、1を鍵役に分け、最後の二人を出口の2に戻す。', '一時の分割、遠隔の開錠、位相合わせ、協力、最後の合体に異なる役割がある。', '先に1で留め具を点ける。かえるはふくろうの下で待ち、3で合図。二人の1は針を通り過ぎてから合わせよう。', {
    probe:'event',
    authored: '02E 12E 12S 13C 22E 32E 42E 52E 62E 53A 62C 73S 24B 13N 12E 22E 02E 32E 42E 12E 22E 52E 62E 32E 42E 52E 62E 72S'
  });

const bfsLimit = 12000;
const bfsDepth = 90;
const witnessLimit = 30000;
const witnessDepth = 120;
const probeLimit = 2500;
const protoVersion = 'naopoyo-100-v1';
const directionalWitness = { E: [1, 0], N: [0, -1], S: [0, 1], W: [-1, 0], A: [1, -1], B: [-1, -1], C: [1, 1], D: [-1, 1] };
const firstAppearance = new Map(Object.entries({
  [gate]: 3, [spike]: 5, [gravity]: 11, [crumble]: 17, [hold]: 21, [latch]: 22,
  [sequence]: 24, [toggle]: 26, [crate]: 31, [weight]: 32, [one]: 33,
  [water]: 41, [current]: 42, [bubble]: 44, [ice]: 51, [wind]: 61, [updraft]: 63,
  'npc.owl': 70, [warp]: 71, 'fixture.burrow': 76, 'terrain.tunnel': 76,
  [phase]: 81, 'field.wave': 83
}));

function authoredActions(input) {
  return input.split(' ').map(([x, y, heading]) => {
    const [dx, dy] = directionalWitness[heading];
    return { x: Number(x), y: Number(y), dx, dy };
  });
}

function withoutMain(stage) {
  const { board, mainGimmick } = stage;
  if (mainGimmick === gravity) return { ...board, gravity: false };
  if (mainGimmick === gate) return { ...board, gates: [] };
  if (mainGimmick === spike) return { ...board, spikes: [] };
  if (mainGimmick === exit) return null;
  return { ...board, tiles: board.tiles.filter(t => t.catalogId !== mainGimmick) };
}

function searchStats({ solution, ...record }) {
  return record;
}

function solveStage(stage) {
  const bfs = solve(stage.board, { limit: bfsLimit, maxDepth: bfsDepth });
  let sample = null;
  let solution = bfs.solution;
  let proof = 'shortest';
  if (!solution) {
    if (stage.authored) {
      solution = authoredActions(stage.authored);
      proof = 'authored-witness';
    } else {
      sample = findWitness(stage.board, { limit: witnessLimit, maxDepth: witnessDepth });
      solution = sample.solution;
      proof = 'bounded-witness';
    }
  }
  if (!solution?.length) throw new Error(`Unsolved stage ${stage.number} ${stage.title}. BFS ${bfs.status}, witness ${sample?.status}`);
  const { events, touched } = replay(stage.board, solution);
  const serialized = JSON.parse(JSON.stringify(serializeBoard(stage.board)));
  replay(deserializeBoard(serialized), solution);
  const probeBoard = stage.probe && withoutMain(stage);
  const probe = probeBoard && solve(probeBoard, { limit: probeLimit, maxDepth: bfsDepth });
  const ablation = probe && {
    removed: stage.mainGimmick,
    ...searchStats(probe),
    solutionLength: probe.solution?.length ?? null,
    finding: probe.status === 'exhausted' ? 'no-solution-after-removal'
      : probe.status === 'limit' ? 'unknown-after-removal'
        : probe.solution.length < solution.length && proof === 'shortest' ? 'removal-shortens-shortest'
          : proof === 'shortest' && probe.solution.length > solution.length ? 'removal-lengthens-shortest'
            : proof === 'shortest' ? 'same-shortest-length-after-removal'
              : 'solution-exists-after-removal'
  };
  const eventCounts = {};
  for (const event of events) {
    const kind = event.catalogId || event.type;
    eventCounts[kind] = (eventCounts[kind] || 0) + 1;
  }
  const evidence = {
    proof, commands: solution.length, breadthFirst: searchStats(bfs),
    weightedSearch: sample && searchStats(sample), touched, eventCounts, ablation: ablation || null
  };
  const { probe: probeTag, authored, ...publicStage } = stage;
  return { stage: { ...publicStage, solution }, evidence, draft: stage.number };
}

function targetScore(item) {
  const { stage, evidence } = item;
  const fixtures = stage.materials.filter(id => !['terrain.floor', 'terrain.wall', exit].includes(id) && !id.startsWith('scenery.'));
  const contributors = [
    evidence.commands * 0.55,
    fixtures.length * 1.5,
    (stage.board.actors.length - 1) * 1.3,
    Math.log2(evidence.breadthFirst.expanded + 1) * 0.45,
    stage.board.gravity ? 1.6 : 0,
    (evidence.eventCounts.split || 0) ? 1.2 : 0,
    (evidence.eventCounts.mechanism || 0) > 2 ? 0.8 : 0,
    evidence.proof === 'shortest' ? 0 : 2
  ];
  return Number(contributors.reduce((sum, n) => sum + n, 0).toFixed(2));
}

function orderForPlay(results) {
  // Give first-time players the common contact and gravity vocabulary before the first terrain families.
  const opening = [1, 21, 4, 3, 11, 6, 5, 7, 8, 51, 61, 71, 41, 42];
  const ready = opening.map(number => results[number - 1]);
  const pending = results.slice(0, -1).filter(item => !opening.includes(item.draft))
    .map(result => ({ ...result, designScore: targetScore(result) }));
  const seen = new Set(ready.flatMap(item => item.stage.materials));
  while (pending.length) {
    const previous = ready.at(-1).stage.mainGimmick;
    const eligible = pending.filter(item => item.stage.materials.every(id =>
      seen.has(id) || !firstAppearance.has(id) || firstAppearance.get(id) === item.draft));
    if (!eligible.length) throw new Error('Mechanic introduction dependency cycle');
    const ranking = item => item.designScore + Number(item.stage.mainGimmick === previous) * 1.25;
    eligible.sort((a, b) => ranking(a) - ranking(b) || a.draft - b.draft);
    const item = eligible[0];
    pending.splice(pending.indexOf(item), 1);
    for (const id of item.stage.materials) seen.add(id);
    ready.push(item);
  }
  ready.push(results.at(-1));
  return ready.map((item, i) => {
    const number = i + 1;
    const id = String(number).padStart(2, '0');
    const board = { ...item.stage.board, id: `naopoyo-100-${id}` };
    const introducing = item.stage.materials.some(key => firstAppearance.get(key) === item.draft);
    const learning = introducing || item.stage.learning === '導入' ? '導入' : item.stage.learning;
    return { ...item, designScore: targetScore(item), stage: { ...item.stage, id, number, difficulty: number, learning, board } };
  });
}

function markdownRows(stages, evidence) {
  return stages.map(s => {
    const e = evidence[s.id];
    return `|${s.number}|${s.title}|${s.learning}|${s.mainGimmick}|${s.idea}|${s.difference}|${e.commands} ${e.proof === 'shortest' ? '最短' : '確認手順'}|`;
  }).join('\n');
}

function csvRows(stages, evidence) {
  const fields = ['number', 'id', 'difficulty', 'title', 'learning', 'mainGimmick', 'supportGimmicks', 'materials', 'text', 'goal', 'idea', 'difference', 'hint', 'commands', 'proof'];
  const escape = value => `"${String(Array.isArray(value) ? value.join(' / ') : value).replaceAll('"', '""')}"`;
  return [fields, ...stages.map(s => fields.map(key => s[key] ?? evidence[s.id][key]))].map(row => row.map(escape).join(',')).join('\n') + '\n';
}

function output(results, checkOnly) {
  const ordered = orderForPlay(results);
  const stages = ordered.map(item => item.stage);
  const byStage = Object.fromEntries(ordered.map(({ stage, evidence, designScore }) => [stage.id, { ...evidence, designScore }]));
  const shortest = ordered.filter(item => item.evidence.proof === 'shortest').length;
  const authored = ordered.filter(item => item.evidence.proof === 'authored-witness').length;
  const witnesses = stages.length - shortest - authored;
  const validatedProbes = ordered.filter(item => item.evidence.ablation);
  const limits = { breadthFirst: { nodes: bfsLimit, depth: bfsDepth }, weighted: { nodes: witnessLimit, depth: witnessDepth }, ablation: { nodes: probeLimit, depth: bfsDepth } };
  const materialAppearances = {};
  for (const s of stages) {
    for (const key of s.materials) (materialAppearances[key] ??= []).push(s.id);
  }
  const serialized = stages.map(({ solution, board, ...s }) => ({ ...s, exchange: serializeBoard(board) }));
  const json = value => JSON.stringify(value, null, 2) + '\n';
  const probes = Object.groupBy(validatedProbes, ({ evidence }) => evidence.ablation.finding);
  const formatList = items => items?.map(({ stage }) => stage.id).join('、') || '該当なし';
  const markdown = `# なおぽよ。全100面

番号は目標難易度。初めて使う素材を複合面より先に置き、手数、探索の広がり、重力、同時に考える役と条件の数を参考に並べた。実際の難易度と面白さの順は本人の試遊で評価する。

すべて8×8。各行の手数は成功した入力の数。強制移動と落下は一入力の中で解決する。元の第1章の盤面は別冊の体験型絵本で使う。

|目標難度|面名|区分|主素材|考えること|前後の面との違い|解法|
|---:|---|---|---|---|---|---:|
${markdownRows(stages, byStage)}

使用素材と条件の一覧は [STAGES.csv](STAGES.csv)。手順と検証情報は [solutions.json](solutions.json) と [validation.json](validation.json)。
`;
  const improvements = `# 改善候補と検証の範囲

## 確認できたこと

- 100面すべてで、試作の操作と同じランタイムに手順を入力し、全員の救出を再現した。図鑑ID交換形式へ出力し、読み戻した盤面でも同じ手順を再生した。
- 幅優先探索で最短を確定したのは ${shortest} 面。上限後に優先探索で見つけた解は ${witnesses} 面、手書きの確認解は ${authored} 面。上限を超えた面では記録した手数は上限値として扱う。
- 幅優先の上限は一面 ${bfsLimit} 展開・${bfsDepth} 手。優先探索は ${witnessLimit} 展開・${witnessDepth} 手。状態は個体の座標・種族・段階、押された板、記憶、順序、箱、崩壊、周期の相で区別する。
- 主素材を外す比較を ${validatedProbes.length} 面に実施した。素材を外すと解がないことまで確認できた面は ${formatList(probes['no-solution-after-removal'])}。比較上限は ${probeLimit} 展開。

## 試遊で確認する点

- 主素材を外しても最短手数が同じ面は ${formatList(probes['same-shortest-length-after-removal'])}。同手数でも経路や役は変わり得る。見かけだけで通れる場合は進入側、受け口、保持条件を見直す。
- 外すと最短手数が短くなる面は ${formatList(probes['removal-shortens-shortest'])}。向き・位相・停止点を読む負荷が意図どおりかを確認する。
- 外すと最短手数が長くなる面は ${formatList(probes['removal-lengthens-shortest'])}。自動で運ばれる結果が想像できるかを確認する。
- 素材を外した比較が上限に達した面は ${formatList(probes['unknown-after-removal'])}。解の有無は未確定。素材除去は局所的な比較なので、同手数で解ける場合も経路と担当の変更が起こり得る。
- 盤面での初出、担当の引き継ぎ、時間の合わせ方を中心に並べた。連続する面の体感の差、先に知っておきたいルール、気持ちよく発見できるヒントの長さを本人の試遊で見直す。
- 絵本で見せるのは正式Dの基本。試作の風、水、地中の入口、連動、協力は対応する番号面の説明と図鑑で確認する。
`;
  const outputFiles = [
    [resolve(here, 'stages.mjs'), '// Generated by build-stages.mjs from the individually authored maps.\nexport const stages = [\n' + stages.map(s => '  ' + JSON.stringify(s)).join(',\n') + '\n];\n'],
    [resolve(here, 'stage-data.json'), '{"version":"' + protoVersion + '","stages":[\n' + serialized.map(s => JSON.stringify(s)).join(',\n') + '\n]}\n'],
    [resolve(reports, 'STAGES.md'), markdown],
    [resolve(reports, 'STAGES.csv'), csvRows(stages, byStage)],
    [resolve(reports, 'IMPROVEMENTS.md'), improvements],
    [resolve(reports, 'solutions.json'), json({ version: protoVersion, action: '{x,y,dx,dy}; choose the actor currently at x,y', stages: stages.map(s => ({ id: s.id, title: s.title, proof: byStage[s.id].proof, commands: s.solution })) })],
    [resolve(reports, 'validation.json'), json({ version: protoVersion, counts: { stages: stages.length, replayed: stages.length, shortest, weightedWitnesses: witnesses, authoredWitnesses: authored, ablations: validatedProbes.length }, limits, materialAppearances, stages: byStage })]
  ];
  for (const [file, content] of outputFiles) {
    if (checkOnly && readFileSync(file, 'utf8') !== content) throw new Error(`Stale generated file ${file}`);
    if (!checkOnly) writeFileSync(file, content);
  }
  console.log(JSON.stringify({ stages: stages.length, shortest, witnesses, authored, ablations: validatedProbes.length, generated: !checkOnly }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (specs.length !== 100) throw new Error(`Expected 100 authored boards; found ${specs.length}`);
  const results = specs.map(stage => {
    const result = solveStage(stage);
    console.log(`${stage.id} ${stage.title} ${result.evidence.proof} ${result.evidence.commands} commands`);
    return result;
  });
  output(results, process.argv.includes('--check'));
}
