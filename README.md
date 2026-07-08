# RyoMurakami-MedRobo.github.io

村上 遼のポートフォリオサイト（GitHub Pages）。

- 公開 URL: https://ryomurakami-medrobo.github.io/
- サイト本体: [`docs/index.html`](docs/index.html)
- 公開 CV データ: [`docs/uploads/cv-public.json`](docs/uploads/cv-public.json)

## CV の更新方法

原本（`main.tex` / `references.bib`）は非公開 Repo `RyoMurakami-MedRobo/-`（業績リスト）で管理します。

1. 非公開 Repo で原本を更新して `main` に push
2. GitHub Actions が公開用 JSON を生成してこの Repo に反映
3. GitHub Pages が自動デプロイ

手動同期: Actions → **Sync public CV JSON** → Run workflow

## Secrets（設定済み）

| Repo | Secret | 用途 |
|------|--------|------|
| `RyoMurakami-MedRobo.github.io` | `CV_REPO_PAT` | 非公開 Repo の読み取り |
| `RyoMurakami-MedRobo/-` | `PAGES_REPO_TOKEN` | 公開 Repo への sync トリガー |