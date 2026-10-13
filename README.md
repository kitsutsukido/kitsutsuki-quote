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

## ログインと設定の共有(Cloudflare Workers + KV)

スプレッドシートのURL・合言葉は、Googleログインすると全部の端末で共有されます(見積もりなどのデータ本体は従来どおり各端末のlocalStorage)。
仕組みは在庫管理アプリと同じで、`worker/index.js`が`/api/*`(ログイン・KV)を処理し、それ以外は`dist`の静的ファイルを返します(`wrangler.jsonc`)。

- KVは在庫管理アプリと同じnamespaceを共有。このWorkerは`zk-quote:`で始まるキーしか読み書きできません。
- Cloudflareダッシュボード(Workers → kitsutsuki-quote → 設定 → 変数とシークレット)に、**シークレット**として次の3つを登録:
  - `GOOGLE_CLIENT_ID` … 在庫管理アプリと同じクライアントID
  - `ALLOWED_EMAILS` … 許可するメール(カンマ区切り)。未設定だと誰もログインできません
  - `SESSION_SIGNING_SECRET` … ランダムな長い文字列(32文字以上)
- Google Cloud Console → 認証情報 → 該当のOAuthクライアント → 「承認済みのJavaScript生成元」に `https://kitsutsuki-quote.kitsutsukido.workers.dev` を追加。
- ローカルで試すときは `.dev.vars`(gitignore済み)に上の3つを書いてからwranglerのdevを起動。
