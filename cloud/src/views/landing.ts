export function landingPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CalPush Cloud - Google Calendar × LINE 通知</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
    .hero { text-align: center; padding: 80px 20px 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 32px; }
    .btn { display: inline-block; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: transform 0.1s; }
    .btn:hover { transform: translateY(-1px); }
    .btn-google { background: #fff; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .features { max-width: 900px; margin: 0 auto; padding: 60px 20px; }
    .features h2 { text-align: center; font-size: 1.8rem; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }
    .card { background: #f8f9fa; border-radius: 12px; padding: 24px; }
    .card h3 { font-size: 1.1rem; margin-bottom: 8px; }
    .card p { color: #666; font-size: 0.95rem; }
    .pricing { max-width: 900px; margin: 0 auto; padding: 60px 20px; }
    .pricing h2 { text-align: center; font-size: 1.8rem; margin-bottom: 40px; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .pricing-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 32px 24px; text-align: center; }
    .pricing-card.popular { border-color: #667eea; box-shadow: 0 4px 12px rgba(102,126,234,0.2); position: relative; }
    .pricing-card.popular::before { content: '人気'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #667eea; color: #fff; padding: 2px 16px; border-radius: 12px; font-size: 0.8rem; }
    .pricing-card h3 { font-size: 1.3rem; margin-bottom: 8px; }
    .pricing-card .price { font-size: 2rem; font-weight: 700; color: #667eea; margin-bottom: 4px; }
    .pricing-card .price-sub { font-size: 0.85rem; color: #999; margin-bottom: 16px; }
    .pricing-card ul { list-style: none; text-align: left; }
    .pricing-card ul li { padding: 6px 0; font-size: 0.9rem; }
    .pricing-card ul li::before { content: '✓ '; color: #4caf50; font-weight: 700; }
    .steps { max-width: 700px; margin: 0 auto; padding: 60px 20px; }
    .steps h2 { text-align: center; font-size: 1.8rem; margin-bottom: 40px; }
    .step { display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start; }
    .step-num { width: 36px; height: 36px; border-radius: 50%; background: #667eea; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .step-text h3 { font-size: 1rem; }
    .step-text p { color: #666; font-size: 0.9rem; }
    footer { text-align: center; padding: 40px 20px; color: #999; font-size: 0.85rem; border-top: 1px solid #eee; }
    footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>CalPush Cloud</h1>
    <p>Google Calendar の予定を LINE に自動通知。3分で設定完了、ゼロ円から始められます。</p>
    <a href="/auth/google" class="btn btn-google">Googleでログイン</a>
  </div>

  <div class="features">
    <h2>主な機能</h2>
    <div class="grid">
      <div class="card">
        <h3>朝のスケジュール通知</h3>
        <p>毎朝8:55に今日の予定をLINEでお届け。一日の見通しが立ちます。</p>
      </div>
      <div class="card">
        <h3>5分前リマインダー</h3>
        <p>予定の5分前に自動通知。会議の遅刻を防ぎます。</p>
      </div>
      <div class="card">
        <h3>LINEコマンド</h3>
        <p>「今日の予定」「明日の予定」とLINEで送るだけで予定を確認。</p>
      </div>
      <div class="card">
        <h3>仮予約管理</h3>
        <p>仮予約の作成・確定・解放をワンクリックで。ダブルブッキングを防止。</p>
      </div>
      <div class="card">
        <h3>簡単セットアップ</h3>
        <p>Googleログイン → LINE接続 → 完了。コード編集は一切不要。</p>
      </div>
      <div class="card">
        <h3>完全無料で利用可能</h3>
        <p>Freeプランは月200通まで無料。個人利用なら十分です。</p>
      </div>
    </div>
  </div>

  <div class="pricing">
    <h2>料金プラン</h2>
    <div class="pricing-grid">
      <div class="pricing-card">
        <h3>Free</h3>
        <div class="price">¥0</div>
        <div class="price-sub">ずっと無料</div>
        <ul>
          <li>1カレンダー</li>
          <li>月200通の通知</li>
          <li>朝のスケジュール通知</li>
          <li>5分前リマインダー</li>
          <li>LINEコマンド</li>
          <li>仮予約管理（5件/月）</li>
        </ul>
        <div style="margin-top:24px"><a href="/auth/google" class="btn btn-google" style="padding:10px 24px;font-size:0.9rem">無料で始める</a></div>
      </div>
      <div class="pricing-card popular">
        <h3>Pro</h3>
        <div class="price">¥480<span style="font-size:1rem;font-weight:400">/月</span></div>
        <div class="price-sub">年払い ¥3,980/年</div>
        <ul>
          <li>5カレンダー</li>
          <li>無制限の通知</li>
          <li>通知時刻カスタマイズ</li>
          <li>リマインダー時刻変更</li>
          <li>無制限の仮予約</li>
          <li>14日先の空き枠検索</li>
          <li>優先サポート</li>
        </ul>
        <div style="margin-top:24px"><a href="/auth/google" class="btn" style="padding:10px 24px;font-size:0.9rem;color:#fff;text-decoration:none">Proで始める</a></div>
      </div>
      <div class="pricing-card">
        <h3>Business</h3>
        <div class="price">¥1,980<span style="font-size:1rem;font-weight:400">/月</span></div>
        <div class="price-sub">5名まで、追加 ¥300/名</div>
        <ul>
          <li>無制限カレンダー</li>
          <li>チーム共有カレンダー</li>
          <li>メンバー空き時間検索</li>
          <li>仮予約の承認フロー</li>
          <li>Webhook / Zapier連携</li>
          <li>管理者ダッシュボード</li>
        </ul>
        <div style="margin-top:24px"><a href="mailto:hello@calpush.com" class="btn btn-google" style="padding:10px 24px;font-size:0.9rem">お問い合わせ</a></div>
      </div>
    </div>
  </div>

  <div class="steps">
    <h2>セットアップは3ステップ</h2>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text">
        <h3>Googleでログイン</h3>
        <p>Googleアカウントで認証するだけ。カレンダーの読み取り権限を許可します。</p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text">
        <h3>LINE公式アカウントを接続</h3>
        <p>ウィザードに従ってChannel IDとChannel Secretを入力。Webhook URLは自動生成されます。</p>
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text">
        <h3>通知開始</h3>
        <p>設定完了。翌朝から自動でスケジュール通知が届きます。</p>
      </div>
    </div>
  </div>

  <footer>
    <p>CalPush Cloud &copy; 2026 &nbsp;|&nbsp; <a href="/privacy">プライバシーポリシー</a> &nbsp;|&nbsp; <a href="https://github.com/shimanto/calpush">GitHub (OSS版)</a></p>
  </footer>
</body>
</html>`;
}
