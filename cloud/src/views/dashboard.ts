export function dashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CalPush Cloud - ダッシュボード</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; background: #f5f5f5; }

    /* Header */
    .header { background: #667eea; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 1.2rem; }
    .header .user-info { display: flex; align-items: center; gap: 12px; }
    .header img { width: 32px; height: 32px; border-radius: 50%; }
    .header button { background: rgba(255,255,255,0.2); color: #fff; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; }

    /* Tabs */
    .tabs { display: flex; background: #fff; border-bottom: 1px solid #e0e0e0; padding: 0 24px; }
    .tab { padding: 12px 20px; cursor: pointer; font-weight: 500; color: #666; border-bottom: 3px solid transparent; transition: all 0.2s; }
    .tab.active { color: #667eea; border-bottom-color: #667eea; }
    .tab:hover { color: #333; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Layout */
    .container { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .section h2 { font-size: 1.1rem; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #667eea; }

    /* Buttons */
    .btn { display: inline-block; padding: 10px 24px; background: #667eea; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; cursor: pointer; font-weight: 600; }
    .btn:hover { background: #5a6fd6; }
    .btn-outline { background: transparent; color: #667eea; border: 1px solid #667eea; }
    .btn-sm { padding: 4px 12px; font-size: 0.8rem; }
    .btn-danger { background: #ef5350; }
    .btn-danger:hover { background: #e53935; }
    .btn-success { background: #4caf50; }

    /* Status badges */
    .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
    .status-ok { background: #e8f5e9; color: #2e7d32; }
    .status-pending { background: #fff3e0; color: #e65100; }
    .status-warn { background: #fff8e1; color: #f57f17; }

    /* Plan card */
    .plan-card { display: flex; gap: 24px; flex-wrap: wrap; }
    .plan-stat { text-align: center; padding: 16px; flex: 1; min-width: 120px; }
    .plan-stat .value { font-size: 1.8rem; font-weight: 700; color: #667eea; }
    .plan-stat .label { font-size: 0.85rem; color: #999; margin-top: 4px; }
    .progress-bar { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; margin-top: 8px; }
    .progress-fill { height: 100%; background: #667eea; border-radius: 4px; transition: width 0.3s; }
    .progress-fill.warn { background: #ff9800; }
    .progress-fill.danger { background: #ef5350; }

    /* Weekly schedule */
    .week-nav { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .week-nav button { padding: 6px 12px; cursor: pointer; background: #f0f0f0; border: 1px solid #ddd; border-radius: 6px; }
    .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .day-col { min-height: 120px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px; }
    .day-col.today { border-color: #667eea; background: #f5f7ff; }
    .day-header { font-size: 0.85rem; font-weight: 600; text-align: center; margin-bottom: 8px; }
    .day-header.today { color: #667eea; }
    .event-card { background: #e8eaf6; border-radius: 4px; padding: 4px 6px; margin-bottom: 4px; font-size: 0.8rem; cursor: pointer; word-break: break-word; }
    .event-card:hover { background: #c5cae9; }
    .event-card.tentative { background: #fff8e1; border-left: 3px solid #ff9800; }
    .event-time { color: #666; font-size: 0.75rem; }
    .add-event-btn { width: 100%; background: none; border: 1px dashed #ccc; border-radius: 4px; padding: 4px; color: #999; cursor: pointer; font-size: 0.75rem; }
    .add-event-btn:hover { border-color: #667eea; color: #667eea; }

    /* Modal */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; align-items: center; justify-content: center; }
    .modal-overlay.show { display: flex; }
    .modal { background: #fff; border-radius: 12px; padding: 24px; width: 400px; max-width: 90vw; max-height: 80vh; overflow-y: auto; }
    .modal h3 { font-size: 1.1rem; margin-bottom: 16px; }
    .modal label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.9rem; }
    .modal input, .modal select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; font-size: 0.95rem; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

    /* Calendar list */
    .calendar-list { list-style: none; }
    .calendar-list li { padding: 8px 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f0f0f0; }
    .calendar-dot { width: 12px; height: 12px; border-radius: 50%; }

    /* LINE setup */
    .line-setup { background: #f8f9fa; border-radius: 8px; padding: 16px; }
    .line-setup label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.9rem; }
    .line-setup input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; font-size: 0.95rem; }
    .webhook-url { background: #e8eaf6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; word-break: break-all; margin-top: 12px; display: none; }

    /* Tentative list */
    .tentative-list { list-style: none; }
    .tentative-list li { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
    .tentative-info .title { font-weight: 600; }
    .tentative-info .time { color: #666; font-size: 0.85rem; }
    .tentative-actions { display: flex; gap: 6px; }

    /* Notification list */
    .notification-list { list-style: none; }
    .notification-list li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
    .notification-list .time { color: #999; font-size: 0.85rem; }

    /* Settings */
    .setting-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .setting-row label { font-weight: 600; min-width: 150px; }
    .setting-row input, .setting-row select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; }
    .setting-row .hint { font-size: 0.8rem; color: #999; margin-left: 8px; }

    #loading { text-align: center; padding: 40px; color: #999; }

    @media (max-width: 768px) {
      .week-grid { grid-template-columns: repeat(1, 1fr); }
      .plan-card { flex-direction: column; }
      .tabs { overflow-x: auto; }
    }
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

  <div class="tabs">
    <div class="tab active" data-tab="schedule">スケジュール</div>
    <div class="tab" data-tab="tentative">仮予約</div>
    <div class="tab" data-tab="line">LINE</div>
    <div class="tab" data-tab="settings">設定</div>
  </div>

  <div class="container">
    <div id="loading">読み込み中...</div>

    <!-- Plan Overview (always visible) -->
    <div class="section" id="planSection" style="display:none">
      <div class="plan-card">
        <div class="plan-stat">
          <div class="value" id="planName">FREE</div>
          <div class="label">プラン</div>
        </div>
        <div class="plan-stat">
          <div class="value" id="pushCount">0</div>
          <div class="label" id="pushLabel">/ 200 通</div>
          <div class="progress-bar"><div class="progress-fill" id="pushProgress" style="width:0%"></div></div>
        </div>
        <div class="plan-stat">
          <div class="value" id="calCount">0</div>
          <div class="label" id="calLabel">/ 1 カレンダー</div>
        </div>
      </div>
    </div>

    <!-- Schedule Tab -->
    <div class="tab-content active" id="tab-schedule">
      <div class="section">
        <h2>週間スケジュール</h2>
        <div class="week-nav">
          <button onclick="changeWeek(-1)">&lt; 先週</button>
          <span id="weekRange"></span>
          <button onclick="changeWeek(1)">来週 &gt;</button>
          <button onclick="changeWeek(0)">今週</button>
        </div>
        <div class="week-grid" id="weekGrid"></div>
      </div>

      <div class="section">
        <h2>Google カレンダー</h2>
        <ul class="calendar-list" id="calList"></ul>
        <button class="btn btn-outline btn-sm" onclick="syncCalendars()" style="margin-top: 12px">カレンダーを再同期</button>
      </div>
    </div>

    <!-- Tentative Tab -->
    <div class="tab-content" id="tab-tentative">
      <div class="section">
        <h2>仮予約一覧</h2>
        <ul class="tentative-list" id="tentativeList"></ul>
        <p id="noTentative" style="color:#999;display:none">仮予約はありません</p>
      </div>

      <div class="section">
        <h2>空き枠検索</h2>
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div>
            <label style="font-size:0.9rem">日数</label>
            <input type="number" id="slotDays" value="3" min="1" max="14" style="width:80px;padding:6px">
          </div>
          <div>
            <label style="font-size:0.9rem">時間(分)</label>
            <input type="number" id="slotMinutes" value="60" min="15" max="480" step="15" style="width:80px;padding:6px">
          </div>
          <div style="align-self:flex-end">
            <button class="btn btn-sm" onclick="searchSlots()">検索</button>
          </div>
        </div>
        <div id="slotResults" style="max-height:300px;overflow-y:auto"></div>
      </div>
    </div>

    <!-- LINE Tab -->
    <div class="tab-content" id="tab-line">
      <div class="section">
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

      <div class="section">
        <h2>通知履歴</h2>
        <ul class="notification-list" id="notiList"></ul>
      </div>
    </div>

    <!-- Settings Tab -->
    <div class="tab-content" id="tab-settings">
      <div class="section">
        <h2>通知設定</h2>
        <div class="setting-row">
          <label>朝の通知時刻</label>
          <input type="time" id="notifyTime" value="08:55">
          <span class="hint" id="notifyTimeHint"></span>
        </div>
        <div class="setting-row">
          <label>リマインダー</label>
          <select id="reminderMinutes">
            <option value="5">5分前</option>
            <option value="10">10分前</option>
            <option value="15">15分前</option>
            <option value="30">30分前</option>
            <option value="60">1時間前</option>
          </select>
          <span class="hint" id="reminderHint"></span>
        </div>
        <button class="btn btn-sm" onclick="saveSettings()" style="margin-top:12px">保存</button>
      </div>

      <div class="section">
        <h2>アカウント</h2>
        <button class="btn btn-danger btn-sm" onclick="deleteAccount()">アカウント削除</button>
        <p style="font-size:0.8rem;color:#999;margin-top:8px">すべてのデータが完全に削除されます。この操作は取り消せません。</p>
      </div>
    </div>
  </div>

  <!-- Event Modal -->
  <div class="modal-overlay" id="eventModal">
    <div class="modal">
      <h3 id="modalTitle">予定を追加</h3>
      <input type="hidden" id="modalEventId">
      <input type="hidden" id="modalCalendarId">
      <label>タイトル</label>
      <input type="text" id="modalEventTitle" placeholder="会議">
      <label>日付</label>
      <input type="date" id="modalEventDate">
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>開始</label><input type="time" id="modalEventStart"></div>
        <div style="flex:1"><label>終了</label><input type="time" id="modalEventEnd"></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <input type="checkbox" id="modalAllDay" onchange="toggleAllDay()"> 終日
      </label>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <input type="checkbox" id="modalTentative"> 仮予約
      </label>
      <div class="modal-actions">
        <button class="btn btn-outline btn-sm" onclick="closeModal()">キャンセル</button>
        <button class="btn btn-danger btn-sm" id="modalDeleteBtn" onclick="deleteEventFromModal()" style="display:none">削除</button>
        <button class="btn btn-sm" onclick="saveEvent()">保存</button>
      </div>
    </div>
  </div>

  <script>
    const API = '/api';
    var weekOffset = 0;
    var currentPlan = {};
    var defaultCalendarId = '';

    // --- Tab Navigation ---
    document.querySelectorAll('.tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // --- Load Data ---
    async function load() {
      try {
        var [me, plan, cals, channels, notis] = await Promise.all([
          api('/me'), api('/plan'), api('/calendars'), api('/line/channels'), api('/notifications?limit=20'),
        ]);

        document.getElementById('loading').style.display = 'none';
        currentPlan = plan;

        // User
        document.getElementById('userName').textContent = me.name || me.email;
        if (me.picture) { var pic = document.getElementById('userPic'); pic.src = me.picture; pic.style.display = 'block'; }

        // Plan
        document.getElementById('planName').textContent = plan.plan.toUpperCase();
        document.getElementById('pushCount').textContent = plan.usage.pushCount;
        document.getElementById('pushLabel').textContent = plan.usage.pushLimit === -1 ? '通（無制限）' : '/ ' + plan.usage.pushLimit + ' 通';
        if (plan.usage.pushLimit > 0) {
          var pct = Math.round(plan.usage.pushCount / plan.usage.pushLimit * 100);
          document.getElementById('pushProgress').style.width = Math.min(pct, 100) + '%';
          if (pct > 90) document.getElementById('pushProgress').classList.add('danger');
          else if (pct > 70) document.getElementById('pushProgress').classList.add('warn');
        }
        document.getElementById('calCount').textContent = plan.usage.calendarCount;
        document.getElementById('calLabel').textContent = '/ ' + (plan.usage.calendarLimit === -1 ? '∞' : plan.usage.calendarLimit) + ' カレンダー';
        document.getElementById('planSection').style.display = 'block';

        // Calendars
        defaultCalendarId = (cals.find(function(c) { return c.isDefault; }) || cals[0] || {}).calendarId || '';
        var calList = document.getElementById('calList');
        calList.innerHTML = cals.length === 0
          ? '<li style="color:#999">カレンダーが同期されていません</li>'
          : cals.map(function(cal) {
              return '<li><span class="calendar-dot" style="background:' + (cal.color || '#667eea') + '"></span>' +
                cal.name + (cal.isDefault ? ' <span class="status status-ok">メイン</span>' : '') + '</li>';
            }).join('');

        // Settings hints
        if (!plan.limits.customNotifyTime) document.getElementById('notifyTimeHint').textContent = 'Pro プランで変更可能';
        if (!plan.limits.customReminderMinutes) document.getElementById('reminderHint').textContent = 'Pro プランで変更可能';

        // LINE
        renderLineChannels(channels);

        // Notifications
        var notiList = document.getElementById('notiList');
        notiList.innerHTML = notis.length === 0
          ? '<li style="color:#999">まだ通知はありません</li>'
          : notis.map(function(n) {
              var d = new Date(n.sentAt);
              var time = (d.getMonth()+1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
              return '<li><span>' + esc(n.title) + '</span><span class="time">' + time + '</span></li>';
            }).join('');

        // Week schedule
        loadWeek();
        loadTentative();

      } catch (e) {
        document.getElementById('loading').textContent = 'Error: ' + e.message;
      }
    }

    // --- Week Schedule ---
    async function loadWeek() {
      var dates = getWeekDates(weekOffset);
      document.getElementById('weekRange').textContent = formatShort(dates[0]) + ' 〜 ' + formatShort(dates[6]);

      var today = todayStr();
      var grid = document.getElementById('weekGrid');
      var days = ['日','月','火','水','木','金','土'];

      // Fetch all days in parallel
      var results = await Promise.all(dates.map(function(d) { return api('/schedule/' + d); }));

      grid.innerHTML = dates.map(function(d, i) {
        var isToday = d === today;
        var sched = results[i];
        var evHtml = (sched.events || []).map(function(ev) {
          var isTent = ev.title.startsWith('【仮】');
          var title = isTent ? ev.title.replace('【仮】','') : ev.title;
          var timeStr = ev.allDay ? '終日' : formatHM(ev.start) + '〜' + formatHM(ev.end);
          return '<div class="event-card' + (isTent ? ' tentative' : '') + '" onclick="openEditModal(\\'' +
            esc(ev.id) + '\\',\\'' + esc(ev.title) + '\\',\\'' + d + '\\',\\'' +
            (ev.allDay ? '' : formatHM(ev.start)) + '\\',\\'' + (ev.allDay ? '' : formatHM(ev.end)) + '\\',\\'' +
            esc(ev.calendarName || '') + '\\')" title="' + esc(ev.title) + '">' +
            '<div class="event-time">' + timeStr + '</div>' + esc(title) + '</div>';
        }).join('');

        var dow = new Date(d + 'T00:00:00+09:00').getDay();
        return '<div class="day-col' + (isToday ? ' today' : '') + '">' +
          '<div class="day-header' + (isToday ? ' today' : '') + '">' + days[dow] + '<br>' + d.slice(5) + '</div>' +
          evHtml +
          '<button class="add-event-btn" onclick="openAddModal(\\'' + d + '\\')">+ 追加</button>' +
          '</div>';
      }).join('');
    }

    function changeWeek(dir) {
      if (dir === 0) weekOffset = 0;
      else weekOffset += dir;
      loadWeek();
    }

    // --- Tentative Events ---
    async function loadTentative() {
      var tents = await api('/tentative');
      var list = document.getElementById('tentativeList');
      var noTent = document.getElementById('noTentative');

      if (tents.length === 0) {
        list.innerHTML = '';
        noTent.style.display = 'block';
        return;
      }
      noTent.style.display = 'none';
      list.innerHTML = tents.map(function(t) {
        var timeStr = t.allDay ? t.start : formatHM(t.start) + '〜' + formatHM(t.end);
        var dateStr = t.start.slice(0,10);
        return '<li><div class="tentative-info"><span class="title">' + esc(t.title) + '</span><br>' +
          '<span class="time">' + dateStr + ' ' + timeStr + '</span></div>' +
          '<div class="tentative-actions">' +
          '<button class="btn btn-success btn-sm" onclick="confirmTent(\\'' + t.calendarId + '\\',\\'' + t.id + '\\')">確定</button>' +
          '<button class="btn btn-danger btn-sm" onclick="releaseTent(\\'' + t.calendarId + '\\',\\'' + t.id + '\\')">解放</button>' +
          '</div></li>';
      }).join('');
    }

    async function confirmTent(calId, evId) {
      await api('/tentative/' + calId + '/' + evId + '/confirm', 'POST');
      loadTentative();
      loadWeek();
    }

    async function releaseTent(calId, evId) {
      if (!confirm('仮予約を解放しますか？')) return;
      await api('/tentative/' + calId + '/' + evId, 'DELETE');
      loadTentative();
      loadWeek();
    }

    // --- Available Slots ---
    async function searchSlots() {
      var days = document.getElementById('slotDays').value;
      var minutes = document.getElementById('slotMinutes').value;
      var data = await api('/slots?days=' + days + '&minutes=' + minutes);
      var div = document.getElementById('slotResults');
      if (data.slots.length === 0) {
        div.innerHTML = '<p style="color:#999">空き枠がありません</p>';
        return;
      }
      var grouped = {};
      data.slots.forEach(function(s) {
        if (!grouped[s.date]) grouped[s.date] = [];
        grouped[s.date].push(s);
      });
      div.innerHTML = Object.keys(grouped).map(function(date) {
        return '<div style="margin-bottom:12px"><strong>' + date + '</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' +
          grouped[date].map(function(s) {
            return '<button class="btn btn-outline btn-sm" onclick="bookSlot(\\'' + date + '\\',\\'' + s.start + '\\',\\'' + s.end + '\\')">' +
              s.start + '〜' + s.end + '</button>';
          }).join('') + '</div></div>';
      }).join('');
    }

    function bookSlot(date, start, end) {
      openAddModal(date);
      document.getElementById('modalEventStart').value = start;
      document.getElementById('modalEventEnd').value = end;
      document.getElementById('modalTentative').checked = true;
    }

    // --- Event Modal ---
    function openAddModal(date) {
      document.getElementById('modalTitle').textContent = '予定を追加';
      document.getElementById('modalEventId').value = '';
      document.getElementById('modalCalendarId').value = defaultCalendarId;
      document.getElementById('modalEventTitle').value = '';
      document.getElementById('modalEventDate').value = date;
      document.getElementById('modalEventStart').value = '';
      document.getElementById('modalEventEnd').value = '';
      document.getElementById('modalAllDay').checked = false;
      document.getElementById('modalTentative').checked = false;
      document.getElementById('modalDeleteBtn').style.display = 'none';
      toggleAllDay();
      document.getElementById('eventModal').classList.add('show');
    }

    function openEditModal(id, title, date, start, end) {
      document.getElementById('modalTitle').textContent = '予定を編集';
      document.getElementById('modalEventId').value = id;
      document.getElementById('modalCalendarId').value = defaultCalendarId;
      document.getElementById('modalEventTitle').value = title.replace('【仮】','');
      document.getElementById('modalEventDate').value = date;
      document.getElementById('modalEventStart').value = start;
      document.getElementById('modalEventEnd').value = end;
      document.getElementById('modalAllDay').checked = !start;
      document.getElementById('modalTentative').checked = title.startsWith('【仮】');
      document.getElementById('modalDeleteBtn').style.display = 'inline-block';
      toggleAllDay();
      document.getElementById('eventModal').classList.add('show');
    }

    function closeModal() { document.getElementById('eventModal').classList.remove('show'); }

    function toggleAllDay() {
      var allDay = document.getElementById('modalAllDay').checked;
      document.getElementById('modalEventStart').disabled = allDay;
      document.getElementById('modalEventEnd').disabled = allDay;
    }

    async function saveEvent() {
      var id = document.getElementById('modalEventId').value;
      var calId = document.getElementById('modalCalendarId').value;
      var data = {
        calendarId: calId,
        title: document.getElementById('modalEventTitle').value,
        date: document.getElementById('modalEventDate').value,
        tentative: document.getElementById('modalTentative').checked,
      };
      if (!document.getElementById('modalAllDay').checked) {
        data.startTime = document.getElementById('modalEventStart').value;
        data.endTime = document.getElementById('modalEventEnd').value;
      }

      if (id) {
        await api('/events/' + calId + '/' + id, 'PATCH', data);
      } else {
        await api('/events', 'POST', data);
      }
      closeModal();
      loadWeek();
      loadTentative();
    }

    async function deleteEventFromModal() {
      if (!confirm('この予定を削除しますか？')) return;
      var id = document.getElementById('modalEventId').value;
      var calId = document.getElementById('modalCalendarId').value;
      await api('/events/' + calId + '/' + id, 'DELETE');
      closeModal();
      loadWeek();
      loadTentative();
    }

    // --- LINE ---
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
          (ch.lineUserId ? ' <button class="btn btn-outline btn-sm" onclick="testLine(\\'' + ch.id + '\\')">テスト送信</button>' : '') +
          ' <button class="btn btn-danger btn-sm" onclick="deleteLine(\\'' + ch.id + '\\')">削除</button>' +
          '</div>';
      }).join('');
    }

    async function connectLine() {
      var channelId = document.getElementById('lineChannelId').value.trim();
      var channelSecret = document.getElementById('lineChannelSecret').value.trim();
      if (!channelId || !channelSecret) return alert('Channel ID と Channel Secret を入力してください');

      var data = await apiRaw('/line/channels', 'POST', { channelId: channelId, channelSecret: channelSecret });
      if (data.error) return alert(data.error);

      var el = document.getElementById('webhookUrl');
      el.style.display = 'block';
      el.innerHTML = '<strong>Webhook URL (LINE Developers Console に設定):</strong><br>' + data.webhookUrl;
      document.getElementById('lineChannelId').value = '';
      document.getElementById('lineChannelSecret').value = '';

      var channels = await api('/line/channels');
      renderLineChannels(channels);
    }

    async function testLine(id) {
      var data = await apiRaw('/line/channels/' + id + '/test', 'POST');
      alert(data.message || data.error);
    }

    async function deleteLine(id) {
      if (!confirm('このLINEチャネルを削除しますか？')) return;
      await api('/line/channels/' + id, 'DELETE');
      var channels = await api('/line/channels');
      renderLineChannels(channels);
    }

    // --- Calendars ---
    async function syncCalendars() {
      await api('/calendars/sync', 'POST');
      location.reload();
    }

    // --- Settings ---
    async function saveSettings() {
      var data = {
        notifyTime: document.getElementById('notifyTime').value,
        reminderMinutes: parseInt(document.getElementById('reminderMinutes').value),
      };
      var res = await apiRaw('/settings', 'PATCH', data);
      if (res.error) alert(res.error);
      else alert('設定を保存しました');
    }

    async function deleteAccount() {
      if (!confirm('本当にアカウントを削除しますか？すべてのデータが完全に削除されます。')) return;
      if (!confirm('この操作は取り消せません。本当に削除しますか？')) return;
      await api('/account', 'DELETE');
      location.href = '/';
    }

    // --- Utilities ---
    async function api(path, method, body) {
      var opts = { method: method || 'GET', headers: {} };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      var res = await fetch(API + path, opts);
      if (!res.ok) {
        var err = await res.json().catch(function() { return { error: 'Unknown error' }; });
        throw new Error(err.error || 'Request failed');
      }
      return res.json();
    }

    async function apiRaw(path, method, body) {
      var opts = { method: method || 'GET', headers: {} };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      var res = await fetch(API + path, opts);
      return res.json();
    }

    function getWeekDates(offset) {
      var d = new Date(); d.setDate(d.getDate() - d.getDay() + offset * 7);
      var dates = [];
      for (var i = 0; i < 7; i++) {
        var day = new Date(d); day.setDate(d.getDate() + i);
        dates.push(day.getFullYear() + '-' + String(day.getMonth()+1).padStart(2,'0') + '-' + String(day.getDate()).padStart(2,'0'));
      }
      return dates;
    }

    function todayStr() {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    function formatShort(dateStr) {
      var parts = dateStr.split('-');
      return parseInt(parts[1]) + '/' + parseInt(parts[2]);
    }

    function formatHM(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }

    function esc(s) {
      if (!s) return '';
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    load();
  </script>
</body>
</html>`;
}
