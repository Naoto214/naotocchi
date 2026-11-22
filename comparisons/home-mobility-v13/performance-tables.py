"""Render both run orders, workload counters, WPE phase timings, and input denominators."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def arm(row):
    return row["arm"].replace("v13-", "").upper()


def label(row):
    return (str(row["width"]), "通常" if row["order"]=="forward" else "逆", arm(row))


def table(headings, rows):
    return "\n".join("| " + " | ".join(str(c) for c in cells) + " |"
                     for cells in (headings, ["---"]*len(headings), *rows))


def fmt(x):
    return f"{x:,.1f}".removesuffix(".0")


def main(path):
    j = json.loads(path.read_bytes())
    output = [
        "# 森の28体で測ったフレーム間隔と指の応答",
        f"LinuxのWebKit（WPE {j['browser']}）で森・昼・秋・晴れ・28体・サイズBを測った。幅320pxと390px、高さ792 CSS px、DPR 2。各ジョブ内ではV12、A、B、C、Dの順か、逆の順で各版を比較した。通常／逆は別々のGitHubランナー。乱数214、全版で同じ原画・住民設定と環境演出を使用した。A〜Dは直線の道譲り、V12は曲がる道譲りを含む基準。曲がる道譲りの安全性・追加効果は10分間の公平性検証にある。",
        "## 通常再生",
        "各版で新しいWebKitを起動し、8秒予熱後に180実秒間、通常のフレーム通知を観測した。停止回数はしきい値を厳密に超えた間隔の数。セッションごとの生活内容は異なる。表のイベント数は観測中に届いたホームの反応イベントで、交流の有無や住民の活動を性能とともに記録した。",
        table(["幅","順","版","中央値 / p95 / p99 / 最大 ms","250 / 500 / 1,000 ms超","モデル秒","移動開始","距離（地形px）","反応"],[
            (*label(r), " / ".join(fmt(r["frames"][k]) for k in ("p50","p95","p99","max")),
             " / ".join(str(r["frames"][k]) for k in ("over250","over500","over1000")),
             fmt(r["modelSeconds"]),r["moves"],fmt(r["distance"]),sum(r["events"].values())) for r in j["live"]]),
        "V12の既存390px記録は通常順／逆順でp95が54／197ms、最長207／516ms。今回の同一ランナー上に置いたV12対照との比較を優先する。異なる実行順・ランナーの差を案の恒常的な性能差とは判断できない。",
        "## 経路・住民更新・描画",
        "別の40実秒のトレースで、各関数の開始から終了までを計測した。括弧内は1回の最大値（ms）。親子の関数は時間が重なる。Webメイン・ラスター・合成は別途、同じ版の180秒通常再生でLinuxの /proc スレッドスケジューラーから求めたCPU秒。ラスターはllvmpipe・Skia CPUスレッドの合計、合成は名前にcompositorを含むスレッドの合計で、複数スレッドのCPU時間が重なる。",
    ]
    def cost(row,k):
        val = row["parts"].get(k)
        return f"{fmt(val['ms'])} ({fmt(val['max'])})" if val else "呼出0"
    def cpu(row):
        return " / ".join(fmt(row["cpuMs"][k]/1000) for k in ["main","raster","compositor"])
    by = {label(r):r for r in j["live"]}
    output.append(table(["幅","順","版","経路 plan 合計 (最大) ms","近距離経路 合計 (最大) ms","住民 step 合計 (最大) ms","住民 paint 合計 (最大) ms","背景 draw 合計 (最大) ms","通常 Webメイン / ラスター / 合成 CPU秒"],[
        (*label(r),*[cost(r,k) for k in ("route","localIntentRoute","step","paint","world")],cpu(by[label(r)])) for r in j["trace"]]))
    output += ["## 同一動作、同一描画時刻",
        "各幅で全版へ同じ480コマを入力した。最初の48コマとクリップ切替直後を除く378間隔／版・順序・シーン。自然歩行テープはその幅のモデルから採取した実際の区間。高負荷テープは個々の歩行区間を重ねて作った描画専用の場面で、歩行経路の安全評価には使わない。全28体、背景、各コマの環境描画回数・時刻、アニメーション対象・位相、選択時のキーフレームを照合した。通常再生には、自律経路の計算や、そのとき選ばれた活動による描画も含まれる。",
        table(["幅","順","版","テープ（最大同時移動）","中央値 / p95 / p99 / 最大 ms","250 / 500 / 1,000 ms超","Webメイン / ラスター / 合成 CPU秒"],[
            (*label(r),f"{name}（{r['maxMoving']}体）"," / ".join(fmt(r["frames"][k]) for k in ("p50","p95","p99","max")),
            " / ".join(str(r["frames"][k]) for k in ("over250","over500","over1000")),cpu(r)) for suite,name in [("fixed","自然"),("stress","高負荷")] for r in j[suite]]),
        "## ネイティブのタッチから歩行開始まで",
        "各幅のV12で同じ9体から押せる位置を求め、同じ画面座標を全版・両順へ送った。WebKitのネイティブ入力経由でisTrustedを確認した。開始遅延は指を離したイベント時刻から、対象の描画足が1 CSS px以上動くまで。5秒の観測窓内で開始できた入力だけで遅延を算出した。到着は成立した経路の終点から0.3px以内を示す。",
        table(["幅","順","版","送信 / 対象選択 / 開始 / 到着","開始中央値 / p95 / 最大 ms"],[
            (*label(r)," / ".join(str(r[k]) for k in ("issued","selected","moved","arrived")),
             " / ".join(fmt(r["onset"][k]) for k in ("p50","p95","max")) if r["onset"] else "開始0") for r in j["touch"]]),
        "## 再現と適用範囲",
        f"検証ソースは `{j['commit']}`。公式ジョブのZIPを個別にSHA-256・バイト数と照合し、各版が実際に読んだHTML／モデル／描画／歩行領域のフィンガープリントを保存した。生ZIPがあるディレクトリと生成済みgameを performance-report.py へ渡すと機械可読の集計・CSVを再作成できる。320pxテープの再採取にはperformance-tape.py、390pxはV10で保存した2本の原本を使用する。 [計測CI]({j['url']}) ／ [集計・SHA-256](evidence/performance.json) ／ [フレーム統計CSV](evidence/performance-frames.csv)",
        "iPhone実機のSafariでの描画・物理タッチ・GPU時間・発熱は未検証。Linux WPEのCPU集計からiPhoneのGPU負荷や発熱を推定していない。"]
    (HERE/"PERF.md").write_text("\n\n".join(output)+"\n")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
