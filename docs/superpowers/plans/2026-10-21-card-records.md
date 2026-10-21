# CARD GAME Records Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; whole-branch independent review before delivery.

**Goal:** 保存互換性と既存実績を保護した戦績・デッキ・カード統計とiPhone試遊版。
**Architecture:** read-only engine evidence → immutable match contributions → idempotent local journal → modal summaries.
**Tech Stack:** native ES modules / localStorage / node:test / existing DOM harness.
**Spec:** docs/superpowers/specs/2026-10-21-card-records.md

## Global Constraints
- main/production Pagesを変更しない。452 cards/rules/art/CPU policy/本編は変更しない。
- 勝率は引分を分母に含める。CPU個人とhotseat席別を分離。
- 不正なimport、容量、破損で既存保存を失わない。

## Review Focus
- 同じ終了対戦の複数タブ・再読込・別URLからの再取り込み
- 同じIDで内容が異なるバックアップ
- デッキ名/構成を編集した後の古い対戦復帰
- チュートリアル/未決着/CPUの非公開情報が混入しないこと
- storage quotaと破損を成功と表示しないこと

### Task 1: Record model and storage
- [x] tests/records.test.mjsで決着/引分/二重計上/デッキsnapshot/カードplay/全452ゼロ表示をRED確認。
- [x] records.mjs: buildRecord(state,metadata), validateJournal, summarize, RecordsStore(record/import/export/recover)。同一ID衝突/容量/破損の検証。
- [x] node --test prototypes/card-game/tests/records.test.mjsをGREEN。
### Task 2: Save envelope and app integration
- [x] tests/records-match.test.mjsでCPU/hotseat/旧セーブ/metadata改変拒否をRED確認。
- [x] records-match.mjsのencodeMatch/decodeMatch。app新規開始のsnapshot・persist完了時記録・復帰/export/import接続。
- [x] 両専用suiteとCPU/セーブ既存テスト。
### Task 3: UI and delivery
- [x] DOM harnessで戦績ボタン/5区分/カード詳細/読込/学習共存をRED確認。
- [x] records-ui.mjs, records.css, collection-ui.mjs: responsive dialog、タブ、空状態、最近200戦、JSON、カード検索・ランキング・detail。
- [x] 重点suite/DOM/Pages梱包、独立レビュー、必要な修正。
- [ ] git commit/push Draft PR、Sites owner-private試遊公開、配信検証。
