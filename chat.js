/* Studio Zelika — widget czatu z AI konsultantką */
(function () {
  "use strict";

  var WORKER_URL = "https://zelika-chat.vadimzelinshy.workers.dev";
  var GREETING =
    "Cześć! \uD83D\uDC4B Jestem wirtualną konsultantką Studia Zelika. Chętnie pomogę dobrać zabieg, opowiem o metodach makijażu permanentnego, cenach albo umawianiu wizyty. O co chciałabyś zapytać?";

  var messages = []; // historia dla API: kolejno user / assistant, zaczyna się od user
  var busy = false;
  var greeted = false;

  var fab = document.getElementById("zchat-fab");
  var panel = document.getElementById("zchat-panel");
  var bodyEl = document.getElementById("zchat-body");
  var form = document.getElementById("zchat-form");
  var input = document.getElementById("zchat-input");
  var closeBtn = document.getElementById("zchat-close");
  if (!fab || !panel || !bodyEl || !form || !input) return;

  function scrollDown() {
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function render(text) {
    var h = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    h = h.replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      // Лінк на Booksy → кнопка, що відкриває вбудований оверлей (як на сайті),
      // а не перехід на booksy.com. data-booksy перехоплює booksy-fix.js;
      // якщо віджет не намалювався — спрацює звичайний href (фолбек).
      if (/booksy\.com/i.test(u)) {
        return (
          '<a href="' + u + '" data-booksy target="_blank" rel="noopener noreferrer" ' +
          'style="display:inline-block;margin:6px 0;background:#1f5e30;color:#fff;' +
          'padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:500">' +
          "📅 Rezerwuj wizytę</a>"
        );
      }
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>";
    });
    return h.replace(/\n/g, "<br>");
  }

  function addBubble(role, text) {
    var div = document.createElement("div");
    div.className = "zchat-msg " + role;
    div.innerHTML = render(text);
    bodyEl.appendChild(div);
    scrollDown();
    return div;
  }

  function showTyping() {
    var t = document.createElement("div");
    t.className = "zchat-msg bot zchat-typing";
    t.id = "zchat-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    bodyEl.appendChild(t);
    scrollDown();
  }
  function hideTyping() {
    var t = document.getElementById("zchat-typing");
    if (t) t.parentNode.removeChild(t);
  }

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    fab.classList.add("hidden");
    if (!greeted) {
      addBubble("bot", GREETING);
      greeted = true;
    }
    setTimeout(function () {
      input.focus();
    }, 200);
  }
  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    fab.classList.remove("hidden");
  }

  function send(text) {
    if (busy) return;
    busy = true;
    input.disabled = true;
    addBubble("user", text);
    messages.push({ role: "user", content: text });
    showTyping();

    fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        hideTyping();
        if (r.ok && r.data && r.data.reply) {
          addBubble("bot", r.data.reply);
          messages.push({ role: "assistant", content: r.data.reply });
        } else {
          var msg =
            (r.data && r.data.error) ||
            "Przepraszam, chwilowy problem. Spróbuj ponownie za moment.";
          addBubble("bot", msg);
        }
      })
      .catch(function () {
        hideTyping();
        addBubble(
          "bot",
          "Przepraszam, nie mogę teraz odpowiedzieć. Sprawdź połączenie i spróbuj ponownie."
        );
      })
      .then(function () {
        busy = false;
        input.disabled = false;
        input.focus();
      });
  }

  fab.addEventListener("click", openPanel);
  if (closeBtn) closeBtn.addEventListener("click", closePanel);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    send(text);
  });
})();
