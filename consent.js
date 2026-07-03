/* Google tag (Google Ads AW-18246998055) + Consent Mode v2 + baner zgody.
   Domyślnie WSZYSTKO denied (RODO/ePrivacy) — tag ładuje się, ale bez cookies,
   dopóki użytkownik nie kliknie „Akceptuję". Wybór trzymamy w localStorage.
   Wszystko zewnętrznym plikiem, żeby nie ruszać hashy CSP dla skryptów inline. */
(function () {
  "use strict";
  var ID = "AW-18246998055";
  var GRANT = {
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  };
  var DENY = {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  var choice = null;
  try { choice = localStorage.getItem("zconsent"); } catch (e) {}

  gtag("consent", "default", Object.assign({ wait_for_update: 500 }, DENY));
  if (choice === "granted") gtag("consent", "update", GRANT);
  gtag("js", new Date());
  gtag("config", ID);
  // Uwaga: samo gtag.js ładujemy STATYCZNYM tagiem w <head> (zaraz po tym pliku),
  // żeby detektor Google widział go w źródle strony. Ten plik (synchroniczny)
  // ustawia zgodę „denied" ZANIM async gtag.js się wykona.

  // Styl banera (style-src 'unsafe-inline' pokrywa wstrzyknięty <style>).
  var css =
    "#zconsent-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#fffdf6;border-top:1px solid rgba(169,134,60,.3);box-shadow:0 -6px 24px rgba(31,94,48,.12);padding:14px 20px;display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap;font-family:'Jost',system-ui,sans-serif;font-weight:300;color:#272b22;font-size:.9rem}" +
    "#zconsent-bar .zc-txt{max-width:700px;line-height:1.5}" +
    "#zconsent-bar .zc-btns{display:flex;gap:10px;flex-shrink:0}" +
    "#zconsent-bar button{cursor:pointer;font-family:inherit;font-size:.85rem;letter-spacing:.02em;padding:10px 24px;border-radius:999px;border:1px solid #1f5e30;transition:.25s}" +
    "#zconsent-bar .zc-acc{background:#1f5e30;color:#fff}" +
    "#zconsent-bar .zc-acc:hover{background:#2f7d44}" +
    "#zconsent-bar .zc-rej{background:transparent;color:#1f5e30}" +
    "#zconsent-bar .zc-rej:hover{background:rgba(31,94,48,.08)}" +
    "@media(max-width:600px){#zconsent-bar{flex-direction:column;gap:12px;text-align:center}#zconsent-bar .zc-btns{width:100%}#zconsent-bar button{flex:1}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function setConsent(v) {
    try { localStorage.setItem("zconsent", v); } catch (e) {}
    if (v === "granted") gtag("consent", "update", GRANT);
    var bar = document.getElementById("zconsent-bar");
    if (bar) bar.remove();
  }

  function showBanner() {
    if (document.getElementById("zconsent-bar")) return;
    var bar = document.createElement("div");
    bar.id = "zconsent-bar";
    bar.innerHTML =
      '<div class="zc-txt">Ta strona używa plików cookie do celów analitycznych i marketingowych, aby ulepszać nasze usługi. Możesz zaakceptować lub odrzucić — Twój wybór zapamiętamy.</div>' +
      '<div class="zc-btns"><button type="button" class="zc-acc">Akceptuję</button><button type="button" class="zc-rej">Odrzucam</button></div>';
    document.body.appendChild(bar);
    bar.querySelector(".zc-acc").addEventListener("click", function () { setConsent("granted"); });
    bar.querySelector(".zc-rej").addEventListener("click", function () { setConsent("denied"); });
  }

  function init() {
    // Link „Cookies" w stopce → pozwala zmienić wybór.
    var links = document.querySelectorAll("[data-cookies]");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function (e) {
        e.preventDefault();
        try { localStorage.removeItem("zconsent"); } catch (_) {}
        showBanner();
      });
    }
    if (!choice) showBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
