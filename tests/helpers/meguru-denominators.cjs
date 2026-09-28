// RH-6: めぐるの 世界の 件数(分母)の 置き場所を 1 つに する。値は 直書きの まま(かわったら 気づく ため)。
// いままで 20 本 以上の テストに 同じ 数が ちらばって いた。値が 変わる ときは ここと
// tests/meguru-denominators-test.cjs(WORLDS から 数えなおして 一致を 見る)を いっしょに なおす
const DENOMINATORS = Object.freeze({
  SPOTS: 471,            // ぜんぶの 地域の spot
  PATHS: 654,            // ぜんぶの 地域の みち
  ZONES: 118,            // ぜんぶの 地域の 地区
  SECRETS: 107,          // ひみつの spot + ひみつの みち(p[2] === 'secret')
  TIER1: 17,             // 世界地図の 大めじるし(通常 11 地域)
  COUNTABLE_ZONES: 103,  // 世界地図の 分母に 入る 地区(通常 11 地域)
  COUNTABLE_REGIONS: 11, // 世界地図の 分母に 入る 地域(しんかい こみ、star_stop / memory_lake なし)
  LINKS: 12,             // 世界地図の 分母に 入る 地域の つながり
});
// WORLDS から 数えなおす(ひみつの みちの 定義は p[2] === 'secret' に そろえる)
function countWorlds(M) {
  let spots = 0, paths = 0, zones = 0, secrets = 0;
  for (const w of Object.values(M.WORLDS)) {
    spots += w.spots.length; paths += w.paths.length; zones += w.zones.length;
    secrets += w.spots.filter((x) => x.secret).length + w.paths.filter((x) => x[2] === 'secret').length;
  }
  const C = M.worldCountable();
  return { SPOTS: spots, PATHS: paths, ZONES: zones, SECRETS: secrets, TIER1: C.tier1, COUNTABLE_ZONES: C.zones, COUNTABLE_REGIONS: C.regions.length, LINKS: C.links.length };
}
module.exports = { ...DENOMINATORS, DENOMINATORS, countWorlds };
