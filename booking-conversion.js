/* Google Ads: konwersja „Rezerwacja - Umów wizytę" na klik CTA rezerwacji.
   Bazowy tag AW-18246998055 jest osobno w <head> (nie duplikujemy go tutaj).
   CTA rezerwacji na stronie = Booksy (overlay / nowa karta) → strzelamy event
   konwersji BEZ blokowania nawigacji. Wartość 200 PLN ustawiona po stronie
   Google Ads (nie przekazujemy z kodu). Consent Mode i tak decyduje, czy hit
   zostanie zapisany (po zgodzie użytkownika). */
(function () {
  "use strict";
  var SEND_TO = "AW-18246998055/ar6cCMSwhcocEKew7PxD";

  // Funkcja-reporter wg briefu (dla ewentualnych linków wewnętrznych / tel:).
  window.gtag_report_conversion = function (url) {
    var callback = function () {
      if (typeof url !== "undefined" && url) window.location = url;
    };
    if (window.gtag) {
      window.gtag("event", "conversion", { send_to: SEND_TO, event_callback: callback });
    } else {
      callback();
    }
    return false;
  };

  function fire() {
    if (window.gtag) window.gtag("event", "conversion", { send_to: SEND_TO });
  }

  // Delegacja: każdy klik w CTA rezerwacji (link [data-booksy] w nav/hero LUB
  // realny przycisk widgetu Booksy). Count=One po stronie Google dedupuje, więc
  // podwójne wywołanie (data-booksy → programowy klik przycisku) jest bezpieczne.
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (t && t.closest && (t.closest("[data-booksy]") || t.closest(".booksy-widget-button"))) {
        fire();
      }
    },
    true
  );
})();
