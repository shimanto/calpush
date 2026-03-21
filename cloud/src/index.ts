import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './lib/env.js';
import { db } from './lib/db.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { getSessionUserId } from './middleware/session.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhook.js';

const app = new Hono();

app.use('*', logger());
app.use('/static/*', serveStatic({ root: './public' }));

// --- Routes ---
app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.route('/webhook', webhookRoutes);

// --- Pages ---

app.get('/', (c) => {
  const userId = getSessionUserId(c);
  if (userId) return c.redirect('/dashboard');
  return c.html(landingPage());
});

app.get('/dashboard', (c) => {
  const userId = getSessionUserId(c);
  if (!userId) return c.redirect('/');
  return c.html(dashboardPage());
});

app.get('/privacy', (c) => c.html(privacyPage()));

// --- Start ---

const port = env.PORT;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CalPush Cloud running on http://localhost:${info.port}`);
  startScheduler();
});

process.on('SIGTERM', () => { stopScheduler(); db.$disconnect(); });
process.on('SIGINT', () => { stopScheduler(); db.$disconnect(); process.exit(0); });

// --- HTML Templates ---

function landingPage(): string {
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
        <h3>複数カレンダー対応</h3>
        <p>仕事・プライベートなど複数のGoogleカレンダーを一括通知。</p>
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

function dashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CalPush Cloud - ダッシュボード</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; background: #f5f5f5; }
    .header { background: #667eea; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 1.2rem; }
    .header .user-info { display: flex; align-items: center; gap: 12px; }
    .header img { width: 32px; height: 32px; border-radius: 50%; }
    .header button { background: rgba(255,255,255,0.2); color: #fff; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; }
    .container { max-width: 900px; margin: 0 auto; padding: 24px; }
    .section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .section h2 { font-size: 1.1rem; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #667eea; }
    .calendar-list { list-style: none; }
    .calendar-list li { padding: 8px 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f0f0f0; }
    .calendar-dot { width: 12px; height: 12px; border-radius: 50%; }
    .line-setup { background: #f8f9fa; border-radius: 8px; padding: 16px; }
    .line-setup label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.9rem; }
    .line-setup input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; font-size: 0.95rem; }
    .btn { display: inline-block; padding: 10px 24px; background: #667eea; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; cursor: pointer; font-weight: 600; }
    .btn:hover { background: #5a6fd6; }
    .btn-outline { background: transparent; color: #667eea; border: 1px solid #667eea; }
    .webhook-url { background: #e8eaf6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; word-break: break-all; margin-top: 12px; display: none; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
    .status-ok { background: #e8f5e9; color: #2e7d32; }
    .status-pending { background: #fff3e0; color: #e65100; }
    .schedule-preview { white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 16px; border-radius: 8px; font-size: 0.9rem; line-height: 1.5; }
    .notification-list { list-style: none; }
    .notification-list li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
    .notification-list .time { color: #999; font-size: 0.85rem; }
    #loading { text-align: center; padding: 40px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CalPush Cloud</h1>
    <div class="user-info">
      <span id="userName"></span>
      <img id="userPic" src="" alt="" style="display:none">
      <form method="POST" action="/auth/logout" style="display:inline"><button type="submit">ログアウト</button></form>
    </div>
  </div>

  <div class="container">
    <div id="loading">読み込み中...</div>

    <!-- Google Calendar Section -->
    <div class="section" id="calSection" style="display:none">
      <h2>Google カレンダー</h2>
      <ul class="calendar-list" id="calList"></ul>
      <button class="btn btn-outline" onclick="syncCalendars()" style="margin-top: 12px">カレンダーを再同期</button>
    </div>

    <!-- Today's Schedule -->
    <div class="section" id="scheduleSection" style="display:none">
      <h2>今日のスケジュール</h2>
      <div class="schedule-preview" id="scheduleText"></div>
    </div>

    <!-- LINE Setup Section -->
    <div class="section" id="lineSection" style="display:none">
      <h2>LINE 接続</h2>
      <div id="lineChannels"></div>
      <div class="line-setup" id="lineSetup">
        <p style="margin-bottom: 12px; font-size: 0.9rem; color: #666;">LINE Developers Console から Messaging API チャネルの情報を入力してください。</p>
        <label for="lineChannelId">Channel ID</label>
        <input type="text" id="lineChannelId" placeholder="1234567890">
        <label for="lineChannelSecret">Channel Secret</label>
        <input type="password" id="lineChannelSecret" placeholder="abcdef0123456789...">
        <button class="btn" onclick="connectLine()">LINE を接続</button>
        <div class="webhook-url" id="webhookUrl"></div>
      </div>
    </div>

    <!-- Notifications Section -->
    <div class="section" id="notiSection" style="display:none">
      <h2>通知履歴</h2>
      <ul class="notification-list" id="notiList"></ul>
    </div>
  </div>

  <script>
    const API = '/api';

    async function load() {
      try {
        const [me, cals, schedule, channels, notis] = await Promise.all([
          fetch(API + '/me').then(r => r.json()),
          fetch(API + '/calendars').then(r => r.json()),
          fetch(API + '/schedule/' + todayStr()).then(r => r.json()),
          fetch(API + '/line/channels').then(r => r.json()),
          fetch(API + '/notifications?limit=20').then(r => r.json()),
        ]);

        document.getElementById('loading').style.display = 'none';

        // User
        document.getElementById('userName').textContent = me.name || me.email;
        if (me.picture) {
          const pic = document.getElementById('userPic');
          pic.src = me.picture;
          pic.style.display = 'block';
        }

        // Calendars
        const calList = document.getElementById('calList');
        if (cals.length === 0) {
          calList.innerHTML = '<li style="color:#999">カレンダーが同期されていません</li>';
        } else {
          calList.innerHTML = cals.map(function(cal) {
            return '<li><span class="calendar-dot" style="background:' + (cal.color || '#667eea') + '"></span>' +
              cal.name + (cal.isDefault ? ' <span class="status status-ok">メイン</span>' : '') + '</li>';
          }).join('');
        }
        document.getElementById('calSection').style.display = 'block';

        // Schedule
        document.getElementById('scheduleText').textContent = schedule.text;
        document.getElementById('scheduleSection').style.display = 'block';

        // LINE channels
        renderLineChannels(channels);
        document.getElementById('lineSection').style.display = 'block';

        // Notifications
        const notiList = document.getElementById('notiList');
        if (notis.length === 0) {
          notiList.innerHTML = '<li style="color:#999">まだ通知はありません</li>';
        } else {
          notiList.innerHTML = notis.map(function(n) {
            var d = new Date(n.sentAt);
            var time = d.getMonth()+1 + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
            return '<li><span>' + n.title + '</span><span class="time">' + time + '</span></li>';
          }).join('');
        }
        document.getElementById('notiSection').style.display = 'block';

      } catch (e) {
        document.getElementById('loading').textContent = 'Error: ' + e.message;
      }
    }

    function renderLineChannels(channels) {
      var container = document.getElementById('lineChannels');
      if (channels.length === 0) {
        container.innerHTML = '<p style="color:#999;margin-bottom:16px">LINE チャネルが未接続です</p>';
        return;
      }
      container.innerHTML = channels.map(function(ch) {
        var status = ch.lineUserId
          ? '<span class="status status-ok">接続済み</span>'
          : '<span class="status status-pending">Webhook待ち</span>';
        return '<div style="padding:8px 0;border-bottom:1px solid #f0f0f0">' +
          'Channel: ' + ch.channelId + ' ' + status +
          (ch.lineUserId ? ' <button class="btn btn-outline" style="padding:4px 12px;font-size:0.8rem" onclick="testLine(\\'' + ch.id + '\\')">テスト送信</button>' : '') +
          '</div>';
      }).join('');
    }

    async function syncCalendars() {
      var cals = await fetch(API + '/calendars/sync', { method: 'POST' }).then(r => r.json());
      location.reload();
    }

    async function connectLine() {
      var channelId = document.getElementById('lineChannelId').value.trim();
      var channelSecret = document.getElementById('lineChannelSecret').value.trim();
      if (!channelId || !channelSecret) return alert('Channel ID と Channel Secret を入力してください');

      var res = await fetch(API + '/line/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channelId, channelSecret: channelSecret }),
      });
      var data = await res.json();
      if (!res.ok) return alert(data.error);

      var el = document.getElementById('webhookUrl');
      el.style.display = 'block';
      el.innerHTML = '<strong>Webhook URL (LINE Developers Console に設定):</strong><br>' + data.webhookUrl;
      document.getElementById('lineChannelId').value = '';
      document.getElementById('lineChannelSecret').value = '';

      // Refresh channels list
      var channels = await fetch(API + '/line/channels').then(r => r.json());
      renderLineChannels(channels);
    }

    async function testLine(id) {
      var res = await fetch(API + '/line/channels/' + id + '/test', { method: 'POST' });
      var data = await res.json();
      alert(data.message || data.error);
    }

    function todayStr() {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    load();
  </script>
</body>
</html>`;
}

function privacyPage(): string {
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
