# 223 新seed混合選択監査計画

222のcanonical候補と221のstate/hashを照合する。専用テストをREDにし、応答の唯一選択、seed fallback、通常行動の107/114優先比較を実装してGREENとする。新eventは作らない。カード本文・保護履歴は保持し、次区切りで選択をstateに適用する。
