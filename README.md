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

### 必要なもの

1. Google アカウント
2. LINE Developers アカウント（無料）
3. [clasp](https://github.com/google/clasp)（GAS CLI ツール）

### セットアップ手順

#### 1. LINE Bot を作成

1. [LINE Developers](https://developers.line.biz/) にログイン
2. 新規プロバイダー → 新規チャネル（Messaging API）を作成
3. 「Messaging API設定」→「チャネルアクセストークン」を発行してコピー

#### 2. Google Calendar ID を確認

1. [Google Calendar](https://calendar.google.com/) を開く
2. 左メニューのカレンダー名の「⋮」→「設定と共有」
3. 「カレンダーの統合」→「カレンダーID」をコピー

#### 3. CalPush をデプロイ

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

#### 4. 初期設定

1. デプロイURLをブラウザで開く
2. セットアップウィザードが表示される
3. **LINE Channel Access Token** と **Calendar ID** を入力
4. 完了！

#### 5. LINE Webhook を設定

1. LINE Developers → チャネル → 「Messaging API設定」
2. 「Webhook URL」にデプロイURLを貼り付け
3. 「Webhookの利用」を ON に
4. LINE Bot にメッセージを送信（USER_ID が自動保存されます）

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
