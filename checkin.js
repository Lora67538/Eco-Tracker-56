(function () {
  "use strict";

  var STORAGE_KEY = "ecotracker.records.v1";

  // 低碳行为目录：id、名称、图标、单次减碳量（克）。
  var ACTIONS = [
    { id: "walk", name: "步行", emoji: "🚶", co2: 160 },
    { id: "bike", name: "骑行", emoji: "🚴", co2: 140 },
    { id: "bus", name: "公交", emoji: "🚌", co2: 90 },
    { id: "subway", name: "地铁", emoji: "🚇", co2: 110 },
    { id: "cup", name: "自带杯", emoji: "☕", co2: 10 },
    { id: "veg", name: "素食一餐", emoji: "🥗", co2: 700 },
    { id: "light", name: "随手关灯", emoji: "💡", co2: 40 },
    { id: "recycle", name: "垃圾分类", emoji: "♻️", co2: 60 }
  ];

  function pad(num) {
    return num < 10 ? "0" + num : "" + num;
  }

  function toKey(date) {
    return (
      date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
    );
  }

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function getRecord(dateKey) {
    return getRecords()[dateKey] || null;
  }

  function todayLabel() {
    var now = new Date();
    var weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return (
      now.getFullYear() +
      " 年 " +
      (now.getMonth() + 1) +
      " 月 " +
      now.getDate() +
      " 日 · 周" +
      weekdays[now.getDay()]
    );
  }

  // 共享给 stats.js 的接口。
  window.EcoTracker = {
    STORAGE_KEY: STORAGE_KEY,
    ACTIONS: ACTIONS,
    getRecords: getRecords,
    saveRecords: saveRecords,
    getRecord: getRecord,
    toKey: toKey,
    todayKey: toKey(new Date()),
    todayLabel: todayLabel
  };

  var selected = {};
  var actionList = document.getElementById("action-list");
  var todayCo2El = document.getElementById("today-co2");
  var checkinBtn = document.getElementById("checkin-btn");
  var hintEl = document.getElementById("checkin-hint");
  var todayDateEl = document.getElementById("today-date");

  function renderActions() {
    ACTIONS.forEach(function (action) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "action-chip";
      chip.dataset.id = action.id;
      chip.innerHTML =
        '<span class="chip-emoji">' +
        action.emoji +
        "</span>" +
        '<span class="chip-info">' +
        '<span class="chip-name">' +
        action.name +
        "</span>" +
        '<span class="chip-co2">约 ' +
        action.co2 +
        " g</span>" +
        "</span>";
      chip.addEventListener("click", function () {
        toggleAction(action.id);
      });
      actionList.appendChild(chip);
    });
  }

  function toggleAction(id) {
    if (selected[id]) {
      delete selected[id];
    } else {
      selected[id] = true;
    }
    refreshSelection();
  }

  function refreshSelection() {
    var total = 0;
    ACTIONS.forEach(function (action) {
      var chip = actionList.querySelector('[data-id="' + action.id + '"]');
      if (selected[action.id]) {
        chip.classList.add("selected");
        total += action.co2;
      } else {
        chip.classList.remove("selected");
      }
    });
    todayCo2El.innerHTML = total + " <em>g</em>";
  }

  function hasCheckedInToday() {
    return !!getRecord(window.EcoTracker.todayKey);
  }

  function syncTodayState() {
    if (hasCheckedInToday()) {
      checkinBtn.disabled = true;
      checkinBtn.textContent = "今日已打卡";
      hintEl.textContent = "今天已经完成打卡啦，明天继续加油哦。";
    } else {
      checkinBtn.disabled = false;
      checkinBtn.textContent = "完成打卡";
      hintEl.textContent = "选好行为后，点一下就能记下今天的减碳量。";
    }
  }

  checkinBtn.addEventListener("click", function () {
    var ids = Object.keys(selected);
    if (ids.length === 0) {
      hintEl.textContent = "先选择至少一个低碳行为哦。";
      return;
    }

    var total = ids.reduce(function (sum, id) {
      var action = ACTIONS.find(function (item) {
        return item.id === id;
      });
      return sum + action.co2;
    }, 0);

    var records = getRecords();
    records[window.EcoTracker.todayKey] = {
      date: window.EcoTracker.todayKey,
      actions: ids,
      co2: total
    };
    saveRecords(records);

    selected = {};
    refreshSelection();
    syncTodayState();

    // 通知 stats.js 刷新统计。
    window.dispatchEvent(new CustomEvent("ecotracker:update"));
  });

  renderActions();
  refreshSelection();
  syncTodayState();
  if (todayDateEl) {
    todayDateEl.textContent = todayLabel();
  }
})();
