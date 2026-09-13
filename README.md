# 謎文具キツツキ堂見積台帳

謎解きグッズの印刷見積もり・入稿管理・収支計算をまとめて扱う社内向けツール。

## 構成

単一ファイルだったプロトタイプ (`quote-app.jsx`) を、機能ごとに分割して育てやすい構成にしています。

```
src/
  data/        初期データ(商品・案件・梱包グループ・見積もりセッション・明細など)
  lib/         ドメインロジック(仕様文字列生成、損益分岐点計算、案件サマリ集計、色定義)
  components/  汎用UIパーツ(Chip, Field, 共通input style)
  features/
    sidebar/     案件一覧サイドバー
    dashboard/   ダッシュボード(進行中案件の一覧)
    quote/       見積もりタブ(セッション管理・梱包グループ表示・明細合計)
    lineItems/   明細の追加・編集フォーム
    submission/  入稿管理タブ(購入・入稿状況の管理)
    profit/      収支設定・損益分岐点タブ
  App.jsx      画面全体の組み立て
  main.jsx     エントリーポイント
```

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド
```
