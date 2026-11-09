import { stages as formal } from '../naopoyo-time-hand-chapter1/stages.mjs';
import { solutions } from '../naopoyo-time-hand-chapter1/solutions.mjs';
import { createGameState, gameMove } from './engine.mjs';

const scenes = [
  [1, '光まで一歩ずつ', '目を覚ますと、石の向こうに光があった。いぬを選び、空いた隣のマスへ。'],
  [2, '後ろから、こんにちは', 'トゲを踏むと時の針が進んだ向きの真後ろへ。さっき自分が立っていた場所に、小さな仲間が現れる。'],
  [4, '針は岩の前で曲がる', '時の針はふさがれた向きを時計回りに変える。左に伸びていた針が岩に当たれば、次は上。'],
  [5, '一緒になる時間', '同じ種族が出会うと、二つの段階が一つになる。出口に書かれた数字まで段階を合わせよう。'],
  [6, '床が終わるところ', '下に支えがなければ、落ちる。足元が続く場所と途切れる場所を探そう。'],
  [7, 'かえるの背中', '違う種族は重ならないけれど、足場になれる。まず、かえるに足元を貸してもらう。'],
  [8, '角にできた道', '斜めの先へは角を回れるときだけ進める。上るなら、着く先の下に足場も必要。'],
  [9, '落ちて、また一つ', '分かれた仲間も支えがなければ落ちる。下にいる同じ種族に重なると、もう一度ひとつになれる。']
];

export const tutorialPages = scenes.map(([number, title, text]) => {
  const { board: source, goal, hint } = formal[number - 1];
  const board = { ...source, id: `picture-book-${number}`, title, tiles: source.gravity
    ? [{ catalogId: 'sign.gravity', x: 0, y: 0, params: {} }]
    : [] };
  const state = createGameState(board);
  const solution = solutions[number - 1].map(([id, dx, dy]) => {
    const { x, y } = state.actors.find(a => a.id === id);
    if (!gameMove(state, id, dx, dy).ok) throw new Error(`Invalid picture book action at page ${number}`);
    return { x, y, dx, dy };
  });
  return { title, text, goal, hint, board, solution };
});
