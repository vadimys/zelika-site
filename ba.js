/* Suwak „przed/po” (#efekty). Pary renderuje Worker na serwerze (/api/content → before_after);
   tu tylko ruch suwaka. Brak par — sekcja zostaje hidden i nic się nie dzieje. */
(function () {
  "use strict";
  document.querySelectorAll("#efekty .ba").forEach(function (fig) {
    var r = fig.querySelector(".ba-range");
    if (!r) return;
    r.addEventListener("input", function () { fig.style.setProperty("--p", r.value + "%"); });
  });
})();
