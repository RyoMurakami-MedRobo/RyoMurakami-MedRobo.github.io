# murakami-inbox Worker

個人サイトからの匿名メッセージを、非公開 GitHub Repo の Issue として受け取る API です。

## 1. 非公開 Repo を作る

1. GitHub で **Private** Repo `RyoMurakami-MedRobo/inbox` を作成
2. **Settings → General → Features** で Issues を有効化

## 2. GitHub Token を発行

Fine-grained personal access token（推奨）:

| 項目 | 値 |
|------|-----|
| Repository access | Only `inbox` |
| Permissions | **Issues: Read and write** |

Classic PAT を使う場合は `repo` スコープ（対象 Repo のみに限定できない点に注意）。

## 3. Cloudflare Worker をデプロイ

```bash
cd workers/inbox
npm install

# 秘密情報を登録
npx wrangler secret put GITHUB_TOKEN

# （推奨）レート制限用 KV
npx wrangler kv namespace create RATE_LIMIT
# 表示された id を wrangler.toml の [[kv_namespaces]] に追記

npx wrangler deploy
```

デプロイ後に表示される URL（例: `https://murakami-inbox.<account>.workers.dev`）を、
`docs/index.html` の `INBOX_API_URL` に設定します。

## 4. ローカル開発

```bash
npx wrangler dev
# 別ターミナルでテスト
curl -X POST http://localhost:8787 \
  -H 'Content-Type: application/json' \
  -d '{"message":"テスト送信です"}'
```

## API

`POST /` — JSON body:

```json
{
  "message": "必須。最大 2000 文字",
  "name": "任意。最大 100 文字",
  "contact": "任意。最大 200 文字",
  "_hp": "honeypot。空のまま"
}
```

成功: `{ "ok": true }`  
失敗: `{ "ok": false, "error": "..." }`