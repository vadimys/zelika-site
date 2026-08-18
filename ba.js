/* Слайдер «до/після» (#efekty). Рендерить пари з window.ZELIKA_BA (ba-data.js).
   Порожньо → секція лишається hidden (нічого не показуємо). Чистий CSS+range. */
(function () {
  "use strict";
  var data = (window.ZELIKA_BA || []).filter(function (p) { return p && p.before && p.after; });
  var wrap = document.getElementById("ba-wrap");
  var sec = document.getElementById("efekty");
  if (!wrap || !sec || !data.length) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var tagB = sec.getAttribute("data-tag-before") || "Przed";
  var tagA = sec.getAttribute("data-tag-after") || "Po";

  wrap.innerHTML = data
    .map(function (p) {
      var cap = p.caption || "";
      return (
        '<figure class="ba" style="--p:50%">' +
        '<img class="ba-after" src="' + esc(p.after) + '" alt="' + esc(cap + " — " + tagA) + '" loading="lazy" decoding="async">' +
        '<img class="ba-before" src="' + esc(p.before) + '" alt="' + esc(cap + " — " + tagB) + '" loading="lazy" decoding="async">' +
        '<span class="ba-tag ba-tag-b">' + esc(tagB) + "</span><span class=\"ba-tag ba-tag-a\">" + esc(tagA) + "</span>" +
        '<span class="ba-handle" aria-hidden="true"></span>' +
        '<input class="ba-range" type="range" min="0" max="100" value="50" aria-label="' + esc(tagB + " / " + tagA) + '">' +
        (cap ? "<figcaption>" + esc(cap) + "</figcaption>" : "") +
        "</figure>"
      );
    })
    .join("");

  wrap.querySelectorAll(".ba").forEach(function (fig) {
    var r = fig.querySelector(".ba-range");
    r.addEventListener("input", function () { fig.style.setProperty("--p", r.value + "%"); });
  });
  sec.hidden = false;
})();
