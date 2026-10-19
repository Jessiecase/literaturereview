# 文獻整理教室

一般文獻學生整理表單、教師監考、雲端草稿與表格版 Word／Excel 答案匯出。

目前公開範圍僅包含一般文獻整理；後續維護請維持此發布範圍。

## 使用網站

- [學生入口](https://jessiecase.github.io/literaturereview/)
- [一般文獻整理](https://literature.huang-shihtzu.chatgpt.site/literature)
- [統一教師監考](https://literature.huang-shihtzu.chatgpt.site/literature-teacher)

教師使用課程指定密碼，密碼不存放於此儲存庫。學生以原瀏覽器續填；每份紀錄整理一篇文章。

## GitHub Pages

`docs/index.html` 保留學生入口的介面，連到目前運作的學生與教師網站。在儲存庫的 **Settings → Pages → Source** 選擇 **GitHub Actions**，執行 `Publish literature review entry` workflow 即可發布入口。

GitHub Pages 只提供靜態網站，無法執行本專案的 D1 資料庫及教師驗證 API。學生作答、即時監考與既有紀錄仍由上列正式網站服務；入口頁不會把學生資料或教師密碼存入 GitHub。若只需從分支發布，也可選擇 main 的 `/docs` 目錄作為 Pages 來源。

## 一般文獻網站原始碼

本儲存庫同時包含可獨立重建文獻整理網站的原始碼。它沒有綁定現有網站 ID、資料庫內容或正式密碼。

- `public/`：學生表單、教師監考、Word／Excel 匯出。
- `app/api/literature`：學生儲存、教師驗證與繳交鎖定。
- `database/schema.sql`：一般文獻資料表。
- `tests/`：Office 匯出與本機 API 測試。

### 本機執行

需要 Node.js 22.13 以上及 pnpm 11：

```sh
pnpm install --frozen-lockfile
```

在忽略的 `.dev.vars` 設定本機教師密碼，鍵名為 `TEACHER_KEY`，接著執行：

```sh
pnpm dev --host 127.0.0.1 --port 3012
```

學生入口 `/review`，教師入口 `/literature-teacher`。資料會存入本機模擬資料庫，與正式網站不同。

### 驗證

```sh
node tests/export-smoke.mjs
pnpm build
```

若已啟動本機伺服器，以本機教師密碼執行 API 測試：

```sh
REVIEW_TEST_URL=http://127.0.0.1:3012 REVIEW_TEST_KEY=本機測試密碼 node tests/api-e2e.mjs
```

API 測試只接受 localhost，會新增虛構測試資料。

### 重新部署後端

使用支援 Cloudflare Workers 與 D1 的部署環境，建立真實 D1 `DB` 綁定及執行期秘密 `TEACHER_KEY`。`.openai/hosting.json` 僅供新的 Sites 部署設定；先由對應工具建立網站並寫入返回的 project_id。全零資料庫 ID 僅供本機模擬，不能拿來當正式資料庫。部署完成後再更新 `docs/index.html` 的正式網站連結。
