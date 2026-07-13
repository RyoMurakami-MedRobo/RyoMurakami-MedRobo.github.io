# RyoMurakami-MedRobo.github.io

村上 遼のポートフォリオサイト（GitHub Pages）。

- 公開 URL: https://ryomurakami-medrobo.github.io/
- サイト本体: [`docs/index.html`](docs/index.html)
- 公開 CV データ（日本語）: [`docs/uploads/cv-public.json`](docs/uploads/cv-public.json)
- 公開 CV データ（英語）: [`docs/uploads/cv-public-en.json`](docs/uploads/cv-public-en.json)

## CV の更新方法

原本は言語ごとに別Repoで管理します。

- 日本語: `RyoMurakami-MedRobo/-` の `main.tex` / `references.bib`
- 英語: `RyoMurakami-MedRobo/CV_RyoMurakami` の `main.tex` / `references.bib`

1. いずれかの非公開Repoで原本を更新して `main` に push
2. GitHub Actions が両Repoから公開用JSONを生成してこのRepoに反映
3. GitHub Pages が自動デプロイ

両方の非公開Repoには [`scripts/trigger-pages-sync.workflow.yml`](scripts/trigger-pages-sync.workflow.yml) を `.github/workflows/trigger-pages-sync.yml` として配置します。さらに公開Repo側の同期Actionは15分ごとにも実行されるため、片方のpush通知が失敗しても更新を取りこぼしにくくしています。

表示言語はアクセス元の国コードを取得し、日本からのアクセスは日本語、それ以外は英語になります。確認用に `?lang=ja` / `?lang=en` で固定表示できます。

手動同期: Actions → **Sync public CV JSON** → Run workflow

## 匿名メッセージ（オプション）

サイトから匿名でメッセージを送れる機能です。受信は非公開 Repo `inbox` の GitHub Issue に届きます。

| 要素 | 場所 |
|------|------|
| フォーム UI | [`docs/index.html`](docs/index.html)（`#message` でも開けます） |
| 中継 API | [`workers/inbox/`](workers/inbox/)（Cloudflare Worker） |
| 受信箱 | 非公開 Repo `RyoMurakami-MedRobo/inbox` |

セットアップ手順: [`workers/inbox/README.md`](workers/inbox/README.md)

Worker URL（設定済み）: `https://murakami-inbox.ryomurakami-medrobo.workers.dev`

## Secrets（設定済み）

CV 同期は期限切れしない Deploy Key で動作します（PAT 不要）。

| Repo | Secret | 用途 |
|------|--------|------|
| `RyoMurakami-MedRobo.github.io` | `CV_DEPLOY_KEY_JA` | 日本語 CV Repo の読み取り |
| `RyoMurakami-MedRobo.github.io` | `CV_DEPLOY_KEY_EN` | 英語 CV Repo の読み取り |
| `RyoMurakami-MedRobo/-` | `PAGES_DEPLOY_KEY` | 公開 Repo への sync トリガー push |
| `RyoMurakami-MedRobo/CV_RyoMurakami` | `PAGES_DEPLOY_KEY` | 公開 Repo への sync トリガー push |

Cloudflare Worker 側（Wrangler secrets）:

| Secret | 用途 |
|--------|------|
| `GITHUB_TOKEN` | 非公開 `inbox` Repo への Issue 作成 |
