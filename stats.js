(function () {
  "use strict";

  var tracker = window.EcoTracker;
  if (!tracker) {
    return;
  }

  var WEEKLY_GOAL = 2000; // 每周减碳目标（克）。
  var WEEK_DAYS = 14; // 日历展示最近 14 天。
  var RING_CIRCUMFERENCE = 326.7;

  function pad(num) {
    return num < 10 ? "0" + num : "" + num;
  }

  function actionName(id) {
    var found = tracker.ACTIONS.find(function (item) {
      return item.id === id;
    });
    return found ? found.name : id;
  }

  function totalCo2(records) {
    return Object.keys(records).reduce(function (sum, key) {
      return sum + (records[key].co2 || 0);
    }, 0);
  }

  function computeStreak(records) {
    var streak = 0;
    var cursor = new Date();
    if (!records[tracker.toKey(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (records[tracker.toKey(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function monthCount(records) {
    var now = new Date();
    var prefix = now.getFullYear() + "-" + pad(now.getMonth() + 1);
    return Object.keys(records).filter(function (key) {
      return key.indexOf(prefix) === 0;
    }).length;
  }

  function weekRange() {
    var now = new Date();
    var day = now.getDay();
    var offset = day === 0 ? 6 : day - 1; // 周一为一周起点。
    var monday = new Date(now);
    monday.setDate(now.getDate() - offset);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday: monday, sunday: sunday };
  }

  function weekTotal(records) {
    var range = weekRange();
    var start = tracker.toKey(range.monday);
    var end = tracker.toKey(range.sunday);
    return Object.keys(records)
      .filter(function (key) {
        return key >= start && key <= end;
      })
      .reduce(function (sum, key) {
        return sum + (records[key].co2 || 0);
      }, 0);
  }

  function renderStats(records) {
    document.getElementById("total-co2").innerHTML =
      totalCo2(records) + '<span class="stat-unit"> g</span>';
    document.getElementById("streak-count").textContent = computeStreak(records);
    document.getElementById("streak-total").innerHTML =
      computeStreak(records) + '<span class="stat-unit"> 天</span>';
    document.getElementById("month-days").innerHTML =
      monthCount(records) + '<span class="stat-unit"> 次</span>';
  }

  function renderGoal(records) {
    var done = weekTotal(records);
    var percent = Math.min(100, Math.round((done / WEEKLY_GOAL) * 100));
    var offset = RING_CIRCUMFERENCE * (1 - percent / 100);
    document.getElementById("goal-ring-fg").style.strokeDashoffset = offset;
    document.getElementById("goal-percent").textContent = percent + "%";

    var range = weekRange();
    var daysLeft = Math.max(
      0,
      Math.ceil((range.sunday - new Date()) / 86400000)
    );
    document.getElementById("goal-days-left").textContent = "剩 " + daysLeft + " 天";
    document.getElementById("goal-caption").textContent =
      "本周已减碳 " + done + " g / 目标 " + WEEKLY_GOAL + " g";
  }

  function renderWeekStrip(records) {
    var strip = document.getElementById("week-strip");
    strip.innerHTML = "";
    var weekdays = ["日", "一", "二", "三", "四", "五", "六"];

    for (var i = WEEK_DAYS - 1; i >= 0; i--) {
      var day = new Date();
      day.setDate(day.getDate() - i);
      var key = tracker.toKey(day);
      var cell = document.createElement("div");
      cell.className = "day-cell";
      if (records[key]) {
        cell.classList.add("checked");
      }
      if (key === tracker.todayKey) {
        cell.classList.add("today");
      }
      cell.innerHTML =
        '<span class="day-week">' +
        weekdays[day.getDay()] +
        "</span>" +
        '<span class="day-num">' +
        day.getDate() +
        "</span>" +
        '<span class="day-dot"></span>';
      strip.appendChild(cell);
    }
  }

  function renderHistory(records) {
    var list = document.getElementById("history-list");
    list.innerHTML = "";
    var keys = Object.keys(records).sort().reverse();

    if (keys.length === 0) {
      list.innerHTML = '<li class="empty-state">还没有打卡记录，从今天开始行动吧。</li>';
      return;
    }

    keys.forEach(function (key) {
      var record = records[key];
      var li = document.createElement("li");
      var tags = record.actions
        .map(function (id) {
          return '<span class="history-tag">' + actionName(id) + "</span>";
        })
        .join("");
      li.innerHTML =
        '<span class="history-date">' +
        key.slice(5) +
        "</span>" +
        '<span class="history-tags">' +
        tags +
        "</span>" +
        '<span class="history-co2">' +
        record.co2 +
        " g</span>";
      list.appendChild(li);
    });
  }

  function exportData() {
    var records = tracker.getRecords();
    var blob = new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json"
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "ecotracker-data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function render() {
    var records = tracker.getRecords();
    renderStats(records);
    renderGoal(records);
    renderWeekStrip(records);
    renderHistory(records);
  }

  document.getElementById("export-btn").addEventListener("click", exportData);
  window.addEventListener("ecotracker:update", render);
  render();
})();
