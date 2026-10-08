# main_movement価格レビュー

Base ec3c5de872ffcbdc1b5f1f56ba733a87fd914c4e。独立read-only1回 C0/I0/Minor2。Source02のstage/delta、06の最終0、91の消費に一致。既存main_movement正常routeの新規誤拒否なし。focused7PASS2.485s。

Minor未完: 非行動側before.time=True/after.time=1が単独監査を通る（外側state.validateとは別）。正の割引支払stage8→6、不足時の専用testも未追加。台帳P11に保持。general payment_amount_proven=false。

P22新発見: M-antlion-01はlegacy play_main_birthでcandidate_variant/payment_effect_idsなし、今回は監査対象外。transform候補はあるが既存legacy executorが拒否する。分類器batch.classificationはM01未登録。rules.classificationには正本55の既存記述あり。新handlerを一から作らず次工程で既存経路を結合する。

RED2tests7fail（実金額/時間偽装と新証明flagなし）、GREEN13PASS、最終関連46PASS7.960s・固定Python結合19PASS149.113s。design errors=[]、476不変。npmは直前bundle406PASS、今回再実行なし。新seed/lock/400戦0、preflight-ready=false。
