A vertical 9:16 portrait infographic poster titled "CalPush — Docs", flat-design Japanese style, NO characters.

=== STYLE ===
Flat-design Japanese infographic. Bold 2px outlines. Color: light teal (#5DDFD5) primary + LINE green (#06C755) accent, white & light gray bg, dark slate text. Smartphone-readable Japanese.

=== LAYOUT ===

[Header — 12%]
- Title: 「CalPush」
- Subtitle: 「Google Calendar × Gmail × LINE 通知 — 5 分セットアップ」
- Calendar→LINE icon.

[Section 1 — "主要機能 6 つ (6 Key Features)", ~30%]
- 2×3 grid of feature cards with icon + label + 1-line:
  - 📅 毎朝予定通知 (8:55 自動送信)
  - ⏰ 5 分前リマインダー
  - 📨 メール着信通知 (指定ドメイン/アドレス)
  - 💬 LINE から予定確認・追加・削除
  - 💻 PC 管理画面 (週間ビュー / 空き枠仮押さえ)
  - ⚡ セットアップウィザード (2 情報入力)

[Section 2 — "アーキテクチャ (Architecture)", ~22%]
- Horizontal flow:
  📅 Google Calendar / 📧 Gmail → ⚙️ Google Apps Script (GAS) → 💚 LINE Messaging API → 📱 LINE
- Sub-text: 「サーバー不要 / GAS 無料枠で十分動作」

[Section 3 — "セットアップ 3 ステップ (3-Step Setup)", ~22%]
- Numbered cards:
  1️⃣ LINE Developers でチャネル作成 → アクセストークン取得
  2️⃣ Google Calendar ID をコピー
  3️⃣ `clasp create + push` で GAS にデプロイ → セットアップウィザードで 2 情報入力

[Footer — ~14%]
- 4 info pills:
  - 🆓 無料 (GAS + LINE 無料枠)
  - 📚 docs/pricing-model.md
  - 🔗 github.com/shimanto/calpush
  - 🌐 calpush-docs.pages.dev
- Tiny subtitle: 「OSS / MIT License」

=== TECHNICAL CONSTRAINTS ===
- 9:16 vertical portrait. All Japanese accurate.
