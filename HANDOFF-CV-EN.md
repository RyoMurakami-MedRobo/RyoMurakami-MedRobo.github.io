# 英語版CV・自動同期 引き継ぎ資料

作成日: 2026-07-13

## 目的

日本語版に加えて英語版のCVページを作成し、アクセス元の国に応じて表示言語を切り替える。

- 日本からのアクセス: 日本語
- 日本以外からのアクセス: 英語
- 確認用: `?lang=ja` / `?lang=en`

## Repo構成

### 日本語CV原本

```text
RyoMurakami-MedRobo/-
├── main.tex
└── references.bib
```

### 英語CV原本

```text
RyoMurakami-MedRobo/CV_RyoMurakami
├── main.tex
└── references.bib
```

確認済みの英語Repo情報:

- private Repo
- default branch: `main`
- URL: `https://github.com/RyoMurakami-MedRobo/CV_RyoMurakami`
- `.github/workflows/trigger-pages-sync.yml` は存在する

## 公開Repo側の変更

以下はローカルで変更済みだが、まだcommit・pushされていない。

- `.github/workflows/sync-cv.yml`
- `README.md`
- `docs/index.html`
- `scripts/build-cv-public.mjs`
- `scripts/trigger-pages-sync.workflow.yml`

主な変更:

- 英語Repoから英語CVを取得
- `docs/uploads/cv-public-en.json` を生成
- 日本語／英語のページ文言を切り替え
- `ipapi.co/country/` で国コードを取得
- `?lang=ja` / `?lang=en` による手動切替
- 公開RepoのCV同期Actionを15分ごとにも実行
- 日本語・英語のどちらのCV更新でも同じActionで両方を再生成

## 必要なSecrets

### 公開Repo

`RyoMurakami-MedRobo/RyoMurakami-MedRobo.github.io` に必要:

```text
CV_REPO_PAT
```

このPATは以下のprivate Repoを読み取れる必要がある。

```text
RyoMurakami-MedRobo/-
RyoMurakami-MedRobo/CV_RyoMurakami
```

### 両方の原本Repo

以下を設定する。

```text
PAGES_REPO_TOKEN
```

このTokenは公開Repoに `repository_dispatch` を送れる必要がある。

## Macのターミナルで確認するコマンド

まず認証を確認:

```bash
gh auth status
```

英語Repoを確認:

```bash
gh repo view RyoMurakami-MedRobo/CV_RyoMurakami \
  --json name,owner,isPrivate,defaultBranchRef,url
```

英語Repoの同期Workflowを確認:

```bash
gh workflow view trigger-pages-sync.yml \
  --repo RyoMurakami-MedRobo/CV_RyoMurakami
```

英語RepoのSecret名を確認:

```bash
gh secret list \
  --repo RyoMurakami-MedRobo/CV_RyoMurakami
```

公開RepoのSecret名を確認:

```bash
gh secret list \
  --repo RyoMurakami-MedRobo/RyoMurakami-MedRobo.github.io
```

Secretの値そのものは表示されない。名前だけ確認できればよい。

## 次に行うこと

### 1. Workflow内容を確認

英語RepoのWorkflowに、少なくとも以下が含まれていることを確認する。

```yaml
on:
  push:
    branches: [main]
    paths:
      - main.tex
      - references.bib
      - references_*.bib
```

### 2. Secretsを確認

以下の3箇所にSecretが存在することを確認する。

- 日本語Repo: `PAGES_REPO_TOKEN`
- 英語Repo: `PAGES_REPO_TOKEN`
- 公開Repo: `CV_REPO_PAT`

### 3. 公開Repoの変更をcommit・push

```bash
cd /Users/ryo/Documents/GitHub/RyoMurakami-MedRobo.github.io

git status
git diff --check

git add .github/workflows/sync-cv.yml \
  README.md \
  docs/index.html \
  scripts/build-cv-public.mjs \
  scripts/trigger-pages-sync.workflow.yml \
  HANDOFF-CV-EN.md

git commit -m "Add English CV and automatic language selection"
git push origin main
```

### 4. 初回同期を手動実行

```bash
gh workflow run "Sync public CV JSON" \
  --repo RyoMurakami-MedRobo/RyoMurakami-MedRobo.github.io
```

実行状況:

```bash
gh run list \
  --repo RyoMurakami-MedRobo/RyoMurakami-MedRobo.github.io \
  --workflow sync-cv.yml \
  --limit 5
```

失敗時のログ:

```bash
gh run view RUN_ID \
  --repo RyoMurakami-MedRobo/RyoMurakami-MedRobo.github.io \
  --log-failed
```

### 5. 生成ファイルを確認

```bash
gh api repos/RyoMurakami-MedRobo/RyoMurakami-MedRobo.github.io/contents/docs/uploads/cv-public-en.json \
  --jq '.path'
```

次のファイルが存在すれば英語CVの生成は成功:

```text
docs/uploads/cv-public-en.json
```

## ページ確認

```text
https://ryomurakami-medrobo.github.io/?lang=ja
https://ryomurakami-medrobo.github.io/?lang=en
```

## 重要な注意

このCodex実行環境では `api.github.com` へのネットワーク接続が制限されていたため、Mac側で成功した `gh` コマンドの結果を確認しながら進める必要がある。

GitHub Actionsの自動同期にはChatGPTのGitHub連携は不要。必要なのは、各RepoのWorkflowとSecrets、そして公開Repo側の変更のpushである。
