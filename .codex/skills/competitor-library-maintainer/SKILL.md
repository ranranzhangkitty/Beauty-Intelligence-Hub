---
name: "competitor-library-maintainer"
description: "Ranran の競合情報アプリ「竞品情报库 / Competitor Library / Beauty Intelligence Hub」(単一 index.html、GitHub + Vercel、localStorage + Supabase) を保守・拡張するスキル。「竞品を追加して」「加个竞品」「レイアウトを変えたい」「PPTX出力を直して」「Team Feedback / Supabase のコメント機能」「Wishlist / 想看的竞品 / 需求表」「ranran-beauty-hub を編集」等と言われた時に使用する。&honey・HONEYQUE・8 THE THALASSO・L'Oréal Scalp Advanced・CÉCRED 等の製品追加や、index.html の改修依頼にも、リポジトリ名に言及がなくても美容競合分析アプリの文脈なら使用する。編集済み index.html を出力する。"
metadata:
  version: "1.5.1"
  suggested_tools: "web_search, web_fetch, bash, create_file, view, str_replace"
---

# Competitor Library Maintainer

## Overview

対象は単一ファイル (`index.html`) の master-detail Web アプリ。左サイドバーに製品サムネイル (固定 130px、横長、名前は 2 行でクランプ)、全製品を一覧する "Grid Overview" トグル、詳細ビューは media カラム (画像ギャラリー / 6 つの info chips / Price Positioning カード / Team Feedback) と content カラム (バイリンガル分析) の 2 分割。ビルド工程なし。製品データは JS の `DEFAULTS` 配列にあり、ブラウザごとに localStorage にキャッシュされる。Team Feedback のコメントと Wishlist (想看的竞品) だけはこのファイルに存在せず、共有 Supabase テーブルに保存される (localStorage はブラウザ単位なので「同僚が書いた内容が自分にも見える」を実現できないため)。

## 読者と立場 (すべての執筆の前提)

このライブラリを読むのは **Ranran と同僚 = 日本のヘアケアメーカー (J-beauty、代表ブランドは HONEYQUE と &honey) の新製品開発・企画担当**。

競合を紹介するための資料ではなく、**自社の次の製品判断に使うための材料**。

したがって分析文は常に：

「この事実は自社の処方・価格・訴求・表示にどう効くか」

という立場で書く。

第三者の解説者としてまとめない。

特に `whyPick` (WHY WE PICKED IT) はこの立場が最も強く出るフィールドで、`references/writing_style.md` の専用ルールに従う。

## 重要な前提

- このドキュメントはスナップショットでありライブ同期ではない。
- 必ず現在の index.html を確認してから編集する。
- GitHub push、Supabase直接書込み、Vercelデプロイは行わない。
- 必ず：
  1. 編集
  2. 検証
  3. ファイル出力
  4. ユーザー自身がpush

で終了する。

## 使用条件

以下の場合に使用する：

- 競合製品追加
- 競合分析更新
- UI変更
- PDF/PPTX export修正
- Team Feedback
- Wishlist
- Beauty Intelligence Hub関連変更

## Mode Selection

|依頼|読むreference|
|-|-|
|競合追加|add_product.md|
|UI変更|ui_layout.md|
|PPTX/PDF|pptx_export.md|
|Supabase Feedback|supabase_feedback.md|
|Wishlist|wishlist.md|
|文章改善|writing_style.md|
|テスト|testing.md|

## Workflow

### 1. index.htmlを取得

ユーザー添付ファイルを優先。

無い場合のみGitHub clone。

古いコピーは禁止。

---

### 2. 現状確認

推測変更禁止。

必ずgrep等で現在実装確認。

---

### 3. DEFAULTS編集

JSONを直接文字置換しない。

必ず：

parse

↓

modify

↓

serialize

する。

---

### 4. localStorage version更新

DEFAULTS変更時は必ずKEY versionを上げる。

理由：

localStorageはブラウザに残り続けるため。

---

### 5. 並び順

製品表示は：

