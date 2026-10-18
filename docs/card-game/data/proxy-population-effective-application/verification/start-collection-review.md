# 開始時source collectionの別条件照合

基準ffec94f6823c08cccd6b20f428d6efe61a50a393。現行contract_scopeだけの追補。

C-chicken/I-bowtieの開始時occurrenceをproducerと同じreplayから両方消すと、validate_openingが受理するREDを確認した（ValueError not raised）。初回はtoolsのPYTHONPATH不足でimport errorとなり、これはREDではない。

trigger_predicates.scopeでstarts.collectを包み、公開source全件から条件とclassification/occurrenceを別に再構成する。開始後の手札2枚条件、C-chickenの空山札でも成立、所属slot、現在境界、capture/public source一致、catalog/hashを照合。実開始の起点認証と共有public_sources自体の独立証明は別責務。既存proof形と履歴は変更しない。scope終了時は元の関数を復元する。

欠落/重複/actor/origin/source/classification/hash/capture改変、開始後手札3枚と空山札、scope復元を検査。固定Python関連34件PASS 2.901s、runner3.134s、exit0。docs再帰Pythonの前後指紋一致（start-collection-verification.json.gz）。raw logはstart-collection-related.log。独立レビュー1回C0/I0/Minor0、別実行10件PASS。全proxy回帰ではない。

preflight-ready=false。P09の開始時source collection欠落を閉じたが、最終機会/情報/operand/認証gateの合成は残る。生成/本番固定/400戦0、policy promotion=false、独立balance標本0。過去結果を昇格しない。
