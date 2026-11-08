# 音源・権利情報

## 採用した楽器サンプル

- VSCO 2 Community Edition（Versilian Studios / Sam Gossner）。アップライトピアノは Ivy Audio / Simon Dalzell。公式ページ: https://versilian-studios.com/vsco-community/
- 公式配布元はCC0（パブリックドメイン提供）を明記しています。今回のサンプルは公式GitHub `sgossner/VSCO-2-CE` の固定コミット `440300901dfe9275fd84e0b7763af1f8443ae62e` から取得しました。
- 取得URL・バイト数・SHA-256は `samples/manifest.json`。配布元のReadme、ピアノInfo/MappingChartも保存しています。再取得: `python tools/fetch-samples.py`。
- 出典を明記し、サンプル単体の販売を目的としません。音源を外部サービスへ送信して生成したものではありません。
- A/Bは公開された楽器録音のサンプルを再生・移調・混合した打ち込みです。今回、人が新たに生演奏を録音したものではありません。少数の音程・単一の弱音レイヤーを中心に使うため、専用音源の多段階サンプリングほどの表現力はありません。

## 検討した代案

GeneralUser GSは作者のライセンスが音楽制作・商用利用を許可していますが、一部サンプルの由来を完全に把握していない旨も記載されています。今回はCC0の公式サンプルに絞りました。https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/LICENSE.txt

## 元曲・制作物

原曲の帰属は既存作品のまま。#524/#526/#527/#528/#529 の元データに変更を加えていません。原曲比較は#529のエンジンでレンダリングし、比較時だけ音量補正とループ用の余韻折返しを行います。原曲WAV保存は折返し・音量補正を行わない元エンジンの出力です。

MIDIは演奏イベントの交換用であり、同じサンプルを含みません。別のソフトで開いた場合は音色・音量が異なります。A/Bの公開音源はAAC 128kbps / 32kHz、原盤はFLAC 16bit / 32kHz。スマートフォンの帯域とメモリを考慮した仕様であり、ハイレゾ音源とは称しません。

使用ツール: Python/NumPy/SciPyによるオフライン・サンプラー、FFmpegによる音量測定・AAC/FLAC変換、既存Web Audioエンジン、ブラウザーWeb Audio API。ランタイムに外部の有料音源や音楽APIは必要ありません。これらのツールのバイナリ自体は本PRに同梱しません。
