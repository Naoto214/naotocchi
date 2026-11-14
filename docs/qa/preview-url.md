# branch / PR を iPhone で ためす(main に merge しない)

production の GitHub Pages(`main` → https://naoto214.github.io/naotocchi/)は さわらない。
公開 repo の **commit** を、GitHub の ファイルを そのまま くばる CDN から ひらく。commit で 固定する ので、人が 見て いる あいだに 中身が かわらない。

```
sh tools/preview-url.sh <commit または branch>
```

出る URL(3 つの CDN・中身は おなじ commit。どれかが ひらかなければ つぎ):

- `https://cdn.jsdelivr.net/gh/naoto214/naotocchi@<sha>/index.html?meguru3d=1&perf=1`
- `https://rawcdn.githack.com/naoto214/naotocchi/<sha>/index.html?meguru3d=1&perf=1`
- `https://cdn.statically.io/gh/naoto214/naotocchi/<sha>/index.html?meguru3d=1&perf=1`

ながれ: branch を push → `sh tools/preview-url.sh <branch>` → iPhone で ひらく → 人が 判断 → main へ merge。

きをつける こと:
- セーブは その CDN の origin の localStorage に 入る(production の セーブとは べつ。production は かわらない)。おなじ CDN の ほかの ページとは origin を 共有する ので、ためしの セーブと おもって あつかう
- CDN の cache は commit 固定なら ずっと。branch 名で ひらいた ときは 数時間 ふるい ことが ある ので、commit の sha で ひらく
- けす: なにも おいて いない(repo の commit を 読む だけ)。branch を けせば branch 名の URL は きえる。commit の URL は その commit が repo に ある あいだ ひらける
- アプリは 相対パス だけ・service worker なし なので、どの origin / サブパス でも うごく
