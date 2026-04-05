# ObsiPage - Obsidian 用 Pages ビューアー

[English version](README.md)

Obsidian 上で Apple Pages（`.pages`）ファイルを直接プレビューできるプラグインです。

## 仕組み

Apple Pages のファイルは実は ZIP アーカイブで、保存時にドキュメントのスクリーンショット画像（`preview.jpg`）が自動的に含まれています。このプラグインはその埋め込み画像を取り出して Obsidian 内に表示します。外部ツールや変換は不要です。

```
.pages ファイル (ZIP)
  └── preview.jpg  ← このプラグインが取り出して表示
```

> **注意:** 表示されるのは最後に保存した時点のスナップショット画像です。テキストの選択や編集はできません。

## 機能

- **.pages ファイルのプレビュー** — Vault 内の `.pages` ファイルをクリックするだけで内容を確認可能
- **複数フォーマット対応** — モダン形式（iWork 2013 以降）とレガシー形式（iWork '08/'09）の両方に対応
- **フォールバック表示** — プレビュー画像がない場合、ドキュメント内の埋め込み画像を表示
- **Pages で開く** — ワンクリックで Apple Pages を起動して編集可能
- **シームレスなナビゲーション** — `.pages` ファイルと他のファイルを自由に行き来できる

## インストール方法

### 手動インストール

1. 最新リリースから `main.js`、`manifest.json`、`styles.css` をダウンロード
2. Vault の `.obsidian/plugins/` 内に `obsidian-pages-viewer` フォルダを作成
3. 上記 3 ファイルをそのフォルダにコピー
4. Obsidian を再起動
5. **設定 → コミュニティプラグイン** から **Pages Viewer** を有効化

### ソースからビルド

```bash
git clone https://github.com/tamo2918/ObsiPage.git
cd ObsiPage
npm install
npm run build
```

ビルド後、`main.js`、`manifest.json`、`styles.css` を Vault の `.obsidian/plugins/obsidian-pages-viewer/` にコピーしてください。

## 対応ファイル形式

| 形式 | 時期 | プレビューの場所 |
|------|------|-----------------|
| モダン iWork | 2013年〜現在 | `preview.jpg`（ルート直下） |
| レガシー iWork | 2008〜2012年 | `QuickLook/Thumbnail.jpg` または `QuickLook/Preview.pdf` |

## 技術的な概要

1. `.pages` 拡張子をカスタム `FileView` に登録
2. ファイルをバイナリとして読み込み、[JSZip](https://github.com/Stuk/jszip) で ZIP を展開
3. アーカイブ内の既知の場所からプレビュー画像を検索
4. 抽出した画像データを Blob URL に変換し、`<img>` 要素で描画

## ライセンス

MIT
