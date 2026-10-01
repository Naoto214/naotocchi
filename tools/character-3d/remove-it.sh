#!/bin/sh
# Character 3D Pilot の remove-it: だいじな しくみ を 1 つずつ こわして、専用テストが 赤に なる ことを たしかめる。
#   sh tools/character-3d/remove-it.sh
# 作業ツリーに コミットして いない 変更が ある と もどせない ので、きれいな 状態で はしらせる(git checkout -- で もどす)
set -u
cd "$(dirname "$0")/../.."
TEST=tests/character-3d-test.cjs
FILES="character-3d meguru-3d.mjs"
if [ -n "$(git status --porcelain -- $FILES)" ]; then echo "commit or stash character-3d/ meguru-3d.mjs first"; exit 2; fi
run() { # name file old new
  name="$1"; file="$2"; old="$3"; new="$4"
  python3 - "$file" "$old" "$new" <<'PY'
import sys
p,old,new=sys.argv[1:4]
s=open(p,encoding='utf-8').read()
assert s.count(old)==1, f'{p}: pattern not unique/found: {old[:70]!r}'
open(p,'w',encoding='utf-8').write(s.replace(old,new))
PY
  out=$(node --test "$TEST" 2>&1)
  pass=$(printf '%s' "$out" | grep -c '^ok ')
  fail=$(printf '%s' "$out" | grep -c '^not ok ')
  which=$(printf '%s' "$out" | grep '^not ok ' | sed -E 's/^not ok [0-9]+ - ([0-9]+)\..*/\1/' | tr '\n' ',' | sed 's/,$//')
  if [ "$fail" -gt 0 ]; then verdict=RED; else verdict="GREEN(!! mutation not detected)"; fi
  echo "$name | $file | pass $pass / fail $fail | red tests: $which | $verdict"
  git checkout -q -- "$file"
}
echo "baseline:"; node --test "$TEST" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' '; echo
run "A archetype mapping 削除(quadruped の builder)" character-3d/archetypes.mjs \
  "export const BUILDERS = { quadruped, avian," "export const BUILDERS = { avian,"
run "B stage parameter 削除(どの 段も 最初の 段の 数字)" character-3d/archetypes.mjs \
  "  const sp = SPEC.stageSpec(id, stage);" "  const sp = SPEC.stageSpec(id, (SPEC.STAGE_KEYS[id] || [stage])[0]);"
run "C emotion mapping 削除(いつも normal)" character-3d/spec.js \
  "    return EXPRESSION_3D[Object.hasOwn(EXPRESSION_3D, emotion) ? emotion : 'normal'];" "    return EXPRESSION_3D.normal;"
run "D fallback 削除(1 体の 失敗を そのまま 投げる)" character-3d/runtime.mjs \
  "      broken.add(actor); counters.fallbacks++;" "      throw err;"
run "E cache reuse 削除(template を 毎回 組む)" character-3d/runtime.mjs \
  "  if (TEMPLATES.has(key)) return TEMPLATES.get(key);" "  /* mutated */"
run "F expression cache 削除(顔 atlas を 毎回 つくる)" character-3d/rig.mjs \
  "  if (ATLAS.has(key)) return ATLAS.get(key);" "  /* mutated */"
run "G actor cleanup 削除(いなくなった actor を のこす)" character-3d/runtime.mjs \
  "  function endFrame() { for (const [a, inst] of live) if (inst.seen !== frame) drop(a, inst); }" "  function endFrame() {}"
run "H 2D/3D 切替 cleanup 削除(reset が なにも しない)" character-3d/runtime.mjs \
  "  function reset() { for (const [a, inst] of live) drop(a, inst); }" "  function reset() {}"
run "I player visibility guard 削除(frustum culling で きえうる)" character-3d/runtime.mjs \
  "        if (inst.isPlayer) inst.holder.traverse((o) => { o.frustumCulled = false; });" "        /* mutated */"
run "J reduced motion 削除" character-3d/animate.mjs \
  "  const k = { amp: reduced ? 0.5 : 1, idle: reduced ? 0 : 1 };" "  const k = { amp: 1, idle: 1 };"
run "K 立て看板を かくさない(2D と 3D が かさなる)" meguru-3d.mjs \
  "      m.visible = false;
      const fp = cp.footprint(a);" "      const fp = cp.footprint(a);"
run "L #368 の canonical を 無視(住人の きもちを 自前で)" meguru-3d.mjs \
  "(a.expr && a.expr.emotion) || " ""
run "M stage 差を 一様 scale に(犬 08 = 犬 01 の 数字)" character-3d/spec.js \
  "        8: { archetype: Q, idlePose: 'sit', body: { len: 1.1, r: 0.37, chest: 1.22, hip: 1.0 }, head: { r: 0.38, squash: 0.9, snout: 0.22, snoutR: 0.17 }, legs: { len: 0.42, r: 0.11 }, neck: 0.12," "        8: { archetype: Q, idlePose: 'lie', body: { len: 0.95, r: 0.42, chest: 1.0, hip: 0.95 }, head: { r: 0.46, squash: 0.92, snout: 0.16, snoutR: 0.17 }, legs: { len: 0.22, r: 0.11 }, neck: 0.08,"
