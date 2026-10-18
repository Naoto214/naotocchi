#!/bin/sh
# めぐる Resident Expression の remove-it: 接続点を 1 か所ずつ こわして、専用テストが 赤に なる ことを たしかめる。
#   sh tools/meguru-resident-expression-remove-it.sh
# 作業ツリーに コミットして いない 変更が ある と もどせない ので、きれいな 状態で はしらせる(git checkout -- で もどす)
set -u
cd "$(dirname "$0")/.."
TEST=tests/meguru-resident-expression-test.cjs
if [ -n "$(git status --porcelain -- meguru.js meguru-3d.mjs resident-expression.js)" ]; then echo "commit or stash meguru.js / meguru-3d.mjs / resident-expression.js first"; exit 2; fi
run() { # name file python-replacement
  name="$1"; file="$2"; old="$3"; new="$4"
  python3 - "$file" "$old" "$new" <<'PY'
import sys
p,old,new=sys.argv[1:4]
s=open(p,encoding='utf-8').read()
assert s.count(old)==1, f'{p}: pattern not unique/found: {old[:60]!r}'
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
run "A mapping: positive → normal(stage)" resident-expression.js \
  "stage: Object.freeze({ normal: 'normal', positive: 'happy'," "stage: Object.freeze({ normal: 'normal', positive: 'normal',"
run "B mapping: dislike → happy(semantic mismatch)" resident-expression.js \
  "dislike: 'sulky'," "dislike: 'happy',"
run "C resolver: stage family never asks Home assetFor" resident-expression.js \
  "      const asset = PET.assetFor(base, expression);" "      const asset = base;"
run "D fallback: keep the wrong face on fallback (silent)" resident-expression.js \
  "      out.expression = 'normal'; out.asset = out.base;   // production: ちがう 顔を 出さず「ふつう」へ" "      /* mutated */"
run "E strict: never throw" resident-expression.js \
  "      if (strict) throw new Error(\`resident expression missing:" "      if (false) throw new Error(\`resident expression missing:"
run "F sync: re-resolve every call (no identity cache)" resident-expression.js \
  "    if (cur && cur.emotion === emotion && cur.base === base) return cur;" "    /* mutated */"
run "G dialogue: emotion line ignored" meguru.js \
  "      if (X && a.emotion && a.emotion !== 'normal') { const line = X.dialogueFor(X.canonicalEmotion(a.emotion), pick); if (line) return line; }" "      /* mutated */"
run "H temporary reaction never expires" meguru.js \
  "      if (a.joy > 0) a.joy -= dt;" "      /* mutated */"
run "I reaction end → normal instead of persistent" meguru.js \
  "      a.emotion = persistent === 'sleeping' ? 'sleeping' : (reaction || persistent);" "      a.emotion = persistent === 'sleeping' ? 'sleeping' : (reaction || 'normal');"
run "J reset: flag-off leaves stale expr" meguru.js \
  "      if (!X) { if (a.expr) a.expr = null; return null; }" "      if (!X) { return null; }"
run "K talk event: pester never dislikes" resident-expression.js \
  "    if (sinceLastTalk < PESTER_SEC) return 'talk_pester';" "    /* mutated */"
run "L spriteFor ignores expr (renderer never sees faces)" meguru.js \
  "return { asset: a.expr && a.expr.asset ? a.expr.asset : base, base, flip:" "return { asset: base, base, flip:"
run "M 2D loading fallback removed" meguru.js \
  "        const im = imageFor(sprite.asset) || (sprite.base && sprite.base !== sprite.asset ? imageFor(sprite.base) : null);" "        const im = imageFor(sprite.asset);"
run "N 3D billboard base fallback removed" meguru-3d.mjs \
  "    for (const asset of [s && s.asset, s && s.base]) {" "    for (const asset of [s && s.asset]) {"
run "O new world inherits config-less (expressions silently off)" meguru.js \
  "        world.expr = exprCfg;   // 新しい せかいの 住民は expr なし から はじまる(まえの 地域の 表情は もちこまない)" "        /* mutated */"
run "P sick fires without illness (persistent tired → sick)" meguru.js \
  "        else if (a.energy < 0.22) persistent = 'tired';" "        else if (a.energy < 0.22) persistent = 'sick';"
