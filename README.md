# 📅 CalPush

**Google Calendar × Gmail × LINE 通知を5分でセットアップ**

CalPush は、Google カレンダーの予定通知・リマインダー、Gmail の着信通知を LINE に届けるオープンソースの通知ツールです。Google Apps Script (GAS) だけで動作し、サーバー不要・無料で利用できます。

## 主な機能

- **毎朝の予定通知** — 毎日 8:55 に当日のスケジュールを LINE に自動送信
- **5分前リマインダー** — 会議開始5分前に LINE でお知らせ
- **メール着信通知** — 指定ドメイン/アドレスからのメールを LINE に転送
- **LINE からスケジュール操作** — 予定の確認・追加・削除をチャットで
- **PC管理画面** — ブラウザから週間スケジュール管理・空き枠仮押さえ
- **セットアップウィザード** — 2つの情報を入力するだけで即利用開始

## クイックスタート

CalPushのデプロイには **2つの方法** があります。スマートフォンのみで完結させたい場合は「方法B」を推奨します。

---

### 方法A: clasp を使う（PC環境向け）

#### 必要なもの

1. Google アカウント
2. LINE Developers アカウント（無料）
3. [clasp](https://github.com/google/clasp)（GAS CLI ツール）

#### セットアップ手順

##### 1. LINE Bot を作成

1. [LINE Developers](https://developers.line.biz/) にログイン
2. 新規プロバイダー → 新規チャネル（Messaging API）を作成
3. 「Messaging API設定」→「チャネルアクセストークン」を発行してコピー

##### 2. Google Calendar ID を確認

1. [Google Calendar](https://calendar.google.com/) を開く
2. 左メニューのカレンダー名の「⋮」→「設定と共有」
3. 「カレンダーの統合」→「カレンダーID」をコピー

##### 3. CalPush をデプロイ

```bash
# リポジトリをクローン
git clone https://github.com/shimanto/calpush.git
cd calpush

# clasp でGASプロジェクト作成
clasp create --type webapp --title "CalPush"

# コードをプッシュ
clasp push --force

# ウェブアプリとしてデプロイ
clasp deploy --description "CalPush v1"
```

##### 4. 初期設定

1. デプロイURLをブラウザで開く
2. セットアップウィザードが表示される
3. **LINE Channel Access Token** と **Calendar ID** を入力
4. 完了！

##### 5. LINE Webhook を設定

1. LINE Developers → チャネル → 「Messaging API設定」
2. 「Webhook URL」にデプロイURLを貼り付け
3. 「Webhookの利用」を ON に
4. LINE Bot にメッセージを送信（USER_ID が自動保存されます）

---

### 方法B: clasp 不要・スマートフォンのみで完結

claspのインストールや認証作業が不要です。**GASエディタ** をブラウザで直接使います。

#### 必要なもの

- Google アカウント
- LINE Developers アカウント（無料）
- スマートフォン（ブラウザさえあれば可）

#### セットアップ手順

##### 1. LINE Bot を作成（方法Aと同じ）

1. [LINE Developers](https://developers.line.biz/) にログイン
2. 新規プロバイダー → 新規チャネル（Messaging API）を作成
3. 「Messaging API設定」→「チャネルアクセストークン」を発行してコピー

##### 2. Google Calendar ID を確認（方法Aと同じ）

1. [Google Calendar](https://calendar.google.com/) を開く
2. 左メニューのカレンダー名の「⋮」→「設定と共有」
3. 「カレンダーの統合」→「カレンダーID」をコピー

##### 3. GASプロジェクトを作成してコードを貼り付ける

1. [script.google.com](https://script.google.com/) をブラウザで開く
2. **「新しいプロジェクト」** をクリック
3. プロジェクト名を「CalPush」に変更

**`Code.gs` にコードを貼り付ける:**

1. 既存の内容を全選択して削除
2. このリポジトリの [`Code.js`](Code.js) の内容をコピーして貼り付け
3. 保存（Ctrl+S または ⌘+S）

**`appsscript.json` を編集する:**

1. 左メニュー「プロジェクトの設定」→「「appsscript.json」マニフェスト ファイルをエディタで表示する」をON
2. エディタに `appsscript.json` タブが出現
3. このリポジトリの [`appsscript.json`](appsscript.json) の内容で上書き

**`admin.html` を追加する:**

1. エディタ左の「＋」→「HTML」→ファイル名を `admin` と入力（`.html` は自動付与）
2. 既存の内容を全削除
3. このリポジトリの [`admin.html`](admin.html) の内容をコピーして貼り付け
4. 保存

##### 4. ウェブアプリとしてデプロイ

1. 右上「デプロイ」→「新しいデプロイ」
2. 歯車アイコン → **「ウェブアプリ」** を選択
3. 設定:
   - 説明: `CalPush v1`
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
4. 「デプロイ」をクリック → Googleアカウントの認証を許可
5. 表示された **ウェブアプリのURL** をコピー

##### 5. 初期設定（方法Aと同じ）

1. コピーしたURLをブラウザで開く
2. セットアップウィザードが表示される
3. **LINE Channel Access Token** と **Calendar ID** を入力
4. 完了！

##### 6. LINE Webhook を設定（方法Aと同じ）

1. LINE Developers → チャネル → 「Messaging API設定」
2. 「Webhook URL」にデプロイURLを貼り付け
3. 「Webhookの利用」を ON に
4. LINE Bot にメッセージを送信（USER_ID が自動保存されます）

---

### 方法C: GitHub Actions で自動デプロイ（コード変更をmobileから反映）

CalPushのコードを修正して再デプロイしたい場合に便利です。**一度だけPCでセットアップすれば、以後はスマートフォンのGitHubアプリからコード変更→自動デプロイ** が可能になります。

#### 初回セットアップ（PCで1回だけ）

##### 1. claspの認証情報を取得する

```bash
npm install -g @google/clasp
clasp login
cat ~/.clasprc.json  # この内容をコピー
```

##### 2. GASプロジェクトを作成して Script ID を取得する

```bash
git clone https://github.com/YOUR_USERNAME/calpush.git
cd calpush
clasp create --type webapp --title "CalPush"
cat .clasp.json  # "scriptId" の値をコピー
```

##### 3. GitHub Secrets に登録する

GitHubリポジトリ → **Settings → Secrets and variables → Actions** から以下を追加:

| Secret名 | 値 |
|---|---|
| `CLASPRC_JSON` | `~/.clasprc.json` の内容（JSON全体） |
| `CLASP_SCRIPTID` | `.clasp.json` の `scriptId` の値 |

##### 4. 初回デプロイを実行する

GitHubリポジトリ → **Actions → Deploy to Google Apps Script → Run workflow**

デプロイが完了したらウェブアプリURLをGASエディタで確認し、方法Bの手順5以降を実施してください。

#### 以後の更新フロー（スマートフォンのみ）

```
[GitHubモバイルアプリでコード編集]
    ↓ commit & push to main
[GitHub Actions が自動起動]
    ↓ clasp push + clasp deploy
[GASに自動反映 ✅]
```

## LINE コマンド一覧

| コマンド | 説明 |
|---------|------|
| `今日の予定` | 当日の予定一覧 |
| `明日の予定` | 翌日の予定一覧 |
| `予定追加 M/D HH:MM-HH:MM タイトル` | 時間指定で予定追加 |
| `予定追加 M/D タイトル` | 終日予定追加 |
| `予定削除 M/D タイトル` | 予定を部分一致で削除 |
| `通知先一覧` | メール通知対象の一覧 |
| `通知先追加 example.com 📩【表示名】` | 通知対象ドメイン追加 |
| `通知先削除 example.com` | 通知対象ドメイン削除 |
| `未読メール` | 未読メールを即チェック |
| `管理画面` | 管理画面URLを返信 |

## 管理画面

PC ブラウザからアクセスできるダッシュボードです。

- **スケジュール** — 週間カレンダー表示、予定の追加・編集・削除
- **メール通知** — 通知対象の管理、通知済みメール履歴
- **空き枠管理** — 空き枠の確認、候補選択、仮押さえ一括登録
- **設定** — トークン・カレンダーID の変更、トリガー管理

## 技術スタック

- **Google Apps Script** — サーバーレス実行環境
- **Google Calendar API** (CalendarApp) — スケジュール管理
- **Gmail API** (GmailApp) — メール検索・通知
- **LINE Messaging API** — Push / Reply メッセージング
- **HTML Service** — 管理画面 UI

## ライセンス

MIT License
