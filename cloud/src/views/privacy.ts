export function privacyPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>プライバシーポリシー - CalPush Cloud</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 1.8rem; margin-bottom: 8px; }
    .date { color: #999; margin-bottom: 32px; }
    h2 { font-size: 1.2rem; margin: 24px 0 8px; }
    p, ul { margin-bottom: 12px; }
    ul { padding-left: 24px; }
    a { color: #667eea; }
  </style>
</head>
<body>
  <h1>プライバシーポリシー</h1>
  <p class="date">最終更新日: 2026年3月21日</p>

  <p>CalPush Cloud（以下「本サービス」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。</p>

  <h2>1. 収集する情報</h2>
  <p>本サービスは、以下の情報を収集します：</p>
  <ul>
    <li><strong>Googleアカウント情報</strong>: メールアドレス、表示名、プロフィール画像（Google OAuth経由）</li>
    <li><strong>Googleカレンダーデータ</strong>: カレンダーの予定情報（タイトル、日時、場所）を読み取り専用でアクセスします</li>
    <li><strong>LINE チャネル情報</strong>: ユーザーが入力するChannel ID、Channel Secret</li>
  </ul>

  <h2>2. 情報の利用目的</h2>
  <p>収集した情報は、以下の目的にのみ使用します：</p>
  <ul>
    <li>Googleカレンダーの予定をLINEに通知するため</li>
    <li>ユーザー認証およびサービス提供のため</li>
    <li>サービスの改善および不具合対応のため</li>
  </ul>

  <h2>3. 情報の保管とセキュリティ</h2>
  <ul>
    <li>Google OAuthトークン（refresh token）は暗号化して保存します</li>
    <li>カレンダーの予定データはサーバーに永続保存せず、通知送信時にリアルタイムで取得します</li>
    <li>LINE Channel Secretは暗号化して保存します</li>
  </ul>

  <h2>4. 第三者への提供</h2>
  <p>ユーザーの個人情報を第三者に提供・販売することはありません。ただし、法令に基づく場合を除きます。</p>

  <h2>5. Google API の利用について</h2>
  <p>本サービスのGoogle APIの利用は、<a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>（Limited Use requirements を含む）に準拠します。</p>

  <h2>6. データの削除</h2>
  <p>ユーザーはいつでもアカウントを削除でき、削除時にはすべての保存データ（トークン、設定情報、通知履歴）が完全に削除されます。</p>

  <h2>7. お問い合わせ</h2>
  <p>プライバシーに関するお問い合わせは、<a href="https://github.com/shimanto/calpush/issues">GitHub Issues</a> までお願いいたします。</p>

  <p style="margin-top: 32px;"><a href="/">CalPush Cloud トップページに戻る</a></p>
</body>
</html>`;
}
