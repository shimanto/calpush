// ============================================================
// CalPush - Google Calendar × Gmail × LINE 通知ツール
// https://github.com/user/calpush
// ============================================================

const PROPS = PropertiesService.getScriptProperties();

// ============================================================
// セットアップ管理
// ============================================================

/** セットアップ状態を取得 */
function getSetupStatus() {
  const token = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const calId = PROPS.getProperty('CALENDAR_ID');
  const userId = PROPS.getProperty('LINE_TO_USER_ID');
  const missing = [];
  if (!token) missing.push('LINE_CHANNEL_ACCESS_TOKEN');
  if (!calId) missing.push('CALENDAR_ID');
  return {
    complete: missing.length === 0,
    hasUserId: !!userId,
    missing: missing
  };
}

/** 初期設定を保存 */
function saveSetup(config) {
  try {
    if (config.lineToken) {
      PROPS.setProperty('LINE_CHANNEL_ACCESS_TOKEN', config.lineToken.trim());
    }
    if (config.calendarId) {
      PROPS.setProperty('CALENDAR_ID', config.calendarId.trim());
    }
    // トリガー自動作成
    setupTriggers();
    return { success: true, message: '✅ セットアップが完了しました' };
  } catch (e) {
    return { success: false, message: '❌ エラー: ' + e.message };
  }
}

/** 現在の設定を取得（トークンはマスク） */
function getConfig() {
  const token = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '';
  const calId = PROPS.getProperty('CALENDAR_ID') || '';
  const userId = PROPS.getProperty('LINE_TO_USER_ID') || '';
  const domains = getNotifyDomains_();
  const labels = getDomainLabels_();
  return {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 8) + '...' : '',
    calendarId: calId,
    userId: userId,
    domains: domains.map(d => ({ domain: d, label: labels[d] || '' }))
  };
}

/** 設定を更新 */
function updateConfig(config) {
  try {
    if (config.lineToken) {
      PROPS.setProperty('LINE_CHANNEL_ACCESS_TOKEN', config.lineToken.trim());
    }
    if (config.calendarId) {
      PROPS.setProperty('CALENDAR_ID', config.calendarId.trim());
    }
    return { success: true, message: '✅ 設定を更新しました' };
  } catch (e) {
    return { success: false, message: '❌ エラー: ' + e.message };
  }
}

// ============================================================
// トリガー管理
// ============================================================

/** 必要なトリガーを自動作成 */
function setupTriggers() {
  const existing = ScriptApp.getProjectTriggers();
  const names = existing.map(t => t.getHandlerFunction());

  // 毎朝の予定通知（8:55）
  if (!names.includes('sendDailySchedule')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 55, 0, 0);
    ScriptApp.newTrigger('sendDailySchedule').timeBased().at(tomorrow).create();
  }

  // 5分前リマインダー（毎分）
  if (!names.includes('sendEventReminder')) {
    ScriptApp.newTrigger('sendEventReminder').timeBased().everyMinutes(1).create();
  }

  // Gmail チェック（5分ごと）
  if (!names.includes('checkGmailAndNotify')) {
    ScriptApp.newTrigger('checkGmailAndNotify').timeBased().everyMinutes(5).create();
  }

  return { success: true, message: '✅ トリガーを設定しました' };
}

/** トリガー一覧を取得 */
function getTriggerList() {
  return ScriptApp.getProjectTriggers().map(t => ({
    id: t.getUniqueId(),
    handler: t.getHandlerFunction(),
    type: t.getEventType().toString()
  }));
}

// ============================================================
// LINE メッセージング
// ============================================================

function sendLinePush_(text) {
  const token = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const toUserId = PROPS.getProperty('LINE_TO_USER_ID');
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定です');
  if (!toUserId) throw new Error('LINE_TO_USER_ID が未設定です');

  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: toUserId, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('LINE送信失敗: HTTP ' + code + ' / ' + res.getContentText());
  }
}

function replyLineMessage_(replyToken, message) {
  const token = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: 'text', text: message }] }),
    muteHttpExceptions: true
  });
}

function markAsRead_(markAsReadToken) {
  if (!markAsReadToken) return;
  const token = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/chat/markAsRead', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ markAsReadToken: markAsReadToken }),
    muteHttpExceptions: true
  });
}

/** LINE メッセージ送信クォータ取得 */
function getLineQuota_() {
  const token = PROPS.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  if (!token) return null;
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/quota/consumption', {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      return JSON.parse(res.getContentText()).totalUsage;
    }
  } catch (e) {}
  return null;
}

// ============================================================
// カレンダー操作
// ============================================================

function getCalendar_() {
  const calId = PROPS.getProperty('CALENDAR_ID');
  if (!calId) throw new Error('CALENDAR_ID が未設定です');
  return CalendarApp.getCalendarById(calId);
}

function formatDate_(d) {
  return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');
}

function formatTime_(d) {
  return Utilities.formatDate(d, 'Asia/Tokyo', 'HH:mm');
}

function findEventByIdOnDate_(eventId, dateStr) {
  const cal = getCalendar_();
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const next = new Date(d.getTime() + 86400000);
  const events = cal.getEvents(d, next);
  for (var i = 0; i < events.length; i++) {
    if (events[i].getId() === eventId) return events[i];
  }
  return null;
}

/** 当日の予定テキストを生成 */
function buildScheduleText_(targetDate) {
  const cal = getCalendar_();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  const events = cal.getEvents(start, end);
  const dateStr = Utilities.formatDate(start, 'Asia/Tokyo', 'M月d日(E)');

  if (events.length === 0) {
    return '📅 ' + dateStr + ' の予定\n\n予定はありません 🎉';
  }

  var text = '📅 ' + dateStr + ' の予定\n';
  text += '━━━━━━━━━━━━━━\n';
  events.forEach(function(ev) {
    if (ev.isAllDayEvent()) {
      text += '📌 [終日] ' + ev.getTitle() + '\n';
    } else {
      var s = Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'HH:mm');
      var e = Utilities.formatDate(ev.getEndTime(), 'Asia/Tokyo', 'HH:mm');
      text += '🕐 ' + s + '〜' + e + ' ' + ev.getTitle() + '\n';
    }
  });
  return text;
}

// ============================================================
// 自動通知
// ============================================================

/** 毎朝の予定通知 */
function sendDailySchedule() {
  var today = new Date();
  var text = buildScheduleText_(today);

  // クォータ情報追加
  var quota = getLineQuota_();
  if (quota !== null) {
    text += '\n━━━━━━━━━━━━━━\n📊 今月の送信数: ' + quota + ' / 200';
  }

  sendLinePush_(text);

  // 翌日のトリガーを再作成
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailySchedule') {
      ScriptApp.deleteTrigger(t);
    }
  });
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 55, 0, 0);
  ScriptApp.newTrigger('sendDailySchedule').timeBased().at(tomorrow).create();
}

/** 5分前リマインダー */
function sendEventReminder() {
  var cal = getCalendar_();
  var now = new Date();
  var fiveMin = new Date(now.getTime() + 5 * 60 * 1000);
  var sixMin = new Date(now.getTime() + 6 * 60 * 1000);
  var events = cal.getEvents(fiveMin, sixMin);

  events.forEach(function(ev) {
    if (ev.isAllDayEvent()) return;
    var title = ev.getTitle();
    var start = Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'HH:mm');
    sendLinePush_('⏰ まもなく開始\n\n🕐 ' + start + '〜 ' + title);
  });
}

// ============================================================
// 管理画面用: スケジュール管理
// ============================================================

/** 週間スケジュール取得 */
function getWeekSchedule(weekOffset) {
  var cal = getCalendar_();
  var today = new Date();
  var monday = new Date(today);
  var day = monday.getDay();
  var diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff + (weekOffset || 0) * 7);
  monday.setHours(0, 0, 0, 0);

  var result = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday.getTime() + i * 86400000);
    var next = new Date(d.getTime() + 86400000);
    var events = cal.getEvents(d, next);
    var dayEvents = events.map(function(ev) {
      var title = ev.getTitle();
      var isTentative = title.startsWith('【仮】');
      var desc = ev.getDescription() || '';
      var isConfirmed = desc.indexOf('[confirmed-from-tentative]') >= 0;
      var isRecurring = ev.isRecurringEvent();
      return {
        id: ev.getId(),
        title: title,
        allDay: ev.isAllDayEvent(),
        start: ev.isAllDayEvent() ? null : Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'HH:mm'),
        end: ev.isAllDayEvent() ? null : Utilities.formatDate(ev.getEndTime(), 'Asia/Tokyo', 'HH:mm'),
        tentative: isTentative,
        confirmed: isConfirmed,
        recurring: isRecurring
      };
    });
    result.push({
      date: Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd'),
      label: Utilities.formatDate(d, 'Asia/Tokyo', 'M/d(E)'),
      events: dayEvents
    });
  }
  return result;
}

/** 予定追加 */
function addEventFromWeb(data) {
  try {
    var cal = getCalendar_();
    if (data.allDay) {
      var d = new Date(data.date + 'T00:00:00+09:00');
      cal.createAllDayEvent(data.title, d);
    } else {
      var s = new Date(data.date + 'T' + data.startTime + ':00+09:00');
      var e = new Date(data.date + 'T' + data.endTime + ':00+09:00');
      cal.createEvent(data.title, s, e);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 予定更新 */
function updateEventFromWeb(data) {
  try {
    var ev = findEventByIdOnDate_(data.eventId, data.originalDate);
    if (!ev) return { success: false, error: '予定が見つかりません' };

    if (ev.isRecurringEvent()) {
      // 繰り返し予定は該当日のみ削除して新規作成
      ev.deleteEvent();
      var cal = getCalendar_();
      if (data.allDay) {
        var d = new Date(data.date + 'T00:00:00+09:00');
        cal.createAllDayEvent(data.title, d);
      } else {
        var s = new Date(data.date + 'T' + data.startTime + ':00+09:00');
        var e = new Date(data.date + 'T' + data.endTime + ':00+09:00');
        cal.createEvent(data.title, s, e);
      }
    } else {
      ev.setTitle(data.title);
      if (data.allDay) {
        // 時間指定→終日への変更は削除して再作成
        ev.deleteEvent();
        var cal2 = getCalendar_();
        var d2 = new Date(data.date + 'T00:00:00+09:00');
        cal2.createAllDayEvent(data.title, d2);
      } else {
        var s2 = new Date(data.date + 'T' + data.startTime + ':00+09:00');
        var e2 = new Date(data.date + 'T' + data.endTime + ':00+09:00');
        ev.setTime(s2, e2);
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 予定削除 */
function deleteEventFromWeb(eventId, dateStr) {
  try {
    var ev = findEventByIdOnDate_(eventId, dateStr);
    if (!ev) return { success: false, error: '予定が見つかりません' };
    ev.deleteEvent();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// 管理画面用: 仮押さえ管理
// ============================================================

/** 空き枠取得 */
function getAvailableSlots(days, minutes) {
  var cal = getCalendar_();
  var slotMin = minutes || 60;
  var maxDays = days || 5;
  var result = [];
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  var count = 0;

  while (count < maxDays) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // 土日除外
    count++;

    var dayEnd = new Date(d.getTime() + 86400000);
    var events = cal.getEvents(d, dayEnd);
    var slots = [];
    var hour = 10;
    var min = 0;

    while (hour < 17) {
      var slotStart = new Date(d);
      slotStart.setHours(hour, min, 0, 0);
      var slotEnd = new Date(slotStart.getTime() + slotMin * 60 * 1000);
      if (slotEnd.getHours() > 17 || (slotEnd.getHours() === 17 && slotEnd.getMinutes() > 0)) break;

      var busy = false;
      for (var i = 0; i < events.length; i++) {
        if (events[i].isAllDayEvent()) continue;
        var evStart = events[i].getStartTime().getTime();
        var evEnd = events[i].getEndTime().getTime();
        if (slotStart.getTime() < evEnd && slotEnd.getTime() > evStart) {
          busy = true;
          break;
        }
      }

      slots.push({
        start: Utilities.formatDate(slotStart, 'Asia/Tokyo', 'HH:mm'),
        end: Utilities.formatDate(slotEnd, 'Asia/Tokyo', 'HH:mm'),
        available: !busy
      });

      min += slotMin;
      if (min >= 60) { hour += Math.floor(min / 60); min = min % 60; }
    }

    result.push({
      date: Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd'),
      label: Utilities.formatDate(d, 'Asia/Tokyo', 'M/d(E)'),
      slots: slots
    });
  }
  return result;
}

/** 仮押さえ作成 */
function createTentativeEvent(data) {
  try {
    var cal = getCalendar_();
    var s = new Date(data.date + 'T' + data.start + ':00+09:00');
    var e = new Date(data.date + 'T' + data.end + ':00+09:00');
    var title = '【仮】' + (data.memo || '仮押さえ');
    cal.createEvent(title, s, e);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 仮押さえ一括作成 */
function createTentativeEventsBatch(events) {
  try {
    var cal = getCalendar_();
    events.forEach(function(data) {
      var s = new Date(data.date + 'T' + data.start + ':00+09:00');
      var e = new Date(data.date + 'T' + data.end + ':00+09:00');
      var title = '【仮】' + (data.memo || '仮押さえ');
      cal.createEvent(title, s, e);
    });
    return { success: true, count: events.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 仮押さえ一覧取得 */
function getTentativeEvents() {
  var cal = getCalendar_();
  var now = new Date();
  var future = new Date(now.getTime() + 30 * 86400000);
  var events = cal.getEvents(now, future);
  var result = [];
  events.forEach(function(ev) {
    if (!ev.getTitle().startsWith('【仮】')) return;
    result.push({
      id: ev.getId(),
      title: ev.getTitle(),
      group: ev.getTitle().replace('【仮】', ''),
      date: Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'yyyy-MM-dd'),
      dateLabel: Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'M/d(E)'),
      start: Utilities.formatDate(ev.getStartTime(), 'Asia/Tokyo', 'HH:mm'),
      end: Utilities.formatDate(ev.getEndTime(), 'Asia/Tokyo', 'HH:mm')
    });
  });
  return result;
}

/** 仮押さえ確定 */
function confirmTentativeEvent(eventId, dateStr) {
  try {
    var ev = findEventByIdOnDate_(eventId, dateStr);
    if (!ev) return { success: false, error: '予定が見つかりません' };
    ev.setTitle(ev.getTitle().replace('【仮】', ''));
    ev.setDescription((ev.getDescription() || '') + '\n[confirmed-from-tentative]');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 確定して同グループの他を解放 */
function confirmOneAndReleaseOthers(eventId, dateStr, group) {
  try {
    // まず対象を確定
    var ev = findEventByIdOnDate_(eventId, dateStr);
    if (!ev) return { success: false, error: '予定が見つかりません' };
    ev.setTitle(ev.getTitle().replace('【仮】', ''));
    ev.setDescription((ev.getDescription() || '') + '\n[confirmed-from-tentative]');

    // 同グループの他を削除
    var cal = getCalendar_();
    var now = new Date();
    var future = new Date(now.getTime() + 30 * 86400000);
    var events = cal.getEvents(now, future);
    var targetTitle = '【仮】' + group;
    events.forEach(function(other) {
      if (other.getId() !== eventId && other.getTitle() === targetTitle) {
        other.deleteEvent();
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 仮押さえ解放 */
function releaseTentativeEvent(eventId, dateStr) {
  return deleteEventFromWeb(eventId, dateStr);
}

/** 全仮押さえ確定 */
function confirmAllTentativeEvents() {
  try {
    var cal = getCalendar_();
    var now = new Date();
    var future = new Date(now.getTime() + 30 * 86400000);
    var events = cal.getEvents(now, future);
    var count = 0;
    events.forEach(function(ev) {
      if (!ev.getTitle().startsWith('【仮】')) return;
      ev.setTitle(ev.getTitle().replace('【仮】', ''));
      ev.setDescription((ev.getDescription() || '') + '\n[confirmed-from-tentative]');
      count++;
    });
    return { success: true, count: count };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 全仮押さえ解放 */
function releaseAllTentativeEvents() {
  try {
    var cal = getCalendar_();
    var now = new Date();
    var future = new Date(now.getTime() + 30 * 86400000);
    var events = cal.getEvents(now, future);
    var count = 0;
    events.forEach(function(ev) {
      if (!ev.getTitle().startsWith('【仮】')) return;
      ev.deleteEvent();
      count++;
    });
    return { success: true, count: count };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// メール通知機能
// ============================================================

var NOTIFIED_LABEL = 'LINE通知済み';

function getNotifyDomains_() {
  var raw = PROPS.getProperty('NOTIFY_DOMAINS') || '';
  return raw.split(',').map(function(d) { return d.trim(); }).filter(function(d) { return d; });
}

function getDomainLabels_() {
  var raw = PROPS.getProperty('DOMAIN_LABELS') || '';
  var map = {};
  raw.split(',').forEach(function(entry) {
    var parts = entry.split(':');
    if (parts.length >= 2) {
      map[parts[0].trim()] = parts.slice(1).join(':').trim();
    }
  });
  return map;
}

function matchFromAddress_(from, entry) {
  var escaped = entry.replace(/\./g, '\\.');
  if (entry.includes('@')) {
    return new RegExp(escaped, 'i').test(from);
  }
  return new RegExp('@' + escaped, 'i').test(from);
}

/** Gmail チェック＆LINE通知 */
function checkGmailAndNotify() {
  var domains = getNotifyDomains_();
  if (domains.length === 0) return;

  var fromQuery = domains.map(function(d) {
    return d.includes('@') ? 'from:' + d : 'from:@' + d;
  }).join(' OR ');
  var searchQuery = 'is:unread (' + fromQuery + ') -label:"' + NOTIFIED_LABEL + '"';

  var threads = GmailApp.search(searchQuery, 0, 10);
  if (threads.length === 0) return;

  var domainLabels = getDomainLabels_();

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];
    var gmailUrl = 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId();

    var messages = thread.getMessages();
    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      if (!message.isUnread()) continue;

      var subject = message.getSubject();
      var from = message.getFrom();
      var body = message.getPlainBody().substring(0, 140);

      var head = null;
      for (var domain in domainLabels) {
        if (matchFromAddress_(from, domain)) {
          head = domainLabels[domain];
          break;
        }
      }
      if (!head) {
        for (var i = 0; i < domains.length; i++) {
          if (matchFromAddress_(from, domains[i])) {
            head = '📩【メール】';
            break;
          }
        }
      }
      if (!head) continue;

      var text = head + ' 新着メール\n件名：' + subject + '\n差出人：' + from + '\n\n' + body + '...\n\n▼Gmailで開く\n' + gmailUrl;
      sendLinePush_(text);
    }

    var label = GmailApp.getUserLabelByName(NOTIFIED_LABEL) || GmailApp.createLabel(NOTIFIED_LABEL);
    thread.addLabel(label);
  }
}

// ============================================================
// 管理画面用: メール通知管理
// ============================================================

/** ドメイン一覧取得 */
function getDomainList() {
  var domains = getNotifyDomains_();
  var labels = getDomainLabels_();
  return domains.map(function(d) {
    return { domain: d, label: labels[d] || '' };
  });
}

/** ドメイン追加 */
function addDomainFromWeb(domain, label) {
  if (!domain) return { success: false, error: 'ドメインまたはメールアドレスを入力してください' };
  domain = domain.trim();
  var domains = getNotifyDomains_();
  if (domains.indexOf(domain) >= 0) {
    return { success: false, error: domain + ' は既に登録されています' };
  }
  domains.push(domain);
  PROPS.setProperty('NOTIFY_DOMAINS', domains.join(','));

  if (label) {
    var labelsRaw = PROPS.getProperty('DOMAIN_LABELS') || '';
    var newEntry = domain + ':' + label;
    PROPS.setProperty('DOMAIN_LABELS', labelsRaw ? labelsRaw + ',' + newEntry : newEntry);
  }
  return { success: true, message: '✅ 通知対象に追加しました: ' + domain };
}

/** ドメイン削除 */
function removeDomainFromWeb(domain) {
  var domains = getNotifyDomains_();
  var filtered = domains.filter(function(d) { return d !== domain; });
  if (filtered.length === domains.length) {
    return { success: false, error: domain + ' は登録されていません' };
  }
  PROPS.setProperty('NOTIFY_DOMAINS', filtered.join(','));

  var labelsRaw = PROPS.getProperty('DOMAIN_LABELS') || '';
  var newLabels = labelsRaw.split(',').filter(function(entry) {
    return !entry.startsWith(domain + ':');
  }).join(',');
  PROPS.setProperty('DOMAIN_LABELS', newLabels);

  return { success: true, message: '🗑️ 通知対象から削除しました: ' + domain };
}

/** 通知済みメール一覧 */
function getNotifiedEmails() {
  try {
    var label = GmailApp.getUserLabelByName(NOTIFIED_LABEL);
    if (!label) return [];
    var threads = label.getThreads(0, 20);
    return threads.map(function(thread) {
      var msg = thread.getMessages()[thread.getMessageCount() - 1];
      return {
        subject: msg.getSubject(),
        from: msg.getFrom(),
        date: Utilities.formatDate(msg.getDate(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
        body: msg.getPlainBody().substring(0, 500),
        url: 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId()
      };
    });
  } catch (e) {
    Logger.log('❌ メール履歴取得エラー: ' + e);
    return [];
  }
}

/** メールからスケジュール確定＆招待送信 */
function createEventWithInvitation(data) {
  try {
    var cal = getCalendar_();
    var s = new Date(data.date + 'T' + data.startTime + ':00+09:00');
    var e = new Date(data.date + 'T' + data.endTime + ':00+09:00');
    var options = {};
    if (data.guests) {
      options.guests = data.guests;
      options.sendInvites = true;
    }
    cal.createEvent(data.title, s, e, options);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// Web アプリ (doGet)
// ============================================================

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('admin');
  template.setupComplete = getSetupStatus().complete;
  return template.evaluate()
    .setTitle('CalPush')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// LINE Webhook (doPost)
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var events = data.events;

    for (var i = 0; i < events.length; i++) {
      var event = events[i];

      // 既読
      if (event.message && event.message.markAsReadToken) {
        markAsRead_(event.message.markAsReadToken);
      }

      if (event.type !== 'message' || event.message.type !== 'text') continue;

      // ユーザーID自動保存
      var userId = event.source.userId;
      if (userId) {
        var saved = PROPS.getProperty('LINE_TO_USER_ID');
        if (!saved || saved !== userId) {
          PROPS.setProperty('LINE_TO_USER_ID', userId);
        }
      }

      var msg = event.message.text.trim();
      var replyToken = event.replyToken;

      // カレンダー系コマンド
      if (msg === '今日の予定') {
        replyLineMessage_(replyToken, buildScheduleText_(new Date()));
      } else if (msg === '明日の予定') {
        var tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        replyLineMessage_(replyToken, buildScheduleText_(tmrw));
      } else if (msg.startsWith('予定追加')) {
        var addResult = parseAndAddEvent_(msg);
        replyLineMessage_(replyToken, addResult);
      } else if (msg.startsWith('予定削除')) {
        var delResult = parseAndDeleteEvent_(msg);
        replyLineMessage_(replyToken, delResult);

      // メール通知系コマンド
      } else if (msg === '通知先一覧') {
        replyLineMessage_(replyToken, listNotifyDomainsText_());
      } else if (msg.startsWith('通知先追加')) {
        var args = msg.replace(/^通知先追加\s*/, '').trim();
        var parts = args.split(/\s+/);
        var domain = parts[0];
        var label = parts.slice(1).join(' ') || null;
        if (!domain) {
          replyLineMessage_(replyToken, '⚠️ 書式: 通知先追加 example.com 📩【表示名】');
        } else {
          var r = addDomainFromWeb(domain, label);
          replyLineMessage_(replyToken, r.success ? r.message : '⚠️ ' + r.error);
        }
      } else if (msg.startsWith('通知先削除')) {
        var dom = msg.replace(/^通知先削除\s*/, '').trim();
        if (!dom) {
          replyLineMessage_(replyToken, '⚠️ 書式: 通知先削除 example.com');
        } else {
          var r2 = removeDomainFromWeb(dom);
          replyLineMessage_(replyToken, r2.success ? r2.message : '⚠️ ' + r2.error);
        }
      } else if (msg === '未読メール') {
        checkGmailAndNotify();
        replyLineMessage_(replyToken, '📧 未読メールをチェックしました');

      // 管理画面
      } else if (msg === '管理画面') {
        var url = ScriptApp.getService().getUrl() + '?page=admin';
        replyLineMessage_(replyToken, '📊 CalPush 管理画面\n\n' + url);

      // ヘルプ
      } else {
        replyLineMessage_(replyToken,
          '📅 CalPush コマンド一覧\n' +
          '━━━━━━━━━━━━━━\n' +
          '・今日の予定\n' +
          '・明日の予定\n' +
          '・予定追加 M/D HH:MM-HH:MM タイトル\n' +
          '・予定追加 M/D タイトル (終日)\n' +
          '・予定削除 M/D タイトル\n' +
          '━━━━━━━━━━━━━━\n' +
          '・通知先一覧\n' +
          '・通知先追加 example.com 📩【表示名】\n' +
          '・通知先削除 example.com\n' +
          '・未読メール\n' +
          '━━━━━━━━━━━━━━\n' +
          '・管理画面'
        );
      }
    }
  } catch (error) {
    Logger.log('❌ Webhook処理エラー: ' + error);
  }
  return ContentService.createTextOutput('OK');
}

// ============================================================
// LINE コマンド パーサー
// ============================================================

function parseAndAddEvent_(msg) {
  try {
    var body = msg.replace(/^予定追加\s*/, '').trim();
    var match = body.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s+(.+)$/);
    if (match) {
      var year = new Date().getFullYear();
      var m = parseInt(match[1]) - 1;
      var d = parseInt(match[2]);
      var s = new Date(year, m, d, parseInt(match[3]), parseInt(match[4]));
      var e = new Date(year, m, d, parseInt(match[5]), parseInt(match[6]));
      var title = match[7];
      getCalendar_().createEvent(title, s, e);
      return '✅ 予定を追加しました\n📅 ' + (m+1) + '/' + d + ' ' + match[3] + ':' + match[4] + '-' + match[5] + ':' + match[6] + '\n📝 ' + title;
    }

    var matchAllDay = body.match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/);
    if (matchAllDay) {
      var year2 = new Date().getFullYear();
      var m2 = parseInt(matchAllDay[1]) - 1;
      var d2 = parseInt(matchAllDay[2]);
      var date = new Date(year2, m2, d2);
      var title2 = matchAllDay[3];
      getCalendar_().createAllDayEvent(title2, date);
      return '✅ 終日予定を追加しました\n📅 ' + (m2+1) + '/' + d2 + '\n📝 ' + title2;
    }

    return '⚠️ 書式: 予定追加 M/D HH:MM-HH:MM タイトル\n　または: 予定追加 M/D タイトル (終日)';
  } catch (e) {
    return '❌ エラー: ' + e.message;
  }
}

function parseAndDeleteEvent_(msg) {
  try {
    var body = msg.replace(/^予定削除\s*/, '').trim();
    var match = body.match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/);
    if (!match) {
      return '⚠️ 書式: 予定削除 M/D タイトル';
    }

    var year = new Date().getFullYear();
    var m = parseInt(match[1]) - 1;
    var d = parseInt(match[2]);
    var keyword = match[3];
    var start = new Date(year, m, d, 0, 0, 0);
    var end = new Date(year, m, d + 1, 0, 0, 0);
    var events = getCalendar_().getEvents(start, end);

    for (var i = 0; i < events.length; i++) {
      if (events[i].getTitle().indexOf(keyword) >= 0) {
        var title = events[i].getTitle();
        events[i].deleteEvent();
        return '🗑️ 予定を削除しました\n📅 ' + (m+1) + '/' + d + '\n📝 ' + title;
      }
    }
    return '⚠️ 「' + keyword + '」に一致する予定が見つかりません';
  } catch (e) {
    return '❌ エラー: ' + e.message;
  }
}

function listNotifyDomainsText_() {
  var domains = getNotifyDomains_();
  var labels = getDomainLabels_();
  if (domains.length === 0) return '通知対象のドメインはありません';

  var text = '==============================\n📧 メール通知対象一覧\n==============================\n\n';
  domains.forEach(function(d) {
    text += (labels[d] || '📩') + ' ' + d + '\n';
  });
  text += '\n合計 ' + domains.length + ' 件';
  return text;
}

// ============================================================
// テスト用
// ============================================================

function testLinePush() {
  sendLinePush_('✅ CalPush テスト送信成功');
}

function testCheckGmail() {
  checkGmailAndNotify();
}
