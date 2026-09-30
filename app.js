/* 우리 반 목표 게이지 — 동작 코드 */
(function () {
  "use strict";

  var KEY = "cg-v1";
  var THEMES = window.CG_THEMES, MILES = window.CG_MILESTONES;
  var app = document.getElementById("app");
  var modal = document.getElementById("modal"), modalCard = document.getElementById("modalCard");
  var S = load();
  var lastShown = { points: S.points };

  /* ---------- 저장 ---------- */
  function fresh() {
    return {
      goal: JSON.parse(JSON.stringify(window.CG_DEFAULT_GOAL)),
      points: 0, log: [], hall: [], startedAt: Date.now(), celebrated: false, show: false,
      reasons: JSON.parse(JSON.stringify(window.CG_REASONS))
    };
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.goal && Array.isArray(d.reasons)) return d;
    } catch (e) {}
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- 도우미 ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pct() { return Math.min(100, Math.round((S.points / S.goal.target) * 100)); }
  function daysSince(t) { return Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1); }
  function stamp(t) { var d = new Date(t); return (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function dateStr(t) { var d = new Date(t); return d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate(); }
  function rewardText(r) { return r && String(r).trim() ? r : ""; }
  function isToday(t) { return new Date(t).toDateString() === new Date().toDateString(); }
  var toastEl;
  function toast(msg, ms) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 2000);
  }
  function openModal(html, center) { modalCard.className = "modal-card" + (center ? " center" : ""); modalCard.innerHTML = html; modal.hidden = false; }
  function closeModal() { modal.hidden = true; modalCard.innerHTML = ""; }
  modal.addEventListener("click", function (e) { if (e.target === modal && !modal.dataset.lock) closeModal(); });

  /* ---------- 화면 ---------- */
  function render() {
    document.body.classList.toggle("show", !!S.show);
    document.getElementById("btnShow").classList.toggle("on", !!S.show);
    document.getElementById("btnShow").textContent = S.show ? "✏️ 점수 주기 모드" : "📺 발표 모드";

    var reasons = S.reasons.map(function (r, i) {
      return '<button type="button" class="rbtn" data-r="' + i + '">' + (i < 9 ? '<span class="key">' + (i + 1) + "</span>" : "") +
        '<span class="re">' + r.e + "</span><span>" + esc(r.label) + '</span><span class="rp">+' + r.pts + "</span></button>";
    }).join("");
    var today = S.log.filter(function (l) { return isToday(l.t); }).reduce(function (s, l) { return s + l.pts; }, 0);

    app.innerHTML =
      '<div class="layout">' +
        '<section class="card goal-card">' +
          '<h1 class="goal-title">' + esc(S.goal.title || "우리 반 목표") + "</h1>" +
          (rewardText(S.goal.reward)
            ? '<div class="reward-pill">' + S.goal.rewardE + " 보상: " + esc(S.goal.reward) + "</div>"
            : '<button type="button" class="reward-pill" id="setReward" style="border:2px dashed #f2b27a;cursor:pointer">🎁 보상은 아이들과 약속해서 적어 주세요 ✏️</button>') +
          '<div class="visual" id="visual"></div>' +
          '<div class="gauge"><div class="gauge-track"><div class="gauge-fill" id="fill" style="width:' + pct() + '%"></div><div class="gauge-ticks">' +
            [25, 50, 75].map(function (p) { return '<span style="left:' + p + '%"></span>'; }).join("") + "</div></div>" +
            '<div class="gauge-nums"><div class="big-score" id="score">' + S.points + "<small> / " + S.goal.target + '점</small></div><div class="left-msg" id="leftMsg"></div></div>' +
          "</div>" +
        "</section>" +
        '<aside class="side">' +
          '<section class="card"><h3>✨ 점수 주기</h3><div class="reasons">' + reasons + "</div>" +
            '<div class="custom"><input id="cLabel" maxlength="20" placeholder="다른 이유 (예: 발표 잘했어요)"><input id="cPts" type="number" min="1" max="50" value="1"><button type="button" class="secondary" id="cAdd">+ 주기</button></div>' +
            '<div class="undo-row"><span class="muted small">💡 키보드 숫자 1~9로도 줄 수 있어요</span><button type="button" class="danger" id="undo">↩️ 방금 것 취소</button></div>' +
          "</section>" +
          '<section class="card"><div class="stats-row">' +
            "<div><b>+" + today + "</b>오늘 모은 점수</div>" +
            "<div><b>" + daysSince(S.startedAt) + "일째</b>이 목표 도전</div>" +
            "<div><b>" + S.hall.length + "번</b>목표 달성</div>" +
            '</div><h3>📜 점수 기록</h3><ul class="log" id="log"></ul></section>' +
        "</aside>" +
      "</div>";

    Array.prototype.forEach.call(app.querySelectorAll(".rbtn"), function (b) {
      b.onclick = function () { var r = S.reasons[+b.getAttribute("data-r")]; add(r.pts, r.label, r.e, b); };
    });
    document.getElementById("cAdd").onclick = function () {
      var l = document.getElementById("cLabel").value.trim() || "특별 점수";
      var p = Math.max(1, Math.min(50, parseInt(document.getElementById("cPts").value, 10) || 1));
      add(p, l, "⭐", document.getElementById("cAdd"));
      document.getElementById("cLabel").value = "";
    };
    document.getElementById("undo").onclick = undo;
    var sr = document.getElementById("setReward"); if (sr) sr.onclick = function () { settings(false); setTimeout(function () { var i = document.getElementById("gReward"); if (i) i.focus(); }, 50); };
    drawVisual(0);
    drawLog(false);
    updateNums();
  }

  function updateNums() {
    var s = document.getElementById("score");
    s.innerHTML = S.points + "<small> / " + S.goal.target + "점</small>";
    s.classList.remove("score-bump"); void s.offsetWidth; s.classList.add("score-bump");
    document.getElementById("fill").style.width = pct() + "%";
    var left = S.goal.target - S.points;
    document.getElementById("leftMsg").textContent = left > 0 ? "🎯 " + left + "점만 더 모으면 보상!" : "🎉 목표 달성!";
  }

  function drawLog(animate) {
    var el = document.getElementById("log");
    if (!S.log.length) { el.innerHTML = '<li><span class="le">🌱</span><span class="muted">아직 기록이 없어요. 첫 점수를 줘 볼까요?</span><span></span></li>'; return; }
    el.innerHTML = S.log.slice(-40).reverse().map(function (l, i) {
      return '<li class="' + (animate && i === 0 ? "new" : "") + '"><span class="le">' + l.e + "</span><span>" + esc(l.label) + '<div class="lt">' + stamp(l.t) + '</div></span><span class="lp">+' + l.pts + "</span></li>";
    }).join("");
  }

  /* ---------- 게이지 그림 ---------- */
  function drawVisual(added) {
    var v = document.getElementById("visual"); if (!v) return;
    var th = S.goal.theme;
    if (th === "tree") drawTree(v, added);
    else if (th === "rocket") drawRocket(v, added);
    else drawJar(v, added);
  }

  var jarCache = {};
  function jarSlots(n) {
    if (jarCache[n]) return jarCache[n];
    var x0 = 42, x1 = 258, yb = 352, yt = 118, area = (x1 - x0) * (yb - yt);
    var r = Math.max(3.5, Math.min(22, Math.sqrt(0.82 * area / (n * Math.PI))));
    var pts;
    for (var tries = 0; tries < 40; tries++) {
      pts = [];
      var dy = r * Math.sqrt(3);
      for (var row = 0; ; row++) {
        var y = yb - r - row * dy;
        if (y < yt + r) break;
        var off = row % 2 ? r : 0;
        for (var x = x0 + r + off; x <= x1 - r + 0.01; x += 2 * r) {
          var jx = Math.sin((row + 1) * 12.9898 + x) * r * 0.08, jy = Math.cos((row + 3) * 78.233 + x) * r * 0.08;
          pts.push([x + jx, y + jy]);
        }
      }
      if (pts.length >= n) break;
      r *= 0.95;
    }
    jarCache[n] = { r: r, pts: pts.slice(0, n) };
    return jarCache[n];
  }
  var MARBLE = ["#ff6b6b", "#ffb347", "#ffd93d", "#6bcB77", "#4d96ff", "#9b72cf", "#ff8fab", "#2ec4b6"];
  function drawJar(v, added) {
    var n = S.goal.target, shown = Math.min(S.points, n), slot = jarSlots(n), r = slot.r;
    var marbles = "";
    for (var i = 0; i < shown; i++) {
      var p = slot.pts[i], c = MARBLE[(i * 5 + Math.floor(i / 7)) % MARBLE.length];
      var isNew = added > 0 && i >= shown - added;
      var delay = isNew ? ((i - (shown - added)) * 0.08).toFixed(2) : 0;
      marbles += '<g class="marble' + (isNew ? " drop" : "") + '" style="animation-delay:' + delay + 's">' +
        '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (r * 0.94).toFixed(1) + '" fill="' + c + '"/>' +
        '<circle cx="' + (p[0] - r * 0.32).toFixed(1) + '" cy="' + (p[1] - r * 0.32).toFixed(1) + '" r="' + (r * 0.28).toFixed(1) + '" fill="#fff" opacity=".55"/></g>';
    }
    var jar = "M95,20 h110 v35 q0,12 20,22 q45,22 45,70 v193 q0,40 -40,40 h-160 q-40,0 -40,-40 v-193 q0,-48 45,-70 q20,-10 20,-22 z";
    v.innerHTML =
      '<svg class="jar-svg" viewBox="0 0 300 390" role="img" aria-label="구슬 병: ' + shown + "개 / " + n + '개">' +
        '<defs><clipPath id="jc"><path d="' + jar + '"/></clipPath></defs>' +
        '<path d="' + jar + '" fill="#f3fbff" stroke="#bcd9ea" stroke-width="6"/>' +
        '<g clip-path="url(#jc)">' + marbles + "</g>" +
        '<path d="M58,160 q-6,70 0,150" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>' +
        '<rect x="85" y="8" width="130" height="24" rx="10" fill="#c99a6b"/>' +
      "</svg>";
  }

  var TREE_STAGES = [[0, "🌰", "씨앗을 심었어요"], [10, "🌱", "새싹이 났어요"], [30, "🌿", "쑥쑥 자라요"], [55, "🌳", "나무가 되었어요"], [80, "🌳", "꽃이 피었어요"], [100, "🌳", "열매가 가득!"]];
  var FRUIT_POS = [[30, 18], [62, 14], [44, 30], [24, 38], [70, 34], [52, 10], [36, 22], [60, 44], [40, 44], [28, 26]];
  function drawTree(v, added) {
    var p = pct(), st = TREE_STAGES[0];
    TREE_STAGES.forEach(function (s) { if (p >= s[0]) st = s; });
    var size = "max(64px, " + (8 + p * 0.28).toFixed(1) + "vh)";
    var fruits = "";
    if (p >= 55) {
      var cnt = Math.min(FRUIT_POS.length, Math.floor((p - 50) / 5));
      for (var i = 0; i < cnt; i++) {
        var f = FRUIT_POS[i];
        fruits += '<span class="fruit" style="left:calc(50% + ' + (f[0] - 48) * 0.3 + 'vh);top:' + (f[1] * 0.9 + 4) + '%">' + (p >= 80 ? "🍎" : "🌸") + "</span>";
      }
    }
    v.innerHTML = '<div class="tree' + (added ? " grow" : "") + '">' + fruits + '<div class="plant" style="font-size:' + size + '">' + st[1] + '</div><div class="ground"></div><div class="stage">' + st[2] + " (" + p + "%)</div></div>";
  }

  function drawRocket(v, added) {
    var p = pct();
    var stars = "";
    for (var i = 0; i < 28; i++) stars += '<span class="star" style="left:' + ((i * 37) % 100) + "%;top:" + ((i * 53) % 90) + '%">✦</span>';
    var marks = [25, 50, 75].map(function (m) { return '<span class="pct-mark" style="bottom:calc(76px + (100% - 156px) * ' + m / 100 + ')">' + m + "%</span>"; }).join("");
    v.innerHTML = '<div class="space">' + stars + '<div class="moon">🌕</div><div class="track"></div>' + marks +
      '<div class="rocket' + (added ? " boost" : "") + '" id="rocket" style="bottom:calc(76px + (100% - 156px) * ' + p / 100 + ')">🚀</div><div class="earth">🌍</div></div>';
    if (added) setTimeout(function () { var r = document.getElementById("rocket"); if (r) r.classList.remove("boost"); }, 1200);
  }

  /* ---------- 점수 ---------- */
  function add(pts, label, e, srcEl) {
    var before = pct();
    S.points += pts;
    S.log.push({ t: Date.now(), pts: pts, label: label, e: e });
    if (S.log.length > 500) S.log = S.log.slice(-500);
    save();
    updateNums(); drawVisual(pts); drawLog(true);
    refreshStats();
    if (srcEl) {
      var rc = srcEl.getBoundingClientRect(), f = document.createElement("div");
      f.className = "float"; f.textContent = "+" + pts;
      f.style.left = (rc.left + rc.width / 2) + "px"; f.style.top = (rc.top - 10) + "px";
      document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1200);
    }
    var after = pct();
    if (after >= 100 && !S.celebrated) { S.celebrated = true; save(); setTimeout(celebrate, 900); return; }
    MILES.forEach(function (m) { if (before < m.at && after >= m.at) toast(m.e + " " + m.text, 3000); });
  }

  function undo() {
    var l = S.log.pop();
    if (!l) { toast("취소할 기록이 없어요"); return; }
    S.points = Math.max(0, S.points - l.pts);
    if (pct() < 100) S.celebrated = false;
    save(); updateNums(); drawVisual(0); drawLog(false); refreshStats();
    toast("↩️ '" + l.label + " +" + l.pts + "'을(를) 취소했어요");
  }

  function refreshStats() {
    var today = S.log.filter(function (l) { return isToday(l.t); }).reduce(function (s, l) { return s + l.pts; }, 0);
    var b = app.querySelectorAll(".stats-row b");
    if (b.length === 3) { b[0].textContent = "+" + today; b[1].textContent = daysSince(S.startedAt) + "일째"; b[2].textContent = S.hall.length + "번"; }
  }

  /* ---------- 목표 달성 ---------- */
  function celebrate() {
    confetti();
    var days = daysSince(S.startedAt);
    openModal(
      '<div class="huge">' + S.goal.rewardE + '</div><div class="celebrate-title">🎉 목표 달성! 🎉</div>' +
      '<p class="muted" style="margin:0">우리 반이 ' + days + "일 동안 힘을 모아 " + S.points + "점을 모았어요!</p>" +
      '<div class="celebrate-reward">🎁 ' + esc(rewardText(S.goal.reward) || "우리가 약속한 보상") + "</div>" +
      '<div class="btn-row"><button type="button" class="primary" id="toHall">🏆 명예의 전당에 올리고 새 목표 정하기</button>' +
      '<button type="button" class="secondary" id="later">나중에 할게요</button></div>', true);
    document.getElementById("toHall").onclick = function () {
      S.hall.push({ title: S.goal.title, reward: S.goal.reward, rewardE: S.goal.rewardE, target: S.goal.target, points: S.points, start: S.startedAt, end: Date.now() });
      save(); settings(true);
    };
    document.getElementById("later").onclick = closeModal;
  }

  function confetti() {
    var em = ["🎉", "⭐", "🎊", "💛", S.goal.rewardE, "✨"];
    for (var i = 0; i < 50; i++) {
      var s = document.createElement("span");
      s.className = "confetti"; s.textContent = em[i % em.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
      s.style.animationDelay = Math.random() * 1.5 + "s";
      document.body.appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 7000); })(s);
    }
  }

  /* ---------- 설정 ---------- */
  function settings(isNew) {
    var g = isNew ? { title: "", reward: "", rewardE: S.goal.rewardE, target: S.goal.target, theme: S.goal.theme } : JSON.parse(JSON.stringify(S.goal));
    var reasons = JSON.parse(JSON.stringify(S.reasons));

    function chips(list, cur, attr, text) {
      return '<div class="chips' + (text ? " text" : "") + '">' + list.map(function (x) {
        var val = typeof x === "object" ? x.v : x, lab = typeof x === "object" ? x.l : x;
        return '<button type="button" data-' + attr + '="' + esc(val) + '" class="' + (String(val) === String(cur) ? "on" : "") + '">' + lab + "</button>";
      }).join("") + "</div>";
    }
    function reasonRows() {
      return reasons.map(function (r, i) {
        return '<div class="rrow"><input data-f="e" data-i="' + i + '" value="' + esc(r.e) + '" maxlength="4"><input data-f="label" data-i="' + i + '" value="' + esc(r.label) + '" maxlength="20">' +
          '<input data-f="pts" data-i="' + i + '" type="number" min="1" max="50" value="' + r.pts + '"><button type="button" class="x" data-del="' + i + '" title="지우기">✕</button></div>';
      }).join("");
    }
    function draw() {
      openModal(
        "<h2>" + (isNew ? "🎯 새 목표 정하기" : "⚙️ 설정") + "</h2>" +
        (isNew ? '<p class="muted" style="margin:0 0 10px">반 친구들과 함께 다음 목표와 보상을 정해 보세요!</p>' : "") +
        '<div class="form">' +
          '<label>목표 이름<input id="gTitle" maxlength="30" value="' + esc(g.title) + '" placeholder="예: 우리 반 두 번째 목표"></label>' +
          '<label>보상 <span class="hint">학급 회의에서 아이들과 함께 정해 보세요. 비워 두면 나중에 적을 수 있어요.</span><input id="gReward" maxlength="30" value="' + esc(g.reward) + '" placeholder="아이들과 약속한 보상을 적어요 (예: 영화 보는 날)"></label>' +
          '<label>보상 그림' + chips(window.CG_REWARD_EMOJIS, g.rewardE, "emo") + "</label>" +
          '<label>목표 점수 <span class="hint">구슬 병은 목표 점수만큼 구슬이 들어가요</span>' +
            '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + chips([20, 30, 50, 100, 150, 200], g.target, "tg", true) +
            '<input id="gTarget" type="number" min="5" max="500" value="' + g.target + '"></div></label>' +
          '<label>게이지 모양' + chips(Object.keys(THEMES).map(function (k) { return { v: k, l: THEMES[k].e + " " + THEMES[k].n }; }), g.theme, "th", true) + "</label>" +
          '<div class="section-title">✨ 점수 버튼 <span class="hint">그림 · 이유 · 점수</span></div>' +
          '<div id="rrows" style="display:grid;gap:6px">' + reasonRows() + '</div><div><button type="button" class="secondary" id="addR">+ 버튼 더하기</button></div>' +
          (isNew ? "" :
            '<div class="section-title">💾 백업과 초기화</div>' +
            '<p class="hint" style="margin:0">점수는 이 컴퓨터 브라우저에만 저장돼요. 컴퓨터를 바꾸기 전에 백업 파일을 받아 두세요.</p>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="secondary" id="exp">📥 백업 파일 받기</button>' +
            '<label class="secondary" style="display:inline-block;cursor:pointer;font-family:Jua,sans-serif;font-size:17px">📤 백업 불러오기<input type="file" id="imp" accept=".json,application/json" hidden></label>' +
            '<button type="button" class="danger" id="reset">🗑️ 모두 초기화</button></div>') +
        "</div>" +
        '<div class="btn-row"><button type="button" class="primary" id="saveBtn">' + (isNew ? "🚀 새 목표 시작!" : "저장") + "</button>" +
        (isNew ? "" : '<button type="button" class="secondary" id="cancel">닫기</button>') + "</div>");
      modal.dataset.lock = isNew ? "1" : "";
      bind();
    }
    function keep() {
      var t = document.getElementById("gTitle"); if (!t) return;
      g.title = t.value; g.reward = document.getElementById("gReward").value;
      g.target = parseInt(document.getElementById("gTarget").value, 10) || g.target;
      Array.prototype.forEach.call(modalCard.querySelectorAll("#rrows input"), function (inp) {
        var i = +inp.getAttribute("data-i"), f = inp.getAttribute("data-f");
        reasons[i][f] = f === "pts" ? (parseInt(inp.value, 10) || 1) : inp.value;
      });
    }
    function bind() {
      Array.prototype.forEach.call(modalCard.querySelectorAll("[data-emo]"), function (b) { b.onclick = function () { keep(); g.rewardE = b.getAttribute("data-emo"); draw(); }; });
      Array.prototype.forEach.call(modalCard.querySelectorAll("[data-tg]"), function (b) { b.onclick = function () { keep(); g.target = +b.getAttribute("data-tg"); draw(); }; });
      Array.prototype.forEach.call(modalCard.querySelectorAll("[data-th]"), function (b) { b.onclick = function () { keep(); g.theme = b.getAttribute("data-th"); draw(); }; });
      Array.prototype.forEach.call(modalCard.querySelectorAll("[data-del]"), function (b) { b.onclick = function () { keep(); reasons.splice(+b.getAttribute("data-del"), 1); draw(); }; });
      document.getElementById("addR").onclick = function () { keep(); reasons.push({ e: "⭐", label: "새 이유", pts: 1 }); draw(); };
      document.getElementById("saveBtn").onclick = function () {
        keep();
        g.title = g.title.trim() || (isNew ? "우리 반 " + (S.hall.length + 1) + "번째 목표" : "우리 반 목표");
        g.reward = g.reward.trim();
        g.target = Math.max(5, Math.min(500, g.target));
        reasons = reasons.filter(function (r) { return String(r.label).trim(); }).map(function (r) { return { e: String(r.e).trim() || "⭐", label: String(r.label).trim(), pts: Math.max(1, Math.min(50, r.pts)) }; });
        if (!reasons.length) reasons = JSON.parse(JSON.stringify(window.CG_REASONS));
        S.goal = g; S.reasons = reasons;
        if (isNew) { S.points = 0; S.log = []; S.startedAt = Date.now(); S.celebrated = false; }
        else if (pct() < 100) S.celebrated = false;
        save(); modal.dataset.lock = ""; closeModal(); render();
        toast(isNew ? "🚀 새 목표를 시작해요! 화이팅!" : "저장했어요");
        if (!isNew && pct() >= 100 && !S.celebrated) { S.celebrated = true; save(); setTimeout(celebrate, 500); }
      };
      var c = document.getElementById("cancel"); if (c) c.onclick = closeModal;
      var exp = document.getElementById("exp");
      if (exp) exp.onclick = function () {
        var blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = "우리반_목표게이지_백업_" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      };
      var imp = document.getElementById("imp");
      if (imp) imp.onchange = function () {
        var f = imp.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          try {
            var d = JSON.parse(rd.result);
            if (!d || !d.goal || !Array.isArray(d.reasons) || typeof d.points !== "number") throw 0;
            S = d; save(); closeModal(); render(); toast("백업을 불러왔어요!");
          } catch (e) { toast("⚠️ 올바른 백업 파일이 아니에요"); }
        };
        rd.readAsText(f);
      };
      var rs = document.getElementById("reset"), armed = false;
      if (rs) rs.onclick = function () {
        if (!armed) { armed = true; rs.classList.add("armed"); rs.textContent = "정말 모두 지울까요? 한 번 더!"; setTimeout(function () { armed = false; rs.classList.remove("armed"); rs.textContent = "🗑️ 모두 초기화"; }, 3000); return; }
        S = fresh(); save(); closeModal(); render(); toast("처음 상태로 돌아갔어요");
      };
    }
    draw();
  }

  function hall() {
    var list = S.hall.slice().reverse().map(function (h, i) {
      var days = Math.max(1, Math.floor((h.end - h.start) / 86400000) + 1);
      return '<div class="hi"><span class="he">' + h.rewardE + '</span><div><div class="ht">' + (S.hall.length - i) + ". " + esc(h.title) + '</div><div class="muted small">🎁 ' + esc(rewardText(h.reward) || "약속한 보상") + " · " + h.points + "점</div></div>" +
        '<div class="hd">' + dateStr(h.end) + "<br>" + days + "일 걸림</div></div>";
    }).join("");
    openModal("<h2>🏆 우리 반 명예의 전당</h2>" +
      (list ? '<div class="hall">' + list + "</div>" : '<div style="text-align:center;padding:20px"><div class="huge" style="font-size:80px">🏆</div><p class="muted">아직 달성한 목표가 없어요.<br>첫 번째 목표를 향해 힘을 모아 봐요!</p></div>') +
      '<div class="btn-row"><button type="button" class="secondary" id="hClose">닫기</button></div>');
    document.getElementById("hClose").onclick = closeModal;
  }

  /* ---------- 버튼과 키보드 ---------- */
  document.getElementById("btnSet").onclick = function () { settings(false); };
  document.getElementById("btnHall").onclick = hall;
  document.getElementById("btnShow").onclick = function () { S.show = !S.show; save(); render(); };
  document.addEventListener("keydown", function (e) {
    if (!modal.hidden) { if (e.key === "Escape" && !modal.dataset.lock) closeModal(); return; }
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (S.show) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9 && S.reasons[n - 1]) {
      var b = app.querySelector('.rbtn[data-r="' + (n - 1) + '"]');
      add(S.reasons[n - 1].pts, S.reasons[n - 1].label, S.reasons[n - 1].e, b);
    }
  });

  var firstRun = false;
  try { firstRun = !localStorage.getItem(KEY); } catch (e) {}
  render();
  if (firstRun) setTimeout(function () { settings(false); }, 300);
  if (S.celebrated && pct() >= 100) setTimeout(celebrate, 400);
})();
