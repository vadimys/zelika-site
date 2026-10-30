// ===== Studio Zelika — edge-SSR rubryki «Porady i inspiracje» =====
// Worker renderuje /porady (index) i /porady/<slug> jako gotowy HTML z danych
// bota (/api/posts) — pełne SEO (meta, OG, Article/Blog JSON-LD), natychmiastowa
// publikacja, jedno źródło prawdy w bocie. Tak samo strony usług /<slug> (/api/pages,
// tylko PL) i zdjęcia z bota /media/<id>.jpg. Reszta ścieżek → statyka (env.ASSETS).
// Nagłówek i integracja Booksy — spójne ze stroną główną (ten sam widget-overlay).

const SITE = "https://zelika.pl";
const BOOKSY = "https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun";
// Oficjalny publiczny adres widgetu (Booksy przekierowuje go 307 na bieżącą wersję
// /widget-2021/ — trzymamy się adresu z dokumentacji Booksy, nie wewnętrznej ścieżki).
const BOOKSY_WIDGET = "https://booksy.com/widget/code.js?id=334211&country=pl&lang=pl";
const SECTION_TITLE = "Porady i inspiracje";
const SECTION_DESC =
  "Porady, inspiracje i ciekawostki o makijażu permanentnym, brwiach i rzęsach — od Anny Zelinskiej, ekspertki PMU ze Studia Zelika w Wieluniu.";

// --- utils ---
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const str = (v) => (v == null ? "" : String(v).trim());

// Zdjęcia z bota (Immich → /api/media/<id>.jpg na hooks.zelika.pl) podajemy przez
// własny /media/<id>.jpg: CSP img-src 'self' bez poszerzania, cache krawędzi, jeden host.
// Pliki strony podane absolutnie (https://zelika.pl/img/…) → ścieżka względna ('self'
// także na www/podglądzie); og:image i tak robi z tego pełny adres (absImg).
const MEDIA_PREFIX = "https://hooks.zelika.pl/api/media/";
const MEDIA_FILE_RE = /^([A-Za-z0-9_-]{1,128})\.jpg$/;
const OWN_ORIGIN_RE = /^https:\/\/(www\.)?zelika\.pl(?=\/(?![\/\\]))/i;
function mediaSrc(img) {
  const s = str(img);
  if (OWN_ORIGIN_RE.test(s)) return s.replace(OWN_ORIGIN_RE, "");
  if (!s.startsWith(MEDIA_PREFIX)) return s;
  const m = s.slice(MEDIA_PREFIX.length).match(MEDIA_FILE_RE);
  return m ? `/media/${m[1]}.jpg` : "";
}
// Obraz strony usługi / galerii: zdjęcie z bota (→ /media/…) albo plik strony
// (/img/…, https://zelika.pl/…). Inne adresy pomijamy (CSP i tak by je zablokował).
function pageImgSrc(img) {
  const s = mediaSrc(img);
  return /^\/(?![\/\\])/.test(s) ? s : "";
}

// ── Galeria na stronie głównej z bota (/api/content → home_gallery) ──────────────
// Anna wybiera w bocie do 6 zdjęć z folderów prac (tylko za zgodą klientek) i usługę z cennika do
// każdego. Podpis — nazwa usługi i kategoria w języku strony. Pierwsze N kafelków .gitem dostaje
// zdjęcia z bota, reszta zostaje statyczna (już przetłumaczona przez [data-i18n]).
const GALLERY_MAX = 6;
const GALLERY_ALT = {
  pl: { suffix: "efekt zabiegu, Studio Zelika Wieluń", plain: "Realizacja Studia Zelika, Wieluń" },
  uk: { suffix: "результат процедури, студія Zelika, Велюнь", plain: "Робота студії Zelika, Велюнь" },
  en: { suffix: "treatment result, Zelika studio, Wieluń", plain: "Zelika studio work, Wieluń" },
};
function homeGallery(content, lang) {
  const list = content && Array.isArray(content.home_gallery) ? content.home_gallery : [];
  const items = new Map((content && Array.isArray(content.cennik_items) ? content.cennik_items : []).map((it) => [it && it.id, it]));
  const cats = new Map((content && Array.isArray(content.cennik_categories) ? content.cennik_categories : []).map((c) => [c && c.key, c]));
  const alt = GALLERY_ALT[lang] || GALLERY_ALT.pl;
  const out = [];
  for (const g of list) {
    if (out.length >= GALLERY_MAX) break;
    const url = g ? str(g.url) : "";
    if (!url.startsWith(MEDIA_PREFIX)) continue;
    const src = mediaSrc(url);
    if (!src) continue;
    const it = items.get(g.item);
    const title = it ? str((lang === "uk" && it.name_uk) || (lang === "en" && it.name_en) || it.name) : "";
    const c = it ? cats.get(it.category) : null;
    const sub = c ? str(c[lang] || c.pl) : "";
    out.push({ src, title, sub, alt: title ? `${title} — ${alt.suffix}` : alt.plain });
  }
  return out;
}
function galleryTileInner(t) {
  const label = t.title
    ? `<div class="glabel"><div class="gt">${esc(t.title)}</div>${t.sub ? `<div class="gs">${esc(t.sub)}</div>` : ""}</div>`
    : "";
  return `<img src="${esc(t.src)}" width="740" height="986" alt="${esc(t.alt)}" loading="lazy" decoding="async">${label}`;
}

// ── Zdjęcia studia w „O mnie” z bota (/api/content → about_photos) ───────────────
// Anna wybiera w bocie do 3 zdjęć z folderu „Studio i mistrzyni”. Portret zostaje; pasek pod
// statystykami. Brak zdjęć — brak paska (strona jak dotąd).
const ABOUT_MAX = 3;
const ABOUT_ALT = { pl: "Studio Zelika w Wieluniu", uk: "Студія Zelika у Велюні", en: "Zelika studio in Wieluń" };
function aboutPhotos(content, lang) {
  const list = content && Array.isArray(content.about_photos) ? content.about_photos : [];
  const srcs = [];
  for (const p of list) {
    if (srcs.length >= ABOUT_MAX) break;
    const url = p ? str(p.url) : "";
    if (!url.startsWith(MEDIA_PREFIX)) continue;
    const src = mediaSrc(url);
    if (src) srcs.push(src);
  }
  const alt = ABOUT_ALT[lang] || ABOUT_ALT.pl;
  return srcs.map((src, i) => ({ src, alt: srcs.length > 1 ? `${alt} (${i + 1}/${srcs.length})` : alt }));
}
function aboutStudioHtml(photos) {
  const figs = photos
    .map((p) => `<figure><img src="${esc(p.src)}" width="640" height="480" alt="${esc(p.alt)}" loading="lazy" decoding="async"></figure>`)
    .join("");
  return `<div class="about-studio reveal d3">${figs}</div>`;
}

// ── Przed i po z bota (/api/content → before_after) ──────────────────────────────
// Anna składa w bocie do 3 par: zdjęcie „przed”, „po” (tuż po zabiegu albo po wygojeniu) i usługa z cennika.
// Suwaki renderujemy na serwerze (CSP nie przepuszcza skryptów inline); ba.js tylko porusza suwakiem.
// Brak par — sekcja #efekty zostaje ukryta.
const BA_MAX = 3;
const BA_TAGS = {
  pl: { before: "Przed", fresh: "Po zabiegu", healed: "Po wygojeniu", plain: "Realizacja Studia Zelika" },
  uk: { before: "До", fresh: "Одразу після", healed: "Після загоєння", plain: "Робота студії Zelika" },
  en: { before: "Before", fresh: "Right after", healed: "Healed", plain: "Zelika studio work" },
};
function beforeAfter(content, lang) {
  const list = content && Array.isArray(content.before_after) ? content.before_after : [];
  const items = new Map((content && Array.isArray(content.cennik_items) ? content.cennik_items : []).map((it) => [it && it.id, it]));
  const out = [];
  for (const p of list) {
    if (out.length >= BA_MAX) break;
    if (!p || (p.kind !== "fresh" && p.kind !== "healed")) continue;
    const urls = [str(p.before), str(p.after)];
    if (!urls.every((u) => u.startsWith(MEDIA_PREFIX))) continue;
    const [before, after] = urls.map(mediaSrc);
    if (!before || !after) continue;
    const it = items.get(p.item);
    const title = it ? str((lang === "uk" && it.name_uk) || (lang === "en" && it.name_en) || it.name) : "";
    out.push({ before, after, kind: p.kind, title });
  }
  return out;
}
function baHtml(pairs, lang) {
  const t = BA_TAGS[lang] || BA_TAGS.pl;
  return pairs
    .map((p) => {
      const tagA = t[p.kind];
      const name = p.title || t.plain;
      return (
        `<figure class="ba reveal d3" style="--p:50%">` +
        `<img class="ba-after" src="${esc(p.after)}" width="800" height="1000" alt="${esc(`${name} — ${tagA.toLowerCase()}`)}" loading="lazy" decoding="async">` +
        `<img class="ba-before" src="${esc(p.before)}" width="800" height="1000" alt="${esc(`${name} — ${t.before.toLowerCase()}`)}" loading="lazy" decoding="async">` +
        `<span class="ba-tag ba-tag-b">${esc(t.before)}</span><span class="ba-tag ba-tag-a">${esc(tagA)}</span>` +
        `<span class="ba-handle" aria-hidden="true"></span>` +
        `<input class="ba-range" type="range" min="0" max="100" value="50" aria-label="${esc(`${t.before} / ${tagA}`)}">` +
        (p.title ? `<figcaption>${esc(p.title)}</figcaption>` : "") +
        `</figure>`
      );
    })
    .join("");
}

// Zdjęcia strony /img/photo-N.jpg: obok leży wersja WebP (img/photo-N.webp), a wymiary są
// znane (width/height → miejsce zarezerwowane przed wczytaniem, bez skoku układu / CLS).
// <picture>: WebP dla przeglądarek, które go obsługują, JPG jako zapas; og:image dalej JPG.
// Inne obrazy (np. /media/<id>.jpg z bota) — zwykły <img>. attrs — gotowe, escapowane.
const SITE_IMG_SIZES = {
  "/img/photo-1.jpg": [880, 1100],
  "/img/photo-2.jpg": [820, 1025],
  "/img/photo-3.jpg": [740, 986],
  "/img/photo-4.jpg": [740, 986],
  "/img/photo-5.jpg": [740, 986],
  "/img/photo-6.jpg": [740, 986],
  "/img/photo-7.jpg": [740, 986],
  "/img/photo-8.jpg": [740, 986],
};
function imgHtml(src, attrs = "") {
  const size = SITE_IMG_SIZES[src];
  const img = `<img src="${esc(src)}"${size ? ` width="${size[0]}" height="${size[1]}"` : ""}${attrs}>`;
  return size ? `<picture><source type="image/webp" srcset="${esc(src.slice(0, -4))}.webp">${img}</picture>` : img;
}

function absImg(img) {
  img = mediaSrc(img);
  if (!img) return SITE + "/og-image.jpg";
  return /^https?:\/\//.test(img) ? img : SITE + (img.startsWith("/") ? img : "/" + img);
}

function excerpt(post, n = 155, parseOpts) {
  // bez meta_description — tekst treści bez znaczników (##, **, [](…))
  const base = post.meta_description || parseBody(post.body, parseOpts).map(blockText).join(" ");
  const flat = String(base).replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n - 1).trimEnd() + "…" : flat;
}

function plDate(iso) {
  if (!iso) return "";
  const m = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${d.getUTCDate()} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Treść porady: podzbiór Markdown (wspólny kontrakt z botem, blog v2) ────────
// Linia po linii: „## ”/„### ” → <h2>/<h3> (zawsze osobno); „- ” → <ul>,
// „1. ” → <ol> (sąsiednie punkty — jedna lista, pusta linia między punktami jej
// nie przerywa); pozostałe sąsiednie linie → jeden <p> (pusta linia rozdziela
// akapity). W tekście: **pogrubienie** i [tekst](adres). Wszystko inne — także
// HTML i niedomknięte ** — to zwykły, escapowany tekst.
// Strony usług (opts.markers): linia „[[cennik]]” / „[[galeria]]” → osobny blok
// { type: "marker" } — w to miejsce strona wstawia cennik / galerię. W poradach
// (bez opcji) taka linia zostaje zwykłym tekstem, jak dotąd.
const LIST_RE = /^(?:-|(\d{1,3})\.)\s+(.+)$/;
const MARKER_RE = /^\[\[(cennik|galeria)\]\]$/i;
function parseBody(body, opts = {}) {
  const blocks = [];
  let open = null; // akapit albo lista, do której trafiają kolejne linie
  for (const raw of String(body || "").replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    const m = line.match(LIST_RE);
    const mk = opts.markers ? line.match(MARKER_RE) : null;
    if (!line) {
      if (open && open.type === "p") open = null;
    } else if (mk) {
      blocks.push({ type: "marker", name: mk[1].toLowerCase() });
      open = null;
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      const h3 = line.startsWith("### ");
      blocks.push({ type: h3 ? "h3" : "h2", text: line.slice(h3 ? 4 : 3).trim() });
      open = null;
    } else if (m) {
      const type = m[1] ? "ol" : "ul";
      if (!open || open.type !== type) {
        open = { type, start: m[1] ? Number(m[1]) : 1, items: [] };
        blocks.push(open);
      }
      open.items.push(m[2]);
    } else if (open && open.type === "p") {
      open.lines.push(line);
    } else {
      open = { type: "p", lines: [line] };
      blocks.push(open);
    }
  }
  return blocks;
}

// Tekst w linii → tokeny: tekst, link [etykieta](adres), ogranicznik **.
// ** otwiera, gdy tuż za nim nie ma spacji; zamyka, gdy tuż przed nim nie ma
// spacji. Parowanie stosem → <strong> zawsze poprawnie zagnieżdżone; link jest
// niepodzielny (** z etykiety nie paruje się z ** spoza niej).
const INLINE_RE = /\[([^\[\]\n]+)\]\(([^\s()]*)\)|\*\*/g;
function inlineTokens(s) {
  const toks = [];
  let last = 0;
  for (const m of s.matchAll(INLINE_RE)) {
    if (m.index > last) toks.push({ text: s.slice(last, m.index) });
    if (m[1] != null) {
      toks.push({ label: m[1], url: m[2] });
    } else {
      const before = s[m.index - 1];
      const after = s[m.index + 2];
      toks.push({ delim: true, open: !!after && !/\s/.test(after), close: !!before && !/\s/.test(before) });
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) toks.push({ text: s.slice(last) });
  const stack = [];
  toks.forEach((t, i) => {
    if (!t.delim) return;
    const top = stack[stack.length - 1];
    if (t.close && top !== undefined && top < i - 1) {
      stack.pop();
      toks[top].pair = "open";
      t.pair = "close";
    } else if (t.open) {
      stack.push(i);
    }
  });
  return toks;
}

// Adres linku z treści: względny adres strony (/…, /#…; nie //… ani /\…) albo
// https://. Zwraca { external } albo null — wtedy zostaje sama etykieta (tekst).
function linkTarget(url) {
  if (/^\/(?![\/\\])/.test(url)) return { external: false };
  if (!/^https:\/\//i.test(url)) return null;
  let host;
  try {
    host = new URL(url).hostname;
  } catch (_) {
    return null;
  }
  if (!host) return null;
  return { external: !(host === "zelika.pl" || host.endsWith(".zelika.pl")) };
}

function inlineHtml(s) {
  return inlineTokens(s)
    .map((t) => {
      if (t.text != null) return esc(t.text);
      if (t.delim) return t.pair === "open" ? "<strong>" : t.pair === "close" ? "</strong>" : "**";
      const label = inlineHtml(t.label);
      const link = linkTarget(t.url);
      if (!link) return label;
      return `<a href="${esc(t.url)}"${link.external ? ' rel="noopener" target="_blank"' : ""}>${label}</a>`;
    })
    .join("");
}

// Ten sam tekst bez znaczników (FAQPage JSON-LD, opis z treści).
function inlineText(s) {
  return inlineTokens(s)
    .map((t) => (t.text != null ? t.text : t.delim ? (t.pair ? "" : "**") : inlineText(t.label)))
    .join("");
}

function blockText(b) {
  if (b.type === "marker" || b.type === "html") return "";
  if (b.type === "p") return inlineText(b.lines.join(" "));
  if (b.type === "ul") return b.items.map((it) => "• " + inlineText(it)).join("\n");
  if (b.type === "ol") return b.items.map((it, i) => `${b.start + i}. ${inlineText(it)}`).join("\n");
  return inlineText(b.text);
}

// Bloki „html” to gotowe fragmenty wstawione przez stronę usługi (cennik, galeria) —
// budowane z escapowanych danych; „marker” bez podstawienia nie renderuje nic.
function renderBody(blocks) {
  return blocks
    .map((b) => {
      if (b.type === "html") return b.html;
      if (b.type === "marker") return "";
      if (b.type === "p") return `<p>${inlineHtml(b.lines.join(" "))}</p>`;
      if (b.type === "ul" || b.type === "ol") {
        const start = b.type === "ol" && b.start !== 1 ? ` start="${b.start}"` : "";
        return `<${b.type}${start}>\n${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join("\n")}\n</${b.type}>`;
      }
      return `<${b.type}>${inlineHtml(b.text)}</${b.type}>`;
    })
    .join("\n");
}

// FAQ porady: „## Najczęstsze pytania” (lub „## FAQ”), w nim „### Pytanie?”, a
// odpowiedź to akapity/listy aż do następnego nagłówka. Pary bez odpowiedzi
// pomijamy. Format { ok, q, a } — jak dla faqPageLd().
const FAQ_H2 = /^(najczęstsze pytania( \(faq\))?|faq)$/;
const isFaqH2 = (b) =>
  b.type === "h2" &&
  FAQ_H2.test(inlineText(b.text).normalize("NFC").toLowerCase().replace(/\s+/g, " ").replace(/[\s:]+$/, ""));
function bodyFaq(blocks) {
  const qa = [];
  let inFaq = false;
  let cur = null;
  for (const b of blocks) {
    if (b.type === "h2") {
      inFaq = isFaqH2(b);
      cur = null;
    } else if (!inFaq) {
      continue;
    } else if (b.type === "h3") {
      cur = { ok: true, q: inlineText(b.text).trim(), a: [] };
      qa.push(cur);
    } else if (cur && b.type !== "marker" && b.type !== "html") {
      cur.a.push(blockText(b));
    }
  }
  return qa.map((x) => ({ ...x, a: x.a.join("\n").trim() })).filter((x) => x.q && x.a);
}

// Data ostatniej zmiany: updated_at (bot ustawia przy każdej poprawce
// opublikowanej porady), ale nigdy wcześniejsza niż published_at.
function modifiedAt(post) {
  const pub = str(post.published_at);
  const upd = str(post.updated_at);
  const tu = Date.parse(upd);
  const tp = Date.parse(pub);
  return !isNaN(tu) && (isNaN(tp) || tu > tp) ? upd : pub;
}

// ── Dane z bota (/api/content, /api/posts) ─────────────────────────────────────
// Serwer domowy bywa wolny albo niedostępny, a strona NIE może wtedy zwalniać,
// gubić cennika ani oddawać artykułu jako 404+noindex. Model: stale-while-revalidate
// na Cache API (KV niedostępne) + znacznik „origin leży”.
//   • Jest kopia (ostatnia udana odpowiedź, nazwany cache, 30 dni):
//       młodsza niż API_FRESH_S → podajemy od razu;
//       starsza → podajemy od razu i odświeżamy w tle (ctx.waitUntil).
//     Ceny zmieniają się więc na stronie w ciągu ~API_FRESH_S + API_EDGE_TTL.
//   • Brak kopii → jedno blokujące pobranie z krótkim timeoutem.
//   • Błąd/timeout originu → znacznik „down” na API_DOWN_TTL: kolejne żądania nie
//     czekają ponownie na timeout (kopia albo od razu brak danych).
//   • 404 to „naprawdę nie ma” TYLKO dla pojedynczego artykułu/strony (kasuje jego kopię);
//     404 z list (/api/content, /api/posts, /api/pages) = awaria (kopia zostaje, 404 się
//     nie cache'uje).
//   • Strony usług (/api/pages…) są dodatkiem: ich awaria (także timeout) stawia znacznik
//     tylko dla własnej ścieżki (ownDown) — nie wyłącza cennika ani bloga. Strona główna
//     czyta listę stron „miękko” (soft): bez kopii nie czeka, tylko pobiera ją w tle.
// Kopia jest per data center i może zostać wyrzucona z cache — wtedy działa
// blokujące pobranie, a przy awarii statyczny fallback (index.html) / 503 dla bloga.
const API_BASE = "https://hooks.zelika.pl"; // nadpisywalne zmienną env.API_BASE (staging/testy)
const API_TIMEOUT_MS = 1500; // pobranie blokujące stronę (brak kopii)
const API_BG_TIMEOUT_MS = 5000; // odświeżenie w tle (nie blokuje strony)
const API_FRESH_S = 240; // kopia młodsza → bez odświeżania
const API_EDGE_TTL = 60; // cache krawędzi dla fetch → origin (skleja równoległe odświeżenia)
const API_DOWN_TTL = 60; // po awarii nie pytamy originu przez tyle sekund
const LASTGOOD_TTL = 30 * 24 * 3600;
const LASTGOOD_CACHE = "zelika-lastgood";
const LASTGOOD_KEY = SITE + "/__lastgood/v2"; // syntetyczne klucze w nazwanym cache (nie publiczne URL-e)
const DOWN_ALL_KEY = LASTGOOD_KEY + "/__down"; // origin nieosiągalny (sieć/timeout/502–504/52x)
const UNREACHABLE = (s) => s === 502 || s === 503 || s === 504 || (s >= 520 && s <= 530);
const LIST_TTLS = { "200-299": API_EDGE_TTL, "300-599": -1 }; // 404 listy = awaria, nie cache'ujemy
const POST_TTLS = { "200-299": API_EDGE_TTL, 404: 60, "300-403": -1, "405-599": -1 };

function makeApi(env, ctx) {
  const base = String((env && env.API_BASE) || API_BASE).replace(/\/+$/, "");
  const memo = new Map(); // jedno pobranie na ścieżkę w obrębie żądania
  const later = (p) => {
    const q = Promise.resolve(p).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(q);
    return q;
  };
  // Cache API otwierany leniwie — dopiero przy pierwszym zapytaniu o dane (przekierowania,
  // pliki i proste 404 go nie dotykają).
  let cacheP = null;
  const openCache = () => cacheP || (cacheP = caches.open(LASTGOOD_CACHE).catch(() => null));
  const marker = () => new Response("1", { headers: { "Cache-Control": `max-age=${API_DOWN_TTL}` } });

  // Jedno zapytanie do originu. Zapisuje kopię / znaczniki. Zwraca
  // { ok, data } | { gone: true } | { invalid: data } | {}.
  async function fromOrigin(path, spec, cache, background) {
    const key = LASTGOOD_KEY + path;
    // w tle czekamy na zapis (jesteśmy już w waitUntil); na ścieżce blokującej — nie
    const save = (p) => (background ? p.catch(() => {}) : void later(p));
    let status = 0;
    try {
      const r = await fetch(base + path, {
        headers: { Accept: "application/json" },
        cf: { cacheEverything: true, cacheTtlByStatus: spec.ttls },
        signal: AbortSignal.timeout(background ? API_BG_TIMEOUT_MS : API_TIMEOUT_MS),
      });
      status = r.status;
      if (r.ok) {
        const data = await r.json();
        if (spec.valid(data)) {
          if (cache) {
            const copy = new Response(JSON.stringify(data), {
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": `max-age=${LASTGOOD_TTL}`,
                "X-Fetched-At": String(Date.now()),
              },
            });
            await save(cache.put(key, copy));
          }
          return { ok: true, data };
        }
        // origin żyje, ale dane niepełne (np. bot przy błędzie bazy: pusty cennik) —
        // nie nadpisujemy kopii; bez znacznika „down”.
        console.warn(`api ${path}: niepełne dane`);
        return { invalid: data };
      }
      if (r.status === 404 && spec.gone404) {
        if (cache) await save(cache.delete(key));
        return { gone: true };
      }
      console.warn(`api ${path}: HTTP ${r.status}`);
    } catch (e) {
      console.warn(`api ${path}: ${e && e.name ? e.name : e}`);
    }
    if (cache) {
      const k = !spec.ownDown && (!status || UNREACHABLE(status)) ? DOWN_ALL_KEY : DOWN_ALL_KEY + path;
      await save(cache.put(k, marker()));
    }
    return {};
  }

  async function load(path, spec) {
    const cache = await openCache();
    let copy = null;
    let down = false;
    if (cache) {
      try {
        const [c, d1, d2] = await Promise.all([
          cache.match(LASTGOOD_KEY + path),
          cache.match(DOWN_ALL_KEY),
          cache.match(DOWN_ALL_KEY + path),
        ]);
        down = !!(d1 || d2);
        if (c) copy = { data: await c.json(), at: Number(c.headers.get("X-Fetched-At")) || 0 };
      } catch (_) {}
    }
    if (copy) {
      if (Date.now() - copy.at < API_FRESH_S * 1000) return { data: copy.data, source: "cache" };
      if (down) return { data: copy.data, source: "lastgood" };
      later(fromOrigin(path, spec, cache, true)); // stale-while-revalidate
      return { data: copy.data, source: "stale" };
    }
    if (down) return { data: null, source: "none" };
    if (spec.soft) {
      later(fromOrigin(path, spec, cache, true)); // nie blokujemy strony — kopia na następne żądania
      return { data: null, source: "none" };
    }
    const o = await fromOrigin(path, spec, cache, false);
    if (o.ok) return { data: o.data, source: "live" };
    if (o.gone) return { data: null, notFound: true, source: "live" };
    if (o.invalid) return { data: o.invalid, source: "live" };
    return { data: null, source: "none" };
  }

  const get = (path, spec) => {
    if (!memo.has(path)) memo.set(path, load(path, spec));
    return memo.get(path);
  };
  const isObj = (d) => d != null && typeof d === "object";
  return {
    content: () =>
      get("/api/content", {
        ttls: LIST_TTLS,
        valid: (d) => isObj(d) && Array.isArray(d.cennik_items) && d.cennik_items.length > 0,
      }),
    posts: () => get("/api/posts", { ttls: LIST_TTLS, valid: (d) => isObj(d) && Array.isArray(d.posts) }),
    post: (slug) =>
      get("/api/posts/" + encodeURIComponent(slug), { ttls: POST_TTLS, gone404: true, valid: (d) => isObj(d) && !!d.slug }),
    // memo jest per ścieżka: w jednym żądaniu lista stron jest czytana albo soft, albo blokująco
    pages: ({ soft = false } = {}) =>
      get("/api/pages", { ttls: LIST_TTLS, ownDown: true, soft, valid: (d) => isObj(d) && Array.isArray(d.pages) }),
    page: (slug) =>
      get("/api/pages/" + encodeURIComponent(slug), {
        ttls: POST_TTLS, gone404: true, ownDown: true, valid: (d) => isObj(d) && !!d.slug,
      }),
  };
}

const postsOf = (res) => (res && res.data && Array.isArray(res.data.posts) ? res.data.posts : []);

// ── Strony usług (/api/pages) — tylko PL, adres /<slug> w korzeniu serwisu ─────
// Slug: małe litery, cyfry, „-” (jak slugify bota). Nazwy zajęte przez istniejące
// trasy/katalogi nigdy nie są stroną usługi (nie zasłaniamy ich).
const PAGE_SLUG_RE = /^[a-z0-9-]{1,120}$/;
const RESERVED_SLUGS = new Set(["uk", "en", "porady", "quiz", "prywatnosc", "media", "img", "index", "sitemap", "robots", "llms", "api"]);
const isPageSlug = (s) => typeof s === "string" && PAGE_SLUG_RE.test(s) && !RESERVED_SLUGS.has(s);
// Opublikowane strony z listy (pomijamy wpisy bez slug/tytułu i powtórzone slugi).
function pagesOf(res) {
  const list = res && res.data && Array.isArray(res.data.pages) ? res.data.pages : [];
  const seen = new Set();
  return list.filter((p) => {
    if (!p || typeof p !== "object" || !isPageSlug(p.slug) || !str(p.title) || seen.has(p.slug)) return false;
    if (p.status != null && p.status !== "published") return false;
    seen.add(p.slug);
    return true;
  });
}
const pageCats = (p) => (Array.isArray(p && p.price_categories) ? p.price_categories.map(str).filter(Boolean) : []);
// kategoria cennika (catKey) → slug strony (pierwsza strona wygrywa)
function pageByCategory(pages) {
  const m = new Map();
  for (const p of pages) for (const k of pageCats(p)) if (!m.has(catKey(k))) m.set(catKey(k), p.slug);
  return m;
}

// ── Katalog usług (cennik) z /api/content ──────────────────────────────────────
// Kontrakt bota: cennik_items (publiczne usługi w kolejności position; name_uk/en,
// description*, price, price_from, duration, category) + cennik_categories
// [{key, pl, uk, en}] w kolejności na stronie. Stary kształt API (bez tłumaczeń
// i bez cennik_categories) też działa: brak tłumaczenia → PL, brak kategorii →
// wbudowana kolejność i nazwy poniżej, brak price_from → cena dokładna.
const CAT_DEFAULTS = [
  { key: "Makijaż permanentny brwi", pl: "Makijaż permanentny brwi", uk: "Перманентний макіяж брів", en: "Permanent brow makeup" },
  { key: "Brwi", pl: "Brwi", uk: "Брови", en: "Brows" },
  { key: "Rzęsy", pl: "Rzęsy", uk: "Вії", en: "Lashes" },
  { key: "Usta", pl: "Usta", uk: "Губи", en: "Lips" },
  { key: "Oczy", pl: "Oczy", uk: "Очі", en: "Eyes" },
  { key: "Pozostałe", pl: "Pozostałe", uk: "Інше", en: "Other" },
];
const catKey = (s) => String(s == null ? "" : s).trim().toLowerCase();
const CAT_BY_KEY = new Map(CAT_DEFAULTS.map((c) => [catKey(c.key), c]));
const FEATURE_CAT = catKey("Makijaż permanentny brwi");
const NEW_CATS = [catKey("Usta"), catKey("Oczy")]; // nowe strefy (certyfikaty 2026) — badge „Nowość”
const FEAT_NOTE = {
  pl: "Trwały, naturalny efekt dopasowany do kształtu twarzy. Cena zawiera konsultację, brow mapping i dobór koloru.",
  uk: "Стійкий, природний ефект, підібраний до форми обличчя. У ціну входять консультація, brow mapping і підбір кольору.",
  en: "A long-lasting, natural result tailored to your face shape. The price includes a consultation, brow mapping and colour matching.",
};
const NEW_BADGE = { pl: "Nowość", uk: "Новинка", en: "New" };
const PRICE_FROM = { pl: "od", uk: "від", en: "from" };
const OFFER_CATALOG_NAME = { pl: "Cennik usług", uk: "Послуги й ціни", en: "Services and prices" };
// Strefy, od których zależą „uśpione” treści (FAQ o ustach, promo, akapit o cenie
// wprowadzającej): pokazujemy je dopiero, gdy usługa jest w katalogu.
const ZONES = { usta: /\b(usta|ust|warg\w*)\b/i, oczy: /\boczy\b|powiek|kresk/i };
// knowsAbout firmy — tylko tematy potwierdzone usługami z katalogu.
const TOPICS = [
  ["Makijaż permanentny brwi", /makija[zż] permanentny brwi/i],
  ["Architektura brwi", /makija[zż] permanentny brwi/i], // brow mapping wliczony w PMU brwi
  ["Makijaż permanentny ust", ZONES.usta],
  ["Makijaż permanentny powiek (kreska)", ZONES.oczy],
  ["Laminacja brwi", /laminacja brwi/i],
  ["Laminacja rzęs", /laminacja rzęs/i],
  ["Lifting rzęs", /lifting/i],
  ["Koloryzacja rzęs", /koloryzacja rzęs|farb\w* rzęs/i],
  ["Regulacja brwi", /regulacja/i],
];

const tr = (it, field, lang) => (lang !== "pl" && str(it[field + "_" + lang])) || str(it[field]);

function buildCatalogue(content) {
  if (!content || !Array.isArray(content.cennik_items)) return null;
  const items = [];
  for (const it of content.cennik_items) {
    if (!it || typeof it !== "object") continue;
    const price =
      typeof it.price === "number" ? it.price
      : typeof it.price === "string" && it.price.trim() ? Number(it.price.trim().replace(",", "."))
      : NaN; // null/""/brak → pomijamy (nie „0 zł”)
    if (!str(it.name) || !str(it.category) || !Number.isFinite(price) || price < 0) continue;
    items.push({
      name: str(it.name), name_uk: str(it.name_uk), name_en: str(it.name_en),
      description: str(it.description), description_uk: str(it.description_uk), description_en: str(it.description_en),
      price, price_from: it.price_from === true || it.price_from === 1,
      duration: str(it.duration), category: str(it.category),
    });
  }
  if (!items.length) return null;

  const cats = [];
  const byKey = new Map();
  const addCat = (key, titles) => {
    const k = catKey(key);
    if (!k || byKey.has(k)) return;
    const def = CAT_BY_KEY.get(k) || {};
    const pl = str(titles && titles.pl) || def.pl || str(key);
    const c = { k, key: str(key), titles: { pl }, items: [] };
    for (const l of ["uk", "en"]) c.titles[l] = str(titles && titles[l]) || def[l] || pl;
    byKey.set(k, c);
    cats.push(c);
  };
  const defs = Array.isArray(content.cennik_categories) ? content.cennik_categories.filter((d) => d && str(d.key)) : [];
  (defs.length ? defs : CAT_DEFAULTS).forEach((d) => addCat(d.key, d));
  for (const it of items) {
    if (!byKey.has(catKey(it.category))) addCat(it.category, null); // nowa kategoria bez opisu → na końcu
    byKey.get(catKey(it.category)).items.push(it);
  }
  const text = (it) => `${it.category} ${it.name}`;
  const prices = items.map((it) => it.price);
  const maxItem = items.reduce((a, b) => (b.price > a.price ? b : a));
  return {
    cats: cats.filter((c) => c.items.length),
    items,
    zones: new Set(Object.keys(ZONES).filter((z) => items.some((it) => ZONES[z].test(text(it))))),
    min: Math.min(...prices),
    max: Math.max(...prices),
    maxIsFrom: maxItem.price_from,
    topics: TOPICS.filter(([, re]) => items.some((it) => re.test(text(it)))).map(([t]) => t),
    updatedAt: str(content.cennik_updated_at),
  };
}

function fmtNumber(v, lang) {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return lang === "en" ? s : s.replace(".", ",");
}
function fmtPrice(it, lang) {
  return (it.price_from ? PRICE_FROM[lang] + " " : "") + fmtNumber(it.price, lang) + " zł";
}
// „2 g 30 min” / „1 g” / „45 min” / „ok. 1,5 godz.” → UK „2 год 30 хв”, EN „2 h 30 min”.
// Nierozpoznany zapis zostaje bez zmian (lepiej po polsku niż źle).
const DUR_RE = /^(ok\.?\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:godz\.?|godzin[ay]?|g\.?|h)(?![a-ząćęłńóśźż]))?\s*(?:(\d+)\s*(?:min\.?|minut[y]?))?$/i;
const DUR_WORDS = { uk: { approx: "бл. ", h: "год", m: "хв" }, en: { approx: "approx. ", h: "h", m: "min" } };
function fmtDuration(d, lang) {
  const s = str(d);
  if (!s || lang === "pl") return s;
  const m = s.match(DUR_RE);
  if (!m || (!m[2] && !m[3])) return s;
  const w = DUR_WORDS[lang];
  const parts = [];
  if (m[2]) parts.push(`${lang === "en" ? m[2].replace(",", ".") : m[2].replace(".", ",")} ${w.h}`);
  if (m[3]) parts.push(`${m[3]} ${w.m}`);
  return (m[1] ? w.approx : "") + parts.join(" ");
}

function priceRowHtml(it, lang) {
  const desc = tr(it, "description", lang);
  const dur = fmtDuration(it.duration, lang);
  return (
    `<div class="price-row"><span class="pname">${esc(tr(it, "name", lang))}` +
    (desc ? `<span class="pdesc">${esc(desc)}</span>` : "") +
    (dur ? `<span class="pdur">${esc(dur)}</span>` : "") +
    `</span><span class="price">${esc(fmtPrice(it, lang))}</span></div>`
  );
}
// Link z grupy cennika do strony usługi (strony są tylko po polsku — z /uk/ i /en/ też).
const MORE_LINK = { pl: "Więcej o zabiegu", uk: "Детальніше (польською)", en: "More about the treatment (PL)" };
function cennikHtml(cat, lang, pageFor = new Map()) {
  let num = 0;
  return cat.cats
    .map((c) => {
      const slug = pageFor.get(c.k);
      const more = slug
        ? `<a class="cat-more" href="/${esc(slug)}"${lang === "pl" ? "" : ' hreflang="pl"'}>${esc(MORE_LINK[lang] || MORE_LINK.pl)} &#8594;</a>`
        : "";
      const rows = c.items.map((it) => priceRowHtml(it, lang)).join("") + more;
      const title = esc(c.titles[lang] || c.titles.pl);
      if (c.k === FEATURE_CAT) {
        return `<div class="cat feature reveal d1"><div class="cat-h"><span class="cat-num">&#10022;</span><h3>${title}</h3></div><p class="feat-note">${esc(FEAT_NOTE[lang])}</p>${rows}</div>`;
      }
      num += 1;
      const badge = NEW_CATS.includes(c.k) ? `<span class="cat-new">${esc(NEW_BADGE[lang])}</span>` : "";
      return `<div class="cat reveal ${num % 2 ? "d1" : "d2"}"><div class="cat-h"><span class="cat-num">${String(num).padStart(2, "0")}</span><h3>${title}</h3>${badge}</div>${rows}</div>`;
    })
    .join("\n");
}

// JSON-LD: OfferCatalog (kategorie → oferty), cena dokładna albo minPrice dla „od”.
function offerLd(it, lang) {
  const service = { "@type": "Service", name: tr(it, "name", lang) };
  const desc = tr(it, "description", lang);
  if (desc) service.description = desc;
  const offer = { "@type": "Offer", itemOffered: service, priceCurrency: "PLN" };
  if (it.price_from) offer.priceSpecification = { "@type": "PriceSpecification", minPrice: it.price, priceCurrency: "PLN" };
  else offer.price = it.price;
  return offer;
}
function offerCatalogLd(cat, lang) {
  return {
    "@type": "OfferCatalog",
    name: OFFER_CATALOG_NAME[lang],
    itemListElement: cat.cats.map((c) => ({
      "@type": "OfferCatalog",
      name: c.titles[lang] || c.titles.pl,
      itemListElement: c.items.map((it) => offerLd(it, lang)),
    })),
  };
}
function priceRangeOf(cat) {
  return cat.min === cat.max
    ? `${fmtNumber(cat.min, "pl")} zł`
    : `${fmtNumber(cat.min, "pl")}–${fmtNumber(cat.max, "pl")}${cat.maxIsFrom ? "+" : ""} zł`;
}
// LocalBusiness z index.html (adres, godziny, founder…) + dane z katalogu.
// aggregateRating usuwamy zawsze: Google nie pokazuje gwiazdek dla ocen
// wystawianych samemu sobie / zebranych z serwisów zewnętrznych na LocalBusiness.
function businessLd(ld, cat, lang) {
  if (!ld || typeof ld !== "object") return ld;
  delete ld.aggregateRating;
  if (lang !== "pl") {
    // opis i etykiety jak w widocznej (zlokalizowanej) stronie
    if (META[lang] && META[lang].ogdesc) ld.description = META[lang].ogdesc;
    if (ld.potentialAction && I18N[lang]["hero.book"]) ld.potentialAction.name = htmlToText(I18N[lang]["hero.book"]);
    if (ld.founder) ld.founder.jobTitle = JOB_TITLE[lang];
  }
  if (cat) {
    ld.priceRange = priceRangeOf(cat);
    ld.knowsAbout = cat.topics;
    ld.hasOfferCatalog = offerCatalogLd(cat, lang);
  }
  return ld;
}
// JSON w <script>: „<” → \u003c, więc treść z bota nie zamknie znacznika (</script>).
const scriptJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
// HTMLRewriter: zbiera tekst <script> (przychodzi kawałkami), parsuje JSON,
// podmienia na przekształcony. Błąd parsowania → oryginał bez zmian.
function jsonScriptHandler(transform) {
  let buf = "";
  return {
    text(t) {
      buf += t.text;
      if (!t.lastInTextNode) {
        t.remove();
        return;
      }
      let out = buf;
      try {
        out = scriptJson(transform(JSON.parse(buf)));
      } catch (_) {}
      t.replace(out, { html: true });
      buf = "";
    },
  };
}
// Tekst z HTML (słowniki i18n, treść FAQ) → czysty tekst do JSON-LD / atrybutów.
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…",
  middot: "·", rarr: "→", larr: "←", laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”", rsquo: "’",
};
const decodeEntities = (s) =>
  String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : m;
    }
    return ENTITIES[e.toLowerCase()] != null ? ENTITIES[e.toLowerCase()] : m;
  });
const htmlToText = (s) =>
  decodeEntities(String(s == null ? "" : s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
// HTMLRewriter: podmiana tekstu elementu (tekst przychodzi kawałkami). fn: surowy HTML → HTML.
function textMapHandler(fn) {
  let buf = "";
  return {
    text(t) {
      buf += t.text;
      if (!t.lastInTextNode) {
        t.remove();
        return;
      }
      t.replace(fn(buf), { html: true });
      buf = "";
    },
  };
}
const JOB_TITLE = {
  pl: "Specjalistka makijażu permanentnego",
  uk: "Спеціалістка з перманентного макіяжу",
  en: "Permanent makeup specialist",
};
// Gwiazdki z oceny (zaokrąglonej), nie na sztywno 5.
const starsOf = (r) => {
  const full = Math.max(0, Math.min(5, Math.round(r)));
  return "★".repeat(full) + "☆".repeat(5 - full);
};
// <meta name="zelika:google-rating" content="5.0/53"> — snapshot z index.html na brak danych
function parseRatingSnapshot(v) {
  const [a, b] = String(v || "").split("/");
  return parseRating({ google_rating: a, google_reviews: b });
}
// FAQPage z widocznego FAQ (te same, zlokalizowane teksty; pytania ukryte przez
// data-needs nie trafiają do schematu).
function faqPageLd(items, lang) {
  const qa = items.filter((it) => it.ok && it.q && it.a);
  if (!qa.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: qa.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
// Mały wyciąg dla quizu (ceny z tego samego katalogu) — <script type="application/json">.
function quizDataJson(cat) {
  return scriptJson({
    items: cat.items.map((it) => ({ category: it.category, name: it.name, price: it.price, price_from: it.price_from })),
  });
}

// ── Ocena Google (z /api/content) — liczba opinii z poprawną odmianą ───────────
function parseRating(c) {
  if (!c) return null;
  const r = Number(String(c.google_rating == null ? "" : c.google_rating).replace(",", "."));
  const n = parseInt(c.google_reviews, 10);
  if (!(r > 0 && r <= 5) || !(n > 0)) return null;
  const list = Array.isArray(c.google_reviews_list) ? c.google_reviews_list.filter((x) => x && str(x.text)) : [];
  return { r, n, list };
}
const fmtRating = (r, lang) => (lang === "en" ? r.toFixed(1) : r.toFixed(1).replace(".", ","));
const few = (n) => n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
const one = (n) => n % 10 === 1 && n % 100 !== 11;
// mianownik: 1 opinia, 2–4/22–24 opinie, 5–21/25+ opinii; po „na podstawie” zawsze „opinii”
const plOpinie = (n) => (n === 1 ? "opinia" : few(n) ? "opinie" : "opinii");
const ukVidguky = (n) => (one(n) ? "відгук" : few(n) ? "відгуки" : "відгуків");
const ukVidgukivGen = (n) => (one(n) ? "відгуку" : "відгуків"); // «на основі N …»
const enReviews = (n) => (n === 1 ? "review" : "reviews");
const REVIEWS_TXT = {
  pl: {
    count: (r, n) => `${n} ${plOpinie(n)}`,
    stat: (r, n) => `średnia ocena<br>(${n} ${plOpinie(n)})`,
    lead: (r, n) => `Prawdziwe opinie z Google — ocena <strong>${r}</strong> &#9733; na podstawie <strong>${n}</strong> opinii.`,
    note: (r, n) => `Ocena <strong>${r} &#9733;</strong> na podstawie ${n} opinii w Google`,
    aria: (r) => `Opinie Google — ${r}`,
  },
  uk: {
    count: (r, n) => `${n} ${ukVidguky(n)}`,
    stat: (r, n) => `середня оцінка<br>(${n} ${ukVidguky(n)})`,
    lead: (r, n) => `Справжні відгуки з Google — оцінка <strong>${r}</strong> &#9733; на основі <strong>${n}</strong> ${ukVidgukivGen(n)}.`,
    note: (r, n) => `Оцінка <strong>${r} &#9733;</strong> на основі ${n} ${ukVidgukivGen(n)} у Google`,
    aria: (r) => `Відгуки Google — ${r}`,
  },
  en: {
    count: (r, n) => `${n} ${enReviews(n)}`,
    stat: (r, n) => `average rating<br>(${n} ${enReviews(n)})`,
    lead: (r, n) => `Real Google reviews — rated <strong>${r}</strong> &#9733; based on <strong>${n}</strong> ${enReviews(n)}.`,
    note: (r, n) => `Rated <strong>${r} &#9733;</strong> based on ${n} Google ${enReviews(n)}`,
    aria: (r) => `Google reviews — ${r}`,
  },
};
function reviewCardsHtml(list) {
  return list
    .slice(0, 12)
    .map((rv) => {
      const n = Math.max(1, Math.min(5, parseInt(rv.rating, 10) || 5));
      return `<figure class="rev-card"><div class="rev-stars">${"★".repeat(n)}</div><blockquote>${esc(rv.text)}</blockquote><figcaption>— ${esc(rv.author)}</figcaption></figure>`;
    })
    .join("");
}

// --- style (spójne ze stroną główną: kolory, fonty, nagłówek, przycisk Booksy) ---
const CSS = `
:root{--bg:#f4f1e7;--bg-soft:#ece7d8;--bg-card:#fffdf6;--green:#1f5e30;--green-mid:#2f7d44;--gold:#a9863c;--ink:#272b22;--muted:#6e7365;--line:rgba(31,94,48,.16);--line-gold:rgba(169,134,60,.30);--serif:'Cormorant Garamond',Georgia,serif;--sans:'Jost',system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-weight:300;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
picture{display:contents}
.wrap{max-width:760px;margin:0 auto;padding:0 24px}
/* --- nagłówek jak na stronie głównej --- */
header.nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 40px;background:rgba(244,241,231,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.brand{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1;text-decoration:none}
.brand .mark{width:118px;height:auto;display:block}
.brand .tag{font-family:var(--serif);letter-spacing:.34em;text-transform:uppercase;color:var(--gold);font-weight:600;font-size:.5rem;margin-top:1px;margin-left:3px}
.nav-links{display:flex;gap:30px;list-style:none;align-items:center;margin:0;padding:0}
.nav-links a{color:var(--ink);font-size:.76rem;letter-spacing:.18em;text-transform:uppercase;font-weight:400;position:relative;padding:4px 0;transition:.3s}
.nav-links a::after{content:"";position:absolute;left:0;bottom:0;width:0;height:1px;background:var(--gold);transition:.35s}
.nav-links a:hover{color:var(--green);text-decoration:none}
.nav-links a:hover::after,.nav-links a.current::after{width:100%}
.nav-links a.current{color:var(--green)}
.nav-cta{border:1px solid var(--green);color:var(--green)!important;padding:9px 20px!important;border-radius:2px;transition:.4s}
.nav-cta:hover{background:var(--green);color:#fff!important;text-decoration:none}
.nav-cta::after{display:none!important}
@media(max-width:760px){.nav-links li:not(.cta-li){display:none}.nav-links{gap:14px}header.nav{padding:10px 18px}.brand .mark{width:96px}}
/* --- treść --- */
main{padding-bottom:10px}
h1,h2,h3{font-family:var(--serif);color:var(--green);font-weight:600;line-height:1.15}
h1{font-size:2.2rem;margin:.5em 0 .2em}
h2{font-size:1.55rem;margin:1.5em 0 .3em}
h3{font-size:1.25rem;margin:1.3em 0 .3em}
.crumbs{font-size:.85rem;color:var(--muted);margin:26px 0 0}
.crumbs a{color:var(--muted)}
.meta{font-size:.9rem;color:var(--muted);margin:.2em 0 1.4em;border-bottom:1px solid var(--line-gold);padding-bottom:1em}
.hero-img{width:100%;max-height:400px;object-fit:cover;border-radius:16px;margin:1em 0}
article p{margin:0 0 1.1em}
article ul,article ol{margin:0 0 1.1em;padding-left:1.4em}
article li{margin:0 0 .35em;padding-left:.2em}
article li::marker{color:var(--gold)}
article strong{font-weight:500}
article :is(p,li) a{text-decoration:underline;text-decoration-color:var(--line-gold);text-underline-offset:3px}
article :is(p,li) a:hover{text-decoration-color:currentColor}
.lead{font-size:1.08rem;color:var(--muted);margin:.3em 0 2.2em}
.card{display:block;background:var(--bg-card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin:0 0 22px;transition:box-shadow .25s,transform .25s}
.card:hover{box-shadow:0 12px 34px rgba(31,94,48,.12);transform:translateY(-2px);text-decoration:none}
.card img{width:100%;height:200px;object-fit:cover;display:block}
.card .body{padding:18px 22px}
.card h2{margin:.1em 0 .3em;font-size:1.35rem}
.card p{margin:0;color:var(--muted);font-size:.96rem}
.card .date{font-size:.78rem;color:var(--gold);letter-spacing:.05em;margin-top:.6em}
.cta{margin:2.6em 0 1em;padding:1.8em;background:var(--bg-card);border:1px solid var(--line-gold);border-radius:16px;text-align:center}
.cta-h{margin:.1em 0 .6em;font-family:var(--serif);font-size:1.45rem;color:var(--green)}
.cta-p{margin:0 0 1.3em;color:var(--muted)}
.bk-widget{max-width:320px;margin:0 auto}
.btn{display:inline-block;background:var(--green);color:#fff;padding:14px 30px;border-radius:999px;font-weight:500;letter-spacing:.01em}
.btn:hover{background:var(--green-mid);text-decoration:none}
.empty{padding:64px 0;text-align:center;color:var(--muted)}
.author-box{margin:2.6em 0 0;padding:1.7em 1.9em;background:var(--bg-card);border:1px solid var(--line-gold);border-left:3px solid var(--gold);border-radius:14px}
.author-box .ab-eye{font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:600}
.author-box .ab-name{font-family:var(--serif);font-weight:600;color:var(--green);font-size:1.35rem;margin:.25em 0 .35em}
.author-box .ab-bio{margin:0 0 .9em;color:var(--muted);font-size:.96rem;line-height:1.65}
.author-box .ab-link{color:var(--gold);font-weight:500}
footer.site{border-top:1px solid var(--line);margin-top:40px;padding:28px 0;color:var(--muted);font-size:.85rem;text-align:center}
/* --- override widgetu Booksy (jak na stronie głównej) --- */
.booksy-widget-button{background-image:none!important;background-color:var(--green)!important;width:100%!important;height:auto!important;min-height:52px!important;padding:14px 30px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:999px!important;cursor:pointer;transition:background .2s,transform .2s,box-shadow .2s!important}
.booksy-widget-button::after{content:"Rezerwuj wizytę";color:#fff;font-family:var(--sans);font-weight:500;font-size:1rem;letter-spacing:.01em}
.booksy-widget-button:hover{background-color:var(--green-mid)!important;transform:translateY(-2px)!important;box-shadow:0 14px 32px rgba(31,94,48,.24)!important}
.booksy-business-link{width:auto!important;margin:10px auto 0!important;opacity:.55}
.booksy-widget-overlay{z-index:2147483646!important}
.booksy-widget-dialog{position:fixed!important;top:50%!important;left:50%!important;margin:0!important;transform:translate(-50%,-50%)!important;max-width:96vw!important;max-height:92vh!important;overflow:auto!important}
html:has(.booksy-widget-overlay),body:has(.booksy-widget-overlay){overflow:hidden!important}
`;
// Strony usług: karty cennika i galeria jak na stronie głównej (te same klasy
// .cat/.price-row/.gitem-like), dopasowane do wąskiej kolumny treści.
const PAGE_CSS = `
.svc-prices{display:grid;gap:18px;margin:1.6em 0 2em}
.cat{background:var(--bg-card);border:1px solid var(--line);border-radius:4px;padding:26px 28px 14px;box-shadow:0 10px 30px rgba(31,94,48,.05)}
.cat.feature{background:linear-gradient(120deg,#f6f3e9,#fffdf6);border-color:var(--gold)}
.cat .cat-h{display:flex;align-items:baseline;gap:14px;margin-bottom:6px}
.cat .cat-num{font-family:var(--serif);font-style:italic;color:var(--gold);font-size:1.2rem}
.cat h3{font-size:1.5rem;margin:0}
.price-row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:13px 0;border-top:1px solid var(--line)}
.cat-h+.price-row{border-top:none}
.price-row .pname{color:var(--ink);font-size:.96rem}
.price-row .pdur{display:block;color:var(--muted);font-size:.72rem;letter-spacing:.05em;margin-top:2px}
.price-row .pdesc{display:block;color:var(--muted);font-size:.84rem;line-height:1.55;margin-top:4px}
.price-row .price{font-family:var(--serif);font-size:1.4rem;color:var(--green);white-space:nowrap;font-weight:600}
.cat.feature .price{color:#7c5e22}
.svc-note{font-size:.85rem;color:var(--muted);margin:0}
.svc-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:1.6em 0 2em}
.svc-gallery figure{margin:0;aspect-ratio:3/4;border-radius:4px;overflow:hidden;border:1px solid var(--line-gold);box-shadow:0 10px 26px rgba(31,94,48,.10)}
.svc-gallery.one{grid-template-columns:1fr}
.svc-gallery.one figure{aspect-ratio:auto;max-height:420px}
.svc-gallery img{width:100%;height:100%;object-fit:cover;display:block}
.cta-btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:0}
.btn-ghost{background:transparent;color:var(--green);border:1px solid var(--green)}
.btn-ghost:hover{background:rgba(31,94,48,.06);color:var(--green)}
.related{margin:2.4em 0 1em}
.related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.related .card{margin:0}
.related .card img{height:140px}
.related .card .body{padding:14px 16px}
.related .card h3{font-size:1.15rem;margin:.1em 0 .3em}
.related .card p{font-size:.88rem}
@media(max-width:640px){.svc-gallery{grid-template-columns:1fr 1fr}.related-grid{grid-template-columns:1fr}.cat{padding:22px 20px 10px}}
`;

// Blok CTA z realnym widgetem Booksy (rysuje zielony przycisk „Rezerwuj wizytę”,
// a link „Umów wizytę" w nagłówku [data-booksy] deleguje do niego przez booksy-fix.js).
// Widget z defer (nie blokuje renderu): sam szuka swojego <script> (querySelectorAll po
// src z „code.js”) i wstawia przycisk tuż przed nim — miejsce w bloku CTA się nie zmienia.
function ctaBlock() {
  return `<div class="cta">
<p class="cta-h">Masz pytanie o swój zabieg?</p>
<p class="cta-p">Umów niezobowiązującą konsultację — dobierzemy metodę idealną dla Ciebie.</p>
<div class="bk-widget" id="bk-widget"><noscript><a class="btn" href="${BOOKSY}" target="_blank" rel="noopener noreferrer">Rezerwuj na Booksy</a></noscript></div>
<script src="/booksy-fix.js" defer></script>
<script src="${esc(BOOKSY_WIDGET)}" defer></script>
</div>`;
}

// Fonty Google bez blokowania renderu — jak na stronie głównej: preload + stylesheet
// z media="print" przełączany na "all" po wczytaniu + <noscript>. Przełącza /nav.js
// (link[data-async-css]), nie inline onload: CSP tych stron nie ma 'unsafe-inline'.
// display=swap — tekst od razu fontem zapasowym (Georgia / system-ui), potem podmiana.
const FONTS_LAYOUT =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&display=swap";
const asyncFontsHtml = (href) =>
  `<link rel="preload" as="style" href="${href}">` +
  `<link rel="stylesheet" href="${href}" media="print" data-async-css>` +
  `<noscript><link rel="stylesheet" href="${href}"></noscript>`;

// header: opcje headerHtml (domyślnie — sekcja porad); css: dodatkowe style strony.
function layout({ title, description, canonical, ogImage, jsonld, body, noindex, header, css = "" }) {
  return `<!doctype html><html lang="pl"><head>
<meta charset="utf-8">
<script src="/consent.js"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18246998055"></script>
<script src="/booking-conversion.js" defer></script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="${jsonld && jsonld["@type"] === "BlogPosting" ? "article" : "website"}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:locale" content="pl_PL">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${asyncFontsHtml(FONTS_LAYOUT)}
<style>${CSS}${SHELL_CSS}${css}</style>
${jsonld ? `<script type="application/ld+json">${scriptJson(jsonld)}</script>` : ""}
</head><body>
${headerHtml("pl", header || { current: "porady", pl: "/porady" })}
<main class="wrap">${body}</main>
${footerHtml("pl")}
<script src="/nav.js" defer></script>
</body></html>`;
}

function htmlResponse(html, status = 200, sMaxAge = 300, extra = {}) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${sMaxAge}`,
      ...extra,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy":
        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy":
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
        "img-src 'self' data: https://booksy.com https://www.googletagmanager.com https://www.google.com https://www.google.pl https://googleads.g.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://booksy.com; " +
        "font-src https://fonts.gstatic.com; " +
        "script-src 'self' https://booksy.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net; " +
        "frame-src https://booksy.com https://td.doubleclick.net; " +
        "connect-src 'self' https://booksy.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://ad.doubleclick.net https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
        "form-action 'self' https://booksy.com; upgrade-insecure-requests",
    },
  });
}

// Serwer domowy niedostępny i brak ostatniej kopii: 503 (tymczasowo), NIE 404 —
// Google nie wyindeksuje strony z powodu krótkiej awarii.
function unavailableResponse(canonical) {
  const body = `<h1>Chwilowo niedostępne</h1><p class="lead">Ta strona jest na chwilę niedostępna. Spróbuj ponownie za kilka minut.</p>
<p><a href="/">← Strona główna</a></p>`;
  return htmlResponse(
    layout({
      title: "Chwilowo niedostępne | Zelika PMU",
      description: "Strona chwilowo niedostępna.",
      canonical,
      ogImage: SITE + "/og-image.jpg",
      noindex: true,
      body,
    }),
    503,
    0,
    { "Cache-Control": "no-store", "Retry-After": "120", "X-Zelika-Data": "none" }
  );
}

// Brandowana 404 (zamiast pustej odpowiedzi warstwy assets): status 404, noindex, bez
// canonical, linki dalej. Strony usług — tylko z listy opublikowanych (/api/pages czytane
// „soft”: kopia bez czekania na origin); bez listy — tylko strona główna i reszta linków.
const NOT_FOUND_CSS = `
.nf-links{list-style:none;margin:0 0 2.4em;padding:0;border-top:1px solid var(--line)}
.nf-links li{padding:13px 2px;border-bottom:1px solid var(--line)}
.nf-links a{font-weight:400}
.nf-links span{display:block;color:var(--muted);font-size:.9rem}
`;
async function notFoundResponse(api) {
  const pagesRes = await api.pages({ soft: true });
  const pages = pagesOf(pagesRes).slice(0, 6);
  const li = (href, label, note = "") =>
    `<li><a href="${esc(href)}">${esc(label)}</a>${note ? `<span>${esc(note)}</span>` : ""}</li>`;
  const body = `<p class="crumbs"><a href="/">Strona główna</a> › Nie znaleziono</p>
<h1>Nie znaleziono strony</h1>
<p class="lead">Pod tym adresem nie ma strony — mogła zostać przeniesiona albo w adresie jest literówka. Zajrzyj tutaj:</p>
<ul class="nf-links">
${li("/", "Strona główna", "Oferta, cennik i rezerwacja online")}
${pages.map((p) => li("/" + p.slug, str(p.title))).join("\n")}
${li("/porady", SECTION_TITLE, "Porady o makijażu permanentnym, brwiach i rzęsach")}
${li("/#contact", "Kontakt", "Adres, telefon i godziny otwarcia studia")}
</ul>`;
  return htmlResponse(
    layout({
      title: "Nie znaleziono strony (404) | Zelika",
      description: "Strona nie istnieje.",
      canonical: "",
      ogImage: SITE + "/og-image.jpg",
      noindex: true,
      body,
      header: { current: "", pl: "/" },
      css: NOT_FOUND_CSS,
    }),
    404,
    60
  );
}

// Brak pliku z rozszerzeniem innym niż .html/.htm (.jpg, .js, .php, .env, .map…) albo
// żądanie bez text/html w Accept (skrypty, obrazki, skanery) → pusta 404 z krótkim cache:
// bez strony HTML i bez czytania danych (Cache API / origin nietknięte).
const FILE_EXT_RE = /\.([a-z0-9]{1,10})$/i;
function wantsHtmlPage(request, url) {
  const last = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  const m = last.match(FILE_EXT_RE);
  if (m && !/^html?$/i.test(m[1])) return false;
  return /text\/html/i.test(request.headers.get("Accept") || "");
}
function plainNotFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60", ...SEC_HEADERS } });
}

// --- strony ---
async function renderIndex(api) {
  const res = await api.posts();
  const canonical = SITE + "/porady";
  if (res.source === "none") return unavailableResponse(canonical);
  const posts = postsOf(res);
  const cards =
    posts.length
      ? posts
          .map(
            (p) => `<a class="card" href="/porady/${esc(p.slug)}">
${mediaSrc(p.image) ? imgHtml(mediaSrc(p.image), ` alt="${esc(str(p.image_alt) || p.title)}" loading="lazy"`) : ""}
<div class="body"><h2>${esc(p.title)}</h2><p>${esc(excerpt(p))}</p>
<div class="date">${esc(plDate(p.published_at))}</div></div></a>`
          )
          .join("\n")
      : `<div class="empty">Wkrótce pojawią się tu pierwsze porady 💚</div>`;

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: SECTION_TITLE,
    url: canonical,
    description: SECTION_DESC,
    publisher: { "@type": "Organization", name: "Zelika Brows & More", url: SITE },
  };

  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: SECTION_TITLE, item: SITE + "/porady" },
    ],
  };
  const body = `<script type="application/ld+json">${scriptJson(crumbLd)}</script>
<p class="crumbs"><a href="/">Strona główna</a> › ${esc(SECTION_TITLE)}</p>
<h1>${esc(SECTION_TITLE)}</h1>
<p class="lead">${esc(SECTION_DESC)}</p>
${cards}
${ctaBlock()}`;

  return htmlResponse(
    layout({
      title: `${SECTION_TITLE} | Zelika Wieluń`,
      description: SECTION_DESC,
      canonical,
      ogImage: SITE + "/og-image.jpg",
      jsonld,
      body,
    }),
    200,
    300,
    { "X-Zelika-Data": res.source }
  );
}

// Autorka strony (Person #anna). Bot podaje „Anna Zelińska” — ta sama osoba co „Zelinska”.
const ANNA = "Anna Zelinska";
const isAnna = (name) => /^anna\s+zeli[nń]ska$/i.test(str(name).normalize("NFC"));

// slug z bota: [a-z0-9-] (slugify); odrzucamy oczywiste śmieci bez pytania API.
const SLUG_OK = /^[^/\s]{1,200}$/;

async function renderPost(api, slug) {
  const canonical = SITE + "/porady/" + slug;
  const res = SLUG_OK.test(slug) ? await api.post(slug) : { data: null, notFound: true, source: "live" };
  // API niedostępne i brak ostatniej kopii → 503 (nie 404+noindex: to nie jest „nie ma artykułu”)
  if (res.source === "none") return unavailableResponse(canonical);
  const post = res.data;
  if (!post || post.status !== "published") {
    const body = `<h1>Nie znaleziono</h1><p class="lead">Taka porada nie istnieje lub została przeniesiona.</p>
<p><a href="/porady">← Wróć do porad</a></p>`;
    return htmlResponse(
      layout({
        title: "Nie znaleziono | Zelika PMU",
        description: "Strona nie istnieje.",
        canonical,
        ogImage: SITE + "/og-image.jpg",
        noindex: true,
        body,
      }),
      404
    );
  }

  const ogImage = absImg(post.image);
  const desc = excerpt(post, 160);
  const author = str(post.author) || ANNA;
  const byAnna = isAnna(author);
  const blocks = parseBody(post.body);
  const faqLd = faqPageLd(bodyFaq(blocks), "pl-PL");
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: desc,
    image: ogImage,
    datePublished: post.published_at || undefined,
    dateModified: modifiedAt(post) || undefined,
    author: byAnna
      ? { "@type": "Person", "@id": SITE + "/#anna", name: ANNA, jobTitle: "Specjalistka makijażu permanentnego" }
      : { "@type": "Person", name: author },
    publisher: { "@type": "Organization", name: "Zelika Brows & More", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "pl-PL",
  };

  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: SECTION_TITLE, item: SITE + "/porady" },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };
  const body = `<script type="application/ld+json">${scriptJson(crumbLd)}</script>
${faqLd ? `<script type="application/ld+json">${scriptJson(faqLd)}</script>\n` : ""}<p class="crumbs"><a href="/">Strona główna</a> › <a href="/porady">${esc(SECTION_TITLE)}</a> › ${esc(post.title)}</p>
<article>
<h1>${esc(post.title)}</h1>
<div class="meta">${esc(author)}${
    post.published_at ? " · " + esc(plDate(post.published_at)) : ""
  }</div>
${mediaSrc(post.image) ? imgHtml(mediaSrc(post.image), ` class="hero-img" alt="${esc(str(post.image_alt) || post.title)}" fetchpriority="high"`) : ""}
${renderBody(blocks)}
${byAnna ? `<aside class="author-box">
<div class="ab-eye">Autorka</div>
<div class="ab-name">Anna Zelinska</div>
<p class="ab-bio">Specjalistka makijażu permanentnego, Studio Zelika (Wieluń). Ponad 5 lat praktyki w PMU brwi; certyfikowana w zakresie ust i kreski (standard Hasnutdinova, 2026). Pracuję na certyfikowanych pigmentach i jednorazowych modułach.</p>
<a class="ab-link" href="/#kwalifikacje">Poznaj kwalifikacje &#8594;</a>
</aside>` : ""}
</article>
${ctaBlock()}
<p><a href="/porady">← Wszystkie porady</a></p>`;

  return htmlResponse(
    layout({
      title: `${post.title} | Zelika Wieluń`,
      description: desc,
      canonical,
      ogImage,
      jsonld,
      body,
      header: { current: "porady", pl: canonical.slice(SITE.length) }, // PL → ten artykuł; UA/EN → /uk/, /en/
    }),
    200,
    300,
    { "X-Zelika-Data": res.source }
  );
}

// ── Strona usługi /<slug> (faza 2 SEO; tylko PL) ──────────────────────────────
// Treść z bota (ten sam podzbiór Markdown co porady) + znaczniki w osobnej linii:
// [[cennik]] → karty cen z katalogu (/api/content, tylko kategorie price_categories),
// [[galeria]] → zdjęcia z gallery (puste → zdjęcie strony albo nic). Bez znacznika:
// cennik po pierwszym akapicie, galeria przed sekcją FAQ. Powtórzony znacznik — raz.
const booksyHref = (u) => (/^https:\/\/([a-z0-9-]+\.)*booksy\.com\//i.test(str(u)) ? str(u) : BOOKSY);

// Kategorie katalogu przypisane do strony (w kolejności strony, bez powtórzeń).
function pageCatalogue(cat, page) {
  if (!cat) return [];
  return [...new Set(pageCats(page).map(catKey))].map((k) => cat.cats.find((c) => c.k === k)).filter(Boolean);
}

function pagePricesHtml(cats, page, catalogueOk) {
  if (!pageCats(page).length) return "";
  if (!catalogueOk) {
    // katalog chwilowo niedostępny (brak danych i kopii) — odsyłamy do cennika
    return `<p class="svc-note">Aktualne ceny znajdziesz w <a href="/#services">cenniku</a> oraz w Booksy.</p>`;
  }
  if (!cats.length) return "";
  const anyFrom = cats.some((c) => c.items.some((it) => it.price_from));
  const cards = cats
    .map(
      (c) =>
        `<div class="cat${c.k === FEATURE_CAT ? " feature" : ""}"><div class="cat-h"><span class="cat-num">&#10022;</span><h3>Cennik: ${esc(c.titles.pl)}</h3></div>` +
        c.items.map((it) => priceRowHtml(it, "pl")).join("") +
        `</div>`
    )
    .join("");
  const note = `Ceny w PLN${anyFrom ? "; „od” — cena minimalna, ostateczna po konsultacji" : ""}. Pełny cennik: <a href="/#services">strona główna</a>.`;
  return `<div class="svc-prices">${cards}<p class="svc-note">${note}</p></div>`;
}

function pageGalleryHtml(page, title) {
  const items = (Array.isArray(page.gallery) ? page.gallery : [])
    .map((g) => (typeof g === "string" ? { url: g } : g))
    .filter((g) => g && typeof g === "object")
    .map((g) => ({ src: pageImgSrc(g.url), alt: str(g.alt) }))
    .filter((g) => g.src)
    .slice(0, 12);
  if (!items.length) {
    const src = pageImgSrc(page.image);
    if (src) items.push({ src, alt: str(page.image_alt) });
  }
  if (!items.length) return "";
  const figs = items
    .map((g) => `<figure>${imgHtml(g.src, ` alt="${esc(g.alt || title)}" loading="lazy" decoding="async"`)}</figure>`)
    .join("");
  return `<div class="svc-gallery${items.length === 1 ? " one" : ""}">${figs}</div>`;
}

// Bloki treści z podstawionymi znacznikami (slots: { cennik, galeria } — gotowy HTML).
function pageBlocks(body, slots) {
  const out = [];
  const used = new Set();
  for (const b of parseBody(body, { markers: true })) {
    if (b.type !== "marker") {
      out.push(b);
    } else if (!used.has(b.name)) {
      used.add(b.name);
      if (slots[b.name]) out.push({ type: "html", html: slots[b.name] });
    }
  }
  if (!used.has("cennik") && slots.cennik) {
    const i = out.findIndex((b) => b.type === "p");
    out.splice(i < 0 ? 0 : i + 1, 0, { type: "html", html: slots.cennik });
  }
  if (!used.has("galeria") && slots.galeria) {
    const i = out.findIndex(isFaqH2);
    out.splice(i < 0 ? out.length : i, 0, { type: "html", html: slots.galeria });
  }
  return out;
}

// „Przeczytaj też”: porady linkujące do tej strony, potem porady o wspólnym słowie
// z tytułem (rdzeń = 4 pierwsze litery, bez słów ogólnych), maks. 3.
const STOP_STEMS = new Set([
  "wiel", "zeli", "stud", "jaki", "jaka", "kied", "któr", "dlac", "oraz", "albo", "przy", "prze", "czym",
  "czyl", "zabi", "efek", "krok", "wszy", "musi", "wied", "dzie", "mnie", "myśl", "wygl", "wybr", "cena", "kosz",
]);
const titleStems = (s) =>
  new Set(
    String(s || "")
      .normalize("NFC")
      .toLowerCase()
      .split(/[^0-9a-ząćęłńóśźż]+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.slice(0, 4))
      .filter((w) => !STOP_STEMS.has(w))
  );
// Ścieżka linku z treści (względny albo https://zelika.pl/…) bez ?/#/końcowego „/”; obcy → "".
function sitePath(url) {
  let p;
  if (/^\/(?![\/\\])/.test(url)) {
    p = url;
  } else {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" || !/^(www\.)?zelika\.pl$/i.test(u.hostname)) return "";
      p = u.pathname;
    } catch (_) {
      return "";
    }
  }
  return p.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";
}
const linksTo = (post, path) =>
  [...String(post.body || "").matchAll(INLINE_RE)].some((m) => m[1] != null && sitePath(m[2]) === path);
function relatedPosts(posts, slug, title, n = 3) {
  const want = titleStems(title);
  return posts
    .filter((p) => p && typeof p === "object" && str(p.slug) && str(p.title) && (p.status == null || p.status === "published"))
    .map((p, i) => {
      const own = titleStems(p.title);
      let shared = 0;
      for (const s of want) if (own.has(s)) shared += 1;
      return { p, i, link: linksTo(p, "/" + slug) ? 1 : 0, shared };
    })
    .filter((x) => x.link || x.shared)
    .sort((a, b) => b.link - a.link || b.shared - a.shared || a.i - b.i)
    .slice(0, n)
    .map((x) => x.p);
}
function relatedHtml(posts) {
  if (!posts.length) return "";
  const cards = posts
    .map((p) => {
      const img = mediaSrc(p.image);
      return (
        `<a class="card" href="/porady/${esc(encodeURIComponent(p.slug))}">` +
        (img ? imgHtml(img, ` alt="${esc(str(p.image_alt) || p.title)}" loading="lazy"`) : "") +
        `<div class="body"><h3>${esc(p.title)}</h3><p>${esc(excerpt(p, 110))}</p></div></a>`
      );
    })
    .join("\n");
  return `<section class="related"><h2>Przeczytaj też</h2><div class="related-grid">${cards}</div></section>`;
}

function pageCtaHtml(booksy) {
  return `<div class="cta">
<p class="cta-h">Umów wizytę</p>
<p class="cta-p">Wolny termin wybierzesz i zarezerwujesz online w Booksy. Nie wiesz, który zabieg wybrać? Krótki quiz podpowie.</p>
<p class="cta-btns"><a class="btn" href="${esc(booksy)}" target="_blank" rel="noopener noreferrer" data-booksy>Umów wizytę</a><a class="btn btn-ghost" href="/quiz">Dobierz zabieg</a></p>
</div>`;
}

// Stałe strony usług (tworzy je skrypt bota). Gdy listy stron nie ma (zimny cache w colo
// + wolny/leżący origin), dla tych adresów pytamy o pojedynczą stronę: jest → render,
// naprawdę zdjęta (404) → 404, brak danych → 503 (jak porada), nie fałszywe 404.
// Inne adresy bez listy → zwykłe 404, bez dodatkowego pytania originu.
const KNOWN_PAGE_SLUGS = new Set(["makijaz-permanentny-brwi-wielun", "laminacja-brwi-wielun", "laminacja-rzes-wielun"]);

// null → to nie jest (opublikowana) strona usługi: router oddaje dotychczasowe 404.
async function renderServicePage(request, api, slug, trailingSlash) {
  const known = KNOWN_PAGE_SLUGS.has(slug);
  // znane strony: lista i pojedyncza strona równolegle (timeouty się nie sumują)
  const [pagesRes] = await Promise.all([api.pages(), known && !trailingSlash ? api.page(slug) : null]);
  const listOk = !!(pagesRes.data && Array.isArray(pagesRes.data.pages));
  const listed = listOk ? pagesOf(pagesRes).find((p) => p.slug === slug) || null : null;
  // lista jest, a strony w niej nie ma → 404; listy brak → dalej tylko znane strony
  if (!listed && (listOk || !known)) return null;
  if (trailingSlash) {
    const u = new URL(request.url);
    return new Response(null, {
      status: 301,
      headers: { Location: new URL("/" + slug + u.search, u).toString(), "Cache-Control": "public, max-age=3600" },
    });
  }
  const canonical = SITE + "/" + slug;
  const [res, contentRes, postsRes] = await Promise.all([api.page(slug), api.content(), api.posts()]);
  if (res.notFound) return null; // zdjęta (lista jeszcze z kopii) albo naprawdę jej nie ma
  let page = res.data;
  let source = res.source;
  if (page && page.status != null && page.status !== "published") return null;
  if (!page || typeof page !== "object" || !str(page.title)) {
    // pojedyncza strona niedostępna → pełny wpis z listy (jeśli lista ma treść), inaczej 503
    if (!listed || !str(listed.body)) return unavailableResponse(canonical);
    page = listed;
    source = pagesRes.source;
  }

  const title = str(page.title);
  const content = contentRes.data;
  const cat = buildCatalogue(content);
  const cats = pageCatalogue(cat, page);
  const desc = excerpt(page, 160, { markers: true });
  const ogImage = absImg(pageImgSrc(page.image));
  const blocks = pageBlocks(page.body, {
    cennik: pagePricesHtml(cats, page, !!cat),
    galeria: pageGalleryHtml(page, title),
  });
  const faqLd = faqPageLd(bodyFaq(blocks), "pl-PL");
  const offers = cats.flatMap((c) => c.items.map((it) => offerLd(it, "pl")));
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": canonical + "#service",
    name: title,
    description: desc,
    url: canonical,
    image: ogImage,
    provider: { "@type": "BeautySalon", "@id": SITE + "/#business", name: "Zelika PMU" },
    areaServed: { "@type": "City", name: "Wieluń" },
  };
  if (offers.length) jsonld.offers = offers;
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: title, item: canonical },
    ],
  };
  const body = `<script type="application/ld+json">${scriptJson(crumbLd)}</script>
${faqLd ? `<script type="application/ld+json">${scriptJson(faqLd)}</script>\n` : ""}<p class="crumbs"><a href="/">Strona główna</a> › ${esc(title)}</p>
<article>
<h1>${esc(title)}</h1>
${renderBody(blocks)}
</article>
${pageCtaHtml(booksyHref(content && content.booksy_url))}
${relatedHtml(relatedPosts(postsOf(postsRes), slug, title))}`;

  return htmlResponse(
    layout({
      // miasto już w tytule (Wieluń / w Wieluniu…) → bez powtórzenia w sufiksie
      title: `${title} | ${/wielu[nń]/i.test(title.normalize("NFC")) ? "Zelika" : "Zelika Wieluń"}`,
      description: desc,
      canonical,
      ogImage,
      jsonld,
      body,
      header: { current: "", pl: "/" + slug }, // UA/EN → /uk/, /en/ (strona tylko po polsku)
      css: PAGE_CSS,
    }),
    200,
    300,
    { "X-Zelika-Data": source }
  );
}

// /media/<id>.jpg → zdjęcie z bota (API_BASE/api/media/<id>.jpg). Tylko obrazy (inny
// Content-Type, przekierowanie albo za duży plik = 502), id już zwalidowane w routerze.
// Cache tylko na 1 dzień (krawędź i przeglądarka, bez „immutable”): to zdjęcia klientek
// publikowane za zgodą (RODO) — po wycofaniu zgody bot usuwa zdjęcie, a ono musi
// zniknąć także spod bezpośredniego adresu najpóźniej w ciągu doby. 404 — 60 s.
// Gwarancja nie zależy od nagłówków originu ani od wspólnego cache hooks.zelika.pl:
// origin pytamy z pominięciem cache (no-store), a odpowiedź trzymamy sami w Cache API
// pod kluczem strony https://zelika.pl/media/<id>.jpg z własnym Cache-Control.
const MEDIA_TTL_S = 86400;
const MEDIA_404_TTL_S = 60;
const MEDIA_MAX_BYTES = 15 * 1024 * 1024;
async function mediaResponse(request, env, ctx, id) {
  const plain = (status, text, cc) =>
    new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": cc, ...SEC_HEADERS } });
  if (request.method !== "GET" && request.method !== "HEAD") {
    const r = plain(405, "Method Not Allowed\n", "no-store");
    r.headers.set("Allow", "GET, HEAD");
    return r;
  }
  const head = request.method === "HEAD";
  const out = (r) => (head ? new Response(null, { status: r.status, headers: r.headers }) : r);
  const key = new Request(`${SITE}/media/${id}.jpg`);
  let cache = null;
  try {
    cache = caches.default;
    const hit = await cache.match(key);
    if (hit) return out(hit);
  } catch (_) {}
  // 200 i 404 zapisujemy w Cache API (TTL z naszego Cache-Control); błędy — nigdy
  const keep = (r) => {
    if (cache) {
      const p = cache.put(key, r.clone()).catch(() => {});
      if (ctx && ctx.waitUntil) ctx.waitUntil(p);
    }
    return out(r);
  };

  const base = String((env && env.API_BASE) || API_BASE).replace(/\/+$/, "");
  let r;
  try {
    r = await fetch(`${base}/api/media/${id}.jpg`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.warn(`media ${id}: ${e && e.name ? e.name : e}`);
    return plain(504, "Gateway Timeout\n", "no-store");
  }
  const bad = (why) => {
    console.warn(`media ${id}: ${why}`);
    if (r.body) r.body.cancel().catch(() => {});
    return plain(502, "Bad Gateway\n", "no-store");
  };
  if (r.status === 404) {
    if (r.body) r.body.cancel().catch(() => {});
    return keep(plain(404, "Not found\n", `public, max-age=${MEDIA_404_TTL_S}`));
  }
  const type = (r.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (r.status !== 200 || !/^image\/(jpeg|png|webp|avif)$/.test(type)) return bad(`HTTP ${r.status} ${type}`);
  if (Number(r.headers.get("Content-Length") || 0) > MEDIA_MAX_BYTES) return bad("Content-Length too large");
  const buf = await r.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MEDIA_MAX_BYTES) return plain(502, "Bad Gateway\n", "no-store");
  return keep(
    new Response(buf, {
      headers: { "Content-Type": type, "Cache-Control": `public, max-age=${MEDIA_TTL_S}`, ...SEC_HEADERS },
    })
  );
}

// Власний robots.txt: ВІДКРИТИЙ для всіх (вкл. AI-краулери цитувань — GPTBot,
// Google-Extended, PerplexityBot, ClaudeBot тощо), бо ціль — видимість і цитування
// в AI-пошуку. Перебиває Cloudflare-керований robots, що за замовч. блокував AI-ботів.
// AI-боти — ще й окремими групами з явним Allow (рішення власника; блок на боці
// Cloudflare — налаштування в панелі, не тут).
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended", "PerplexityBot"];
function renderRobots() {
  const body =
    `User-agent: *\nAllow: /\n\n` +
    AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /\n\n`).join("") +
    `Sitemap: ${SITE}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

// llms.txt — agent-readable опис бізнесу для AI-пошуку/асистентів (AEO/GEO).
// Cennik i lista artykułów — z tych samych danych co strona (katalog bota).
const md = (s) => str(s).replace(/\s+/g, " ").replace(/([\\[\]])/g, "\\$1");
async function renderLlms(api) {
  const [contentRes, postsRes, pagesRes] = await Promise.all([api.content(), api.posts(), api.pages()]);
  const c = contentRes.data;
  const cat = buildCatalogue(c);
  const rating = parseRating(c);
  const posts = postsOf(postsRes);
  const pages = pagesOf(pagesRes);
  const ratingTxt = rating ? ` Ocena ${fmtRating(rating.r, "pl")}/5 w Google (${rating.n} ${plOpinie(rating.n)}).` : "";

  let services;
  if (cat) {
    const updated = cat.updatedAt ? ` Stan cennika: ${cat.updatedAt.slice(0, 10)}.` : "";
    services =
      `## Usługi i ceny\n\nCeny w PLN; „od” = cena minimalna (ostateczna po konsultacji).${updated} ` +
      `Wolne terminy i rezerwacja: Booksy (link niżej).\n\n` +
      cat.cats
        .map(
          (k) =>
            `### ${md(k.titles.pl)}\n` +
            k.items
              .map((it) => {
                const extra = [it.duration ? `czas: ${md(it.duration)}` : "", md(it.description)].filter(Boolean).join("; ");
                return `- ${md(it.name)} — ${fmtPrice(it, "pl")}${extra ? ` (${extra})` : ""}`;
              })
              .join("\n")
        )
        .join("\n\n");
  } else {
    services = `## Usługi i ceny\n\nAktualny cennik: ${SITE}/#services oraz w Booksy (link niżej).`;
  }

  const servicePages = pages.length
    ? `## Usługi — strony\n\n` +
      pages.map((p) => `- [${md(p.title)}](${SITE}/${p.slug})${p.meta_description ? ": " + md(p.meta_description) : ""}`).join("\n") +
      "\n\n"
    : "";

  const blog = posts.length
    ? `## Porady i inspiracje (blog)\n\n` +
      posts
        .map((p) => `- [${md(p.title)}](${SITE}/porady/${encodeURIComponent(p.slug)})${p.meta_description ? ": " + md(p.meta_description) : ""}`)
        .join("\n") +
      "\n\n"
    : "";

  const body = `# Zelika — Makijaż Permanentny, Brwi, Rzęsy (Wieluń)

> Studio makijażu permanentnego (PMU) oraz stylizacji brwi i rzęs w Wieluniu (Polska). Prowadzi Anna Zelinska, specjalistka makijażu permanentnego.${ratingTxt}

${services}

${servicePages}## Kontakt i rezerwacja

- Adres: ul. Młodzieżowa 5B, 98-300 Wieluń
- Telefon: +48 571 932 161
- [Rezerwacja online (Booksy)](${BOOKSY})
- [Instagram](https://www.instagram.com/annazelika)
- Godziny: pon. i pt. 8:00–15:30, wt. i czw. 9:30–15:30, śr. 8:00–14:30, sob. 6:00–13:00, niedziela nieczynne

${blog}## Ważne strony

- [Strona główna](${SITE}/): oferta, kwalifikacje, cennik, kontakt (wersje: [UA](${SITE}/uk/), [EN](${SITE}/en/))
- [Porady i inspiracje (blog)](${SITE}/porady)
- [Quiz „Jaki zabieg brwi dla Ciebie?”](${SITE}/quiz)
- [Polityka prywatności](${SITE}/prywatnosc)
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=600",
      "X-Zelika-Data": contentRes.source,
    },
  });
}

async function renderSitemap(api) {
  const [postsRes, contentRes, pagesRes] = await Promise.all([api.posts(), api.content(), api.pages()]);
  if (postsRes.source === "none") {
    return new Response("Sitemap chwilowo niedostępna.\n", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "120" },
    });
  }
  const posts = postsOf(postsRes);
  // lastmod stron głównych = ostatnia zmiana cennika (bot: cennik_updated_at), jeśli jest
  const homeMod = /^\d{4}-\d{2}-\d{2}/.test(str(contentRes.data && contentRes.data.cennik_updated_at))
    ? str(contentRes.data.cennik_updated_at).slice(0, 10)
    : undefined;
  const urls = [
    { loc: SITE + "/", pri: "1.0", freq: "monthly", lastmod: homeMod },
    { loc: SITE + "/uk/", pri: "0.9", freq: "monthly", lastmod: homeMod },
    { loc: SITE + "/en/", pri: "0.9", freq: "monthly", lastmod: homeMod },
    // strony usług (PL): lastmod = updated_at / published_at
    ...pagesOf(pagesRes).map((p) => ({
      loc: SITE + "/" + p.slug,
      pri: "0.9",
      freq: "monthly",
      lastmod: /^\d{4}-\d{2}-\d{2}/.test(modifiedAt(p)) ? modifiedAt(p).slice(0, 10) : undefined,
    })),
    { loc: SITE + "/porady", pri: "0.8", freq: "weekly" },
    { loc: SITE + "/quiz", pri: "0.6", freq: "monthly" },
    { loc: SITE + "/uk/quiz", pri: "0.5", freq: "monthly" },
    { loc: SITE + "/en/quiz", pri: "0.5", freq: "monthly" },
    { loc: SITE + "/prywatnosc", pri: "0.3", freq: "yearly" },
    ...posts.map((p) => ({
      loc: SITE + "/porady/" + encodeURIComponent(p.slug),
      pri: "0.7",
      freq: "monthly",
      lastmod: modifiedAt(p).slice(0, 10) || undefined,
    })),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

// CSP tylko dla strony głównej (czat + Turnstile). Względem _headers: script-src
// ma 'unsafe-inline' zamiast hasha (Turnstile wstrzykuje inline-skrypt z losowym
// tokenem) oraz challenges.cloudflare.com w script-src/frame-src/connect-src.
const HOMEPAGE_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
  "form-action 'self' https://booksy.com; " +
  "img-src 'self' data: https://booksy.com https://www.googletagmanager.com https://www.google.com https://www.google.pl https://googleads.g.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://booksy.com; " +
  "font-src https://fonts.gstatic.com; " +
  "script-src 'self' 'unsafe-inline' https://booksy.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://challenges.cloudflare.com; " +
  "frame-src https://booksy.com https://td.doubleclick.net https://challenges.cloudflare.com; " +
  "connect-src 'self' https://zelika-chat.vadimzelinshy.workers.dev https://hooks.zelika.pl https://booksy.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://ad.doubleclick.net https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://td.doubleclick.net https://challenges.cloudflare.com; " +
  "upgrade-insecure-requests";

// ── i18n: PL (база) + UA + EN. Один PL-шаблон (index.html з data-i18n) →
// HTMLRewriter віддає локалізовану версію за URL (/uk/, /en/). SEO: hreflang+canonical.
const META = {
  pl: {
    title: "Zelika | PMU — Makijaż Permanentny, Brwi, Rzęsy | Wieluń",
    desc: "Zelika Brows & More — studio makijażu permanentnego, architektury i stylizacji brwi oraz rzęs w Wieluniu. Anna Zelinska — Ekspert PMU. Rezerwacja online na Booksy.",
    ogtitle: "Zelika — Makijaż Permanentny, Brwi, Rzęsy | Wieluń",
    ogdesc: "Studio makijażu permanentnego oraz stylizacji brwi i rzęs w Wieluniu. Anna Zelinska — Ekspert PMU. Rezerwacja online.",
    locale: "pl_PL",
  },
  uk: {
    title: "Zelika | PMU — Перманентний макіяж, брови, вії | Велюнь",
    desc: "Zelika Brows & More — студія перманентного макіяжу, архітектури та стилізації брів і вій у Велюні. Анна Зелінська — експертка PMU. Онлайн-запис у Booksy.",
    ogtitle: "Zelika — Перманентний макіяж, брови, вії | Велюнь",
    ogdesc: "Студія перманентного макіяжу та стилізації брів і вій у Велюні. Анна Зелінська — експертка PMU. Онлайн-запис.",
    locale: "uk_UA",
  },
  en: {
    title: "Zelika | PMU — Permanent Makeup, Brows, Lashes | Wieluń",
    desc: "Zelika Brows & More — permanent makeup, brow architecture and brow & lash styling studio in Wieluń, Poland. Anna Zelinska — PMU expert. Online booking via Booksy.",
    ogtitle: "Zelika — Permanent Makeup, Brows, Lashes | Wieluń",
    ogdesc: "Permanent makeup and brow & lash styling studio in Wieluń, Poland. Anna Zelinska — PMU expert. Online booking.",
    locale: "en_US",
  },
};
const I18N = {
  uk: {
    "nav.studio": "Студія", "nav.uslugi": "Послуги", "nav.galeria": "Галерея",
    "nav.porady": "Поради", "nav.quiz": "Квіз", "nav.kontakt": "Контакти",
    "nav.book": "Записатися", "nav.kwalifikacje": "Кваліфікація",
    "sticky.sub": "безкоштовна консультація · Велюнь",
    "hero.kicker": "Сертифікована студія PMU · Велюнь",
    "hero.h1": "Перманентний макіяж<br>у руках <em>фахівця</em>",
    "hero.lead": "Студія PMU у Велюні під керівництвом Анни Зелінської. Сертифіковані пігменти, одноразові матеріали й сувора гігієна — бо стійкий макіяж це процедура, де важить не ціна, а знання і точність. Запишіться на необовʼязкову консультацію.",
    "hero.book": "Онлайн-запис", "hero.services": "Послуги й ціни",
    "val1.h": "Експертка PMU й архітектура брів",
    "val1.p": "Спеціалізація на перманентному макіяжі та моделюванні форми брів методом brow mapping.",
    "val2.h": "Природний ефект",
    "val2.p": "Делікатний, стійкий перманентний макіяж, що підкреслює ваші природні риси.",
    "val3.h": "Безпечні пігменти",
    "val3.p": "Лише сертифіковані продукти, одноразові матеріали та суворі правила гігієни.",
    "val4.h": "Професіоналістка",
    "val4.p": "Анна Зелінська — понад 5 років практики. Ваше обличчя в руках фахівчині PMU.",
    "kwal.eyebrow": "Кваліфікація та безпека",
    "kwal.h2": "Чому перманентний макіяж варто довірити <em>фахівцю</em>",
    "kwal.intro": "Пігмент лягає у шкіру на роки — тому важлива не ціна, а знання: підбір відтінку під підтон шкіри, техніка під тип шкіри, гігієна й правильне загоєння. Погано зроблений перманент складно й дорого виправити.",
    "kwal.z1": "Брови", "kwal.z2": "Губи", "kwal.z3": "Очі",
    "hero.alt": "Перманентний макіяж брів — робота студії Zelika, Велюнь",
    "about.alt": "Анна Зелінська — лінергістка студії Zelika у Велюні",
    "about.sig": "Експертка PMU й архітектура брів",
    "gal.1t": "Ламінування вій", "gal.1s": "Стилізація", "gal.1a": "Ламінування вій",
    "gal.2t": "Брови: змішана методика", "gal.2s": "Перманентний макіяж", "gal.2a": "Брови, змішана методика — перманентний макіяж",
    "gal.3t": "Брови: волоскова методика", "gal.3s": "Перманентний макіяж", "gal.3a": "Брови, волоскова методика — перманентний макіяж",
    "gal.4t": "Архітектура брів", "gal.4s": "Brow mapping", "gal.4a": "Архітектура брів",
    "gal.more": "Більше робіт", "gal.moreS": "в Instagram @annazelika",
    "gal.8t": "Перманентний макіяж брів", "gal.8s": "Результат процедури", "gal.8a": "Перманентний макіяж брів — робота студії Zelika",
    "kwal.c1t": "Сертифікат експерта", "kwal.c1s": "Навчання й розвиток", "kwal.c1a": "Анна Зелінська — сертифікат експерта",
    "kwal.c2t": "Pigmentology", "kwal.c2s": "Сертифікат", "kwal.c2a": "Анна Зелінська — сертифікат Pigmentology",
    "kwal.d1a": "Сертифікат Hasnutdinova — перманентний макіяж брів, Анна Зелінська",
    "kwal.d2a": "Сертифікат Hasnutdinova — перманентний макіяж губ, Анна Зелінська",
    "kwal.d3a": "Сертифікат Hasnutdinova — перманентний макіяж очей (стрілка), Анна Зелінська",
    "kwal.dnote": "Hasnutdinova · 84 год теорії + 56 год практики",
    "rev.all": "Усі відгуки в Google &#8594;", "por.all": "Усі поради &#8594;",
    "day.1": "Понеділок", "day.2": "Вівторок", "day.3": "Середа", "day.4": "Четвер", "day.5": "Пʼятниця", "day.6": "Субота", "day.7": "Неділя",
    "hours.closed": "вихідний",
    "chat.fab": "Відкрити чат із консультанткою",
    "kwal.b1t": "Перманентний макіяж &middot; архітектура брів",
    "kwal.b1b": "Понад 5 років практики",
    "kwal.b2t": "Перманентний макіяж &middot; метод Aquarelle",
    "kwal.b2b": "Сертифікат 2026 &middot; Варшава",
    "kwal.b3t": "Міжвійкова стрілка (лінія вій)",
    "kwal.b3b": "Сертифікат 2026 &middot; Варшава",
    "kwal.note": "<strong>Безпека понад усе.</strong> Працюю лише на сертифікованих пігментах і одноразових стерильних модулях. Перед кожною процедурою обговорюємо протипоказання (зокрема вагітність, годування, герпес на губах, деякі ліки). Навчання за стандартом Hasnutdinova (Варшава, 2026).",
    "about.eyebrow": "Про студію",
    "about.h2": "Ваше обличчя в руках <em>експертки</em>",
    "about.p1": "Студію Zelika у Велюні веде <strong>Анна Зелінська — експертка PMU й архітектури брів</strong> із понад 5-річним досвідом. Ми спеціалізуємося на перманентному макіяжі та професійному догляді й стилізації брів і вій.",
    "about.p2": "Працюємо індивідуально: аналіз рис обличчя, brow mapping і добір ідеальної форми та відтінку. Використовуємо сертифіковані продукти, одноразові матеріали й суворі правила гігієни. Робимо ставку на природний, доглянутий ефект, що підкреслює ваші риси.",
    "stat.years": "років<br>досвіду", "stat.cert": "сертифіковані<br>продукти",
    "about.p3": "Зручне розташування, гнучкий графік і нагадування про візит. Запишіться на консультацію — разом створимо ідеальну форму брів і виразний погляд.",
    "quiz.eyebrow": "Квіз",
    "quiz.h2": "Не знаєте, яку процедуру <em>обрати?</em>",
    "quiz.p": "Дайте відповідь на 5 коротких запитань, і я підкажу, яке рішення найкраще пасує вашим бровам — менш ніж за хвилину.",
    "quiz.btn": "Пройти квіз",
    "svc.eyebrow": "Ціни", "svc.h2": "Послуги й <em>ціни</em>",
    "svc.p": "Актуальні ціни та вільні терміни також знайдете в системі бронювання Booksy.",
    "svc.note": "Кожну послугу з прайсу можна забронювати онлайн у <a href='https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun' target='_blank' rel='noopener noreferrer'>системі Booksy</a>.",
    "svc.why": "<strong>Чому у нас немає «перманентного макіяжу за 199 zł»?</strong> Бо ціна процедури — це вартість стерильних одноразових модулів, сертифікованих пігментів і, головне, знання, завдяки якому ефект правильно гоїться й тримається роками. На своєму обличчі не варто економити.",
    "about.p4": "<strong>Чесно:</strong> найбільший досвід маю в бровах — це моя щоденна робота роками. Губи й очі — мій свіжо сертифікований напрям (2026), тому перші процедури роблю за вступною ціною, з повною ретельністю й без поспіху. Чесність — частина професіоналізму.",
    "jak.eyebrow": "Як ми працюємо", "jak.h2": "Процедура <em>крок за кроком</em>",
    "jak.s1h": "Консультація", "jak.s1p": "Аналіз шкіри, побажань і протипоказань — перш ніж почати.",
    "jak.s2h": "Мапінг", "jak.s2p": "Проєктую форму під ваші риси й підбираю відтінок до підтону шкіри.",
    "jak.s3h": "Процедура", "jak.s3p": "Сертифіковані пігменти, одноразові стерильні модулі, повна гігієна.",
    "jak.s4h": "Загоєння й корекція", "jak.s4p": "Докладні рекомендації та ретуш, що закріплює ефект (4–6 тижнів).",
    "ef.eyebrow": "Ефекти", "ef.h2": "До і <em>після</em>", "ef.p": "Реальні роботи студії, публікуємо за згодою клієнток. Біля кожної пари позначаємо, це одразу після процедури чи після загоєння.",
    "promo.eyebrow": "Новинка", "promo.text": "Перманентний макіяж <strong>губ</strong> і <strong>стрілка</strong> — стартуємо! Працюємо на моделях за промоціною (за згоду на фото), кількість місць обмежена. Безкоштовна консультація.", "promo.btn": "Запитати про час",
    "gal.eyebrow": "Портфоліо", "gal.h2": "Галерея <em>робіт</em>",
    "gal.p": "Роботи нашої студії — фото публікуємо за згодою клієнток. Повна галерея — в Instagram.",
    "gal.btn": "&#9670; Більше в Instagram",
    "rev.eyebrow": "Відгуки", "rev.h2": "Що кажуть <em>наші клієнтки</em>",
    "faq.eyebrow": "Часті питання", "faq.h2": "Найчастіші <em>питання</em>",
    "faq.p": "Маєте інше питання? Напишіть нашій консультантці в чат або зателефонуйте.",
    "faq.q1": "Чи болить перманентний макіяж?",
    "faq.a1": "Ми застосовуємо знеболення, тож процедура комфортна — більшість клієнток відчуває лише легке поколювання. Ваші відчуття завжди обговорюємо на початку візиту.",
    "faq.q2": "Скільки тримається перманентний макіяж брів?",
    "faq.a2": "Ефект тримається зазвичай від 1 до 3 років, залежно від типу шкіри та догляду. Після першої процедури радимо докорекцію (до 6 тижнів), що закріплює колір і форму.",
    "faq.q3": "Як відбувається загоєння?",
    "faq.a3": "Повне загоєння триває близько 4–6 тижнів. У перші дні колір яскравіший і поступово пом'якшується. Ви отримаєте від нас докладні рекомендації з догляду.",
    "faq.q4": "Яку методику брів обрати — волоскову, пудрову чи змішану?",
    "faq.a4": "Це залежить від вашої шкіри й бажаного ефекту. Найкраще пройти наш короткий квіз або записатися на необов'язкову консультацію — разом підберемо ідеальне рішення.",
    "faq.q5": "Чи є протипоказання до процедури?",
    "faq.a5": "Так — зокрема вагітність, годування грудьми, деякі захворювання шкіри чи певні ліки. Кожен випадок обговорюємо індивідуально на консультації з Анною.",
    "faq.q6": "Як записатися на візит?",
    "faq.a6": "Найзручніше через онлайн-запис у Booksy або за телефоном: 571 932 161. Можна також почати з необов'язкової консультації.",
    "faq.q7": "Чи болить перманентний макіяж губ?",
    "faq.a7": "Губи чутливіші за брови, тому завжди застосовуємо знеболення. Більшість клієнток оцінює процедуру як комфортну — ваші відчуття обговорюємо протягом візиту.",
    "faq.q8": "Як гояться губи після перманентного макіяжу?",
    "faq.a8": "Повне загоєння триває близько 7–10 днів — спершу колір яскравіший і поступово сходить на кілька тонів. Фінальний природний ефект видно після загоєння й корекції (4–6 тижнів).",
    "faq.q9": "Кому не можна робити перманентний макіяж губ?",
    "faq.a9": "Не робимо процедуру за активного герпесу — за схильності до герпесу радимо противірусну профілактику. Протипоказання також: вагітність і годування, деякі хвороби та ліки. Усе обговорюємо на консультації.",
    "por.eyebrow": "Поради", "por.h2": "Поради та <em>натхнення</em>",
    "por.p": "Короткі поради й цікавинки про перманентний макіяж, брови та вії — просто від Анни.",
    "con.eyebrow": "Контакти", "con.h2": "Запрошуємо до <em>студії</em>",
    "con.p": "Маєте питання? Зателефонуйте або напишіть в Instagram. Найзручніше зарезервувати термін онлайн.",
    "con.addr": "Адреса", "con.phone": "Телефон", "con.hours": "Години роботи",
    "bk.eye": "Онлайн-запис", "bk.h3": "Записатися на <em>візит</em>",
    "bk.p": "Оберіть послугу та зручний час у системі Booksy — підтвердження й нагадування отримаєте автоматично.",
    "bk.call": "Зателефонувати: 571 932 161",
    "quiz.back": "← На головну",
  },
  en: {
    "nav.studio": "Studio", "nav.uslugi": "Services", "nav.galeria": "Gallery",
    "nav.porady": "Tips", "nav.quiz": "Quiz", "nav.kontakt": "Contact",
    "nav.book": "Book now", "nav.kwalifikacje": "Qualifications",
    "sticky.sub": "free consultation · Wieluń",
    "hero.kicker": "Certified PMU studio · Wieluń",
    "hero.h1": "Permanent makeup<br>in <em>expert</em> hands",
    "hero.lead": "A PMU studio in Wieluń led by Anna Zelinska. Certified pigments, single-use materials and rigorous hygiene — because permanent makeup is a procedure where knowledge and precision matter more than price. Book a no-obligation consultation.",
    "hero.book": "Book online", "hero.services": "Services & prices",
    "val1.h": "PMU Expert & Brow Architecture",
    "val1.p": "Specialising in permanent makeup and brow shape design using brow mapping.",
    "val2.h": "Natural result",
    "val2.p": "Subtle, long-lasting permanent makeup that enhances your natural features.",
    "val3.h": "Safe pigments",
    "val3.p": "Only certified products, single-use materials and rigorous hygiene.",
    "val4.h": "A true professional",
    "val4.p": "Anna Zelinska — over 5 years of practice. Your face in the hands of a PMU specialist.",
    "kwal.eyebrow": "Qualifications & safety",
    "kwal.h2": "Why permanent makeup is worth trusting to a <em>specialist</em>",
    "kwal.intro": "Pigment stays in the skin for years — so what matters is not the price but the knowledge: matching the shade to your skin's undertone, technique suited to your skin type, hygiene and proper healing. Poorly done permanent makeup is hard and costly to fix.",
    "kwal.z1": "Brows", "kwal.z2": "Lips", "kwal.z3": "Eyes",
    "hero.alt": "Permanent brow makeup — work by Zelika studio, Wieluń",
    "about.alt": "Anna Zelinska — PMU artist at Zelika studio in Wieluń",
    "about.sig": "PMU expert &amp; brow architecture",
    "gal.1t": "Lash lamination", "gal.1s": "Styling", "gal.1a": "Lash lamination",
    "gal.2t": "Brows: combined method", "gal.2s": "Permanent makeup", "gal.2a": "Brows, combined method — permanent makeup",
    "gal.3t": "Brows: hair-stroke method", "gal.3s": "Permanent makeup", "gal.3a": "Brows, hair-stroke method — permanent makeup",
    "gal.4t": "Brow architecture", "gal.4s": "Brow mapping", "gal.4a": "Brow architecture",
    "gal.more": "More of our work", "gal.moreS": "on Instagram @annazelika",
    "gal.8t": "Permanent brow makeup", "gal.8s": "Treatment result", "gal.8a": "Permanent brow makeup — work by Zelika studio",
    "kwal.c1t": "Expert certificate", "kwal.c1s": "Training &amp; development", "kwal.c1a": "Anna Zelinska — expert certificate",
    "kwal.c2t": "Pigmentology", "kwal.c2s": "Certificate", "kwal.c2a": "Anna Zelinska — Pigmentology certificate",
    "kwal.d1a": "Hasnutdinova certificate — permanent brow makeup, Anna Zelinska",
    "kwal.d2a": "Hasnutdinova certificate — permanent lip makeup, Anna Zelinska",
    "kwal.d3a": "Hasnutdinova certificate — permanent eye makeup (lash line), Anna Zelinska",
    "kwal.dnote": "Hasnutdinova · 84 h theory + 56 h practice",
    "rev.all": "See all reviews on Google &#8594;", "por.all": "All tips &#8594;",
    "day.1": "Monday", "day.2": "Tuesday", "day.3": "Wednesday", "day.4": "Thursday", "day.5": "Friday", "day.6": "Saturday", "day.7": "Sunday",
    "hours.closed": "closed",
    "chat.fab": "Open chat with our consultant",
    "kwal.b1t": "Permanent makeup &middot; brow architecture",
    "kwal.b1b": "Over 5 years of practice",
    "kwal.b2t": "Permanent makeup &middot; Aquarelle method",
    "kwal.b2b": "Certificate 2026 &middot; Warsaw",
    "kwal.b3t": "Lash-line eyeliner (interlash)",
    "kwal.b3b": "Certificate 2026 &middot; Warsaw",
    "kwal.note": "<strong>Safety first.</strong> I work exclusively with certified pigments and single-use, sterile modules. Before every treatment we discuss contraindications (including pregnancy, breastfeeding, cold sores on lips, certain medications). Trained to the Hasnutdinova standard (Warsaw, 2026).",
    "about.eyebrow": "About the studio",
    "about.h2": "Your face in <em>expert hands</em>",
    "about.p1": "Studio Zelika in Wieluń is run by <strong>Anna Zelinska — PMU &amp; Brow Architecture expert</strong> with over 5 years of experience. We specialise in permanent makeup and professional brow &amp; lash care and styling.",
    "about.p2": "We work individually: facial feature analysis, brow mapping and selecting the perfect shape and shade. We use certified products, single-use materials and strict hygiene. We focus on a natural, well-groomed result that enhances your features.",
    "stat.years": "years of<br>experience", "stat.cert": "certified<br>products",
    "about.p3": "Convenient location, flexible hours and appointment reminders. Book a consultation — together we'll create the perfect brow shape and an expressive look.",
    "quiz.eyebrow": "Quiz",
    "quiz.h2": "Not sure which treatment <em>to choose?</em>",
    "quiz.p": "Answer 5 short questions and I'll suggest which option best suits your brows — in under a minute.",
    "quiz.btn": "Take the quiz",
    "svc.eyebrow": "Pricing", "svc.h2": "Services &amp; <em>prices</em>",
    "svc.p": "Current prices and available slots are also in the Booksy booking system.",
    "svc.note": "Every service on the price list can be booked online in the <a href='https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun' target='_blank' rel='noopener noreferrer'>Booksy system</a>.",
    "svc.why": "<strong>Why won't you find „permanent makeup for 199 zł” here?</strong> Because the price of the treatment is the cost of sterile single-use modules, certified pigments and — above all — the knowledge that makes the result heal properly and last for years. Your face is not the place to save money.",
    "about.p4": "<strong>Honestly:</strong> my greatest experience is in brows — my daily work for years. Lips and eyes are my freshly certified direction (2026), so I do the first treatments at an introductory price, with full care and no rush. Honesty is part of professionalism.",
    "jak.eyebrow": "How we work", "jak.h2": "The treatment <em>step by step</em>",
    "jak.s1h": "Consultation", "jak.s1p": "Skin analysis, expectations and contraindications — before we start.",
    "jak.s2h": "Mapping", "jak.s2p": "I design the shape for your features and match the shade to your skin's undertone.",
    "jak.s3h": "Treatment", "jak.s3p": "Certified pigments, single-use sterile modules, full hygiene.",
    "jak.s4h": "Healing & touch-up", "jak.s4p": "Detailed aftercare and a retouch that sets the result (4–6 weeks).",
    "ef.eyebrow": "Results", "ef.h2": "Before &amp; <em>after</em>", "ef.p": "Real work from our studio, published with clients' consent. Each pair is marked as right after the treatment or healed.",
    "promo.eyebrow": "New", "promo.text": "Permanent <strong>lip</strong> makeup and <strong>eyeliner</strong> — now launching! We work on models at a promotional price (in exchange for photo consent), limited spots. Free consultation.", "promo.btn": "Ask about a date",
    "gal.eyebrow": "Portfolio", "gal.h2": "Our <em>work</em>",
    "gal.p": "Our studio's work — photos published with clients' consent. Full gallery on Instagram.",
    "gal.btn": "&#9670; See more on Instagram",
    "rev.eyebrow": "Reviews", "rev.h2": "What <em>our clients</em> say",
    "faq.eyebrow": "FAQ", "faq.h2": "Frequently asked <em>questions</em>",
    "faq.p": "Have another question? Message our consultant in the chat or call us.",
    "faq.q1": "Does permanent makeup hurt?",
    "faq.a1": "We use anaesthetic, so the treatment is comfortable — most clients feel only slight tingling. We always discuss your comfort at the start of the visit.",
    "faq.q2": "How long does permanent brow makeup last?",
    "faq.a2": "The result usually lasts 1 to 3 years, depending on skin type and care. After the first session we recommend a touch-up (within 6 weeks) to set the colour and shape.",
    "faq.q3": "What is the healing process like?",
    "faq.a3": "Full healing takes about 4–6 weeks. In the first days the colour is more intense and gradually softens. You'll get detailed aftercare guidance from us.",
    "faq.q4": "Which brow method to choose — hair strokes, powder or combined?",
    "faq.a4": "It depends on your skin and the desired result. Best to take our short quiz or book a no-obligation consultation — together we'll pick the perfect option.",
    "faq.q5": "Are there any contraindications?",
    "faq.a5": "Yes — including pregnancy, breastfeeding, certain skin conditions or some medications. We discuss each case individually during a consultation with Anna.",
    "faq.q6": "How do I book an appointment?",
    "faq.a6": "The easiest way is online booking via Booksy or by phone: 571 932 161. You can also start with a no-obligation consultation.",
    "faq.q7": "Does permanent lip makeup hurt?",
    "faq.a7": "Lips are more sensitive than brows, so we always use anaesthetic. Most clients find the treatment comfortable — we check in on how you feel throughout the visit.",
    "faq.q8": "How do lips heal after permanent makeup?",
    "faq.a8": "Full healing takes about 7–10 days — the colour is more intense at first and gradually softens by a few tones. The final, natural result shows after healing and the touch-up (4–6 weeks).",
    "faq.q9": "Who should not get permanent lip makeup?",
    "faq.a9": "We don't perform the treatment on an active cold sore — if you're prone to cold sores we recommend antiviral prophylaxis. Contraindications also include pregnancy and breastfeeding, certain conditions and medications. We discuss everything at the consultation.",
    "por.eyebrow": "Tips", "por.h2": "Tips &amp; <em>inspiration</em>",
    "por.p": "Short tips and facts about permanent makeup, brows and lashes — straight from Anna.",
    "con.eyebrow": "Contact", "con.h2": "Visit <em>our studio</em>",
    "con.p": "Have questions? Call or message us on Instagram. The easiest way to book is online.",
    "con.addr": "Address", "con.phone": "Phone", "con.hours": "Opening hours",
    "bk.eye": "Online booking", "bk.h3": "Book an <em>appointment</em>",
    "bk.p": "Choose a service and a convenient time in Booksy — you'll get confirmation and a reminder automatically.",
    "bk.call": "Call: 571 932 161",
    "quiz.back": "← Home",
  },
};
const META_QUIZ = {
  pl: {
    title: "Quiz: Jaki zabieg brwi dla Ciebie? · Zelika",
    desc: "Odpowiedz na 5 pytań i odkryj, który zabieg brwi — makijaż permanentny, laminacja czy stylizacja — najlepiej pasuje do Ciebie. Studio Zelika, Wieluń.",
    ogtitle: "Quiz: Jaki zabieg brwi dla Ciebie? · Zelika",
    ogdesc: "Odpowiedz na 5 pytań i odkryj idealny zabieg dla swoich brwi.",
  },
  uk: {
    title: "Квіз: яка процедура для брів вам підходить? · Zelika",
    desc: "Дайте відповідь на 5 запитань і дізнайтеся, яка процедура для брів — перманентний макіяж, ламінування чи стилізація — підходить саме вам. Студія Zelika, Велюнь.",
    ogtitle: "Квіз: яка процедура для брів вам підходить? · Zelika",
    ogdesc: "Дайте відповідь на 5 запитань і знайдіть ідеальну процедуру для брів.",
  },
  en: {
    title: "Quiz: Which brow treatment is right for you? · Zelika",
    desc: "Answer 5 questions and discover which brow treatment — permanent makeup, lamination or styling — suits you best. Zelika Studio, Wieluń.",
    ogtitle: "Quiz: Which brow treatment is right for you? · Zelika",
    ogdesc: "Answer 5 questions and find the ideal treatment for your brows.",
  },
};
// Ekran startowy quizu (/quiz, /uk/quiz, /en/quiz) renderowany na serwerze w #card:
// surowy HTML ma H1 i wstęp (Google/AI bez JS). quiz.js używa tego samego HTML
// (data-ssr) jako ekranu startowego — także po „Zacznij od nowa”. Treść: HTML (em/b).
const QUIZ_INTRO = {
  pl: {
    eyebrow: "Quiz",
    h1: "Quiz: jaki zabieg na brwi <em>wybrać?</em>",
    lead: "Odpowiedz na 5 krótkich pytań, a podpowiem, który zabieg najlepiej pasuje do Twoich brwi — makijaż permanentny (metoda włosowa, pudrowa lub mieszana), laminacja czy regulacja z koloryzacją. Na końcu zobaczysz rekomendację i aktualną cenę.",
    start: "Rozpocznij quiz",
    note: "5 pytań &middot; <b>około 1 minuty</b> &middot; bez zobowiązań",
  },
  uk: {
    eyebrow: "Квіз",
    h1: "Квіз: яку процедуру для брів <em>обрати?</em>",
    lead: "Дай відповідь на 5 коротких запитань — і я підкажу, яка процедура найкраще підійде твоїм бровам: перманентний макіяж (волосковий, пудровий чи комбінований метод), ламінування чи корекція з фарбуванням. Наприкінці побачиш рекомендацію та актуальну ціну.",
    start: "Почати квіз",
    note: "5 запитань &middot; <b>близько 1 хвилини</b> &middot; без зобов'язань",
  },
  en: {
    eyebrow: "Quiz",
    h1: "Quiz: which brow treatment <em>should you choose?</em>",
    lead: "Answer 5 short questions and I'll suggest the treatment that suits your brows best — permanent makeup (hair-stroke, powder or combined method), lamination, or shaping with tint. At the end you'll see a recommendation and the current price.",
    start: "Start the quiz",
    note: "5 questions &middot; <b>about 1 minute</b> &middot; no commitment",
  },
};
function quizIntroHtml(lang) {
  const t = QUIZ_INTRO[lang] || QUIZ_INTRO.pl;
  return (
    `<span class="eyebrow">${t.eyebrow}</span>` +
    `<h1>${t.h1}</h1>` +
    `<p class="lead">${t.lead}</p>` +
    `<div class="btn-row"><button class="btn" type="button" data-action="start">${t.start}</button></div>` +
    `<p class="intro-note">${t.note}</p>`
  );
}
const META_PRIV = {
  pl: {
    title: "Polityka prywatności · Zelika PMU — Wieluń",
    desc: "Polityka prywatności i informacja o plikach cookie Studia Zelika (Brows & More), Wieluń — jak przetwarzamy dane osobowe zgodnie z RODO.",
  },
  uk: {
    title: "Політика конфіденційності · Zelika PMU — Велюнь",
    desc: "Політика конфіденційності та інформація про файли cookie студії Zelika (Brows & More), Велюнь — як ми обробляємо персональні дані згідно з GDPR (RODO).",
  },
  en: {
    title: "Privacy Policy · Zelika PMU — Wieluń",
    desc: "Privacy policy and cookie information for Zelika (Brows & More) studio, Wieluń — how we process personal data under GDPR (RODO).",
  },
};
function href(lang, pl) {
  return lang === "pl" ? pl : "/" + lang + (pl === "/" ? "/" : pl);
}
function hreflangFor(pl) {
  return (
    ["pl", "uk", "en"]
      .map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${href(l, pl)}">`)
      .join("") + `<link rel="alternate" hreflang="x-default" href="${SITE}${pl}">`
  );
}
// Wersje UA/EN mają tylko strona główna i quiz. Strony tylko po polsku (blog, porady,
// polityka prywatności, strony usług, 404) → UA/EN prowadzą na /uk/ i /en/, nigdy na
// nieistniejące /uk/porady, /en/prywatnosc itd.
const LOCALIZED_PATHS = new Set(["/", "/quiz"]);
function langHref(code, pl, langHrefs) {
  if (langHrefs && langHrefs[code]) return langHrefs[code];
  return href(code, code === "pl" || LOCALIZED_PATHS.has(pl) ? pl : "/");
}
// langHrefs: { pl, uk, en } — jawne adresy (nadpisują domyślne)
function switcher(lang, pl, langHrefs) {
  const item = (code, label) =>
    `<a href="${esc(langHref(code, pl, langHrefs))}" style="padding:7px 8px;border-radius:6px;text-decoration:none;${lang === code ? "background:var(--green,#1f5e30);color:#fff" : "color:var(--muted,#6e7365)"}">${label}</a>`;
  // <span> (не <li>) — інжектимо в <header> будь-якої сторінки (навбар або topbar quizу)
  return (
    `<span class="lang-switch" style="display:inline-flex;gap:2px;align-items:center;font-size:.72rem;font-weight:600;letter-spacing:.02em;padding-left:6px">` +
    item("pl", "PL") + item("uk", "UA") + item("en", "EN") + `</span>`
  );
}

// ── УНІФІКОВАНИЙ КАРКАС: єдине джерело header/footer для ВСІХ сторінок ────────
// Воркер видаляє власні <header>/<footer> сторінки й вставляє ці канонічні
// (локалізовані) + SHELL_CSS + /nav.js. Головна = режим "home" (fixed, прозорий
// →scrolled); решта = "inner" (sticky, непрозорий). Так бари завжди однакові.
const NAV = [
  { a: "#about", k: "nav.studio", pl: "Studio" },
  { a: "#kwalifikacje", k: "nav.kwalifikacje", pl: "Kwalifikacje" },
  { a: "#services", k: "nav.uslugi", pl: "Usługi" },
  { a: "#gallery", k: "nav.galeria", pl: "Galeria" },
  { p: "/porady", k: "nav.porady", pl: "Porady", cur: "porady" },
  { p: "/quiz", k: "nav.quiz", pl: "Quiz", quiz: true, cur: "quiz" },
  { a: "#contact", k: "nav.kontakt", pl: "Kontakt" },
];
function navLabel(lang, k, pl) {
  return (I18N[lang] && I18N[lang][k]) || pl;
}
function navHref(lang, it, home) {
  if (it.a) return home ? it.a : (lang === "pl" ? "/" : "/" + lang + "/") + it.a; // #about | /#about | /uk/#about
  if (it.p === "/porady") return "/porady"; // блог PL-only
  return lang === "pl" ? it.p : "/" + lang + it.p; // /quiz | /uk/quiz
}
function headerHtml(lang, { home = false, current = "", pl = "/", langHrefs = null } = {}) {
  const items = NAV.map((it) => {
    const cls = current && it.cur === current ? ' class="current"' : "";
    const q = it.quiz && home ? " data-quiz-open" : "";
    return `<li><a href="${navHref(lang, it, home)}"${cls}${q}>${navLabel(lang, it.k, it.pl)}</a></li>`;
  }).join("");
  const cta = `<li class="cta-li"><a href="${BOOKSY}" class="nav-cta" data-booksy target="_blank" rel="noopener noreferrer">${navLabel(lang, "nav.book", "Umów wizytę")}</a></li>`;
  return `<header class="nav${home ? " home" : ""}"${home ? ' id="nav"' : ""}>
<a href="${home ? "#top" : href(lang, "/")}" class="brand" aria-label="Zelika — Home"><svg class="mark" viewBox="67.02 42.13 276.81 155.47"><use href="/logo.svg#zmark"/></svg><span class="tag">Brows &amp; More</span></a>
<nav><ul class="nav-links">${items}${cta}</ul></nav>
${switcher(lang, pl, langHrefs)}
<button class="burger" id="burger" type="button" aria-label="Menu" aria-expanded="false">&#9776;</button>
</header>`;
}
const FOOT = {
  pl: { line: "Makijaż permanentny &middot; Brwi &middot; Rzęsy", city: "Wieluń", priv: "Polityka prywatności" },
  uk: { line: "Перманентний макіяж &middot; Брови &middot; Вії", city: "Велюнь", priv: "Політика конфіденційності" },
  en: { line: "Permanent makeup &middot; Brows &middot; Lashes", city: "Wieluń", priv: "Privacy policy" },
};
function footerHtml(lang) {
  const f = FOOT[lang] || FOOT.pl;
  return `<footer class="site"><div class="container"><a href="${href(lang, "/")}" class="brand" aria-label="Zelika — Home"><svg class="mark" viewBox="67.02 42.13 276.81 155.47"><use href="/logo.svg#zmark"/></svg><span class="tag">Brows &amp; More</span></a><p class="fline">Anna Zelinska &middot; ${f.line} <span class="fdot">|</span> ${f.city} <span class="fdot">&middot;</span> &copy; 2026 <span class="fdot">&middot;</span> <a href="/prywatnosc">${f.priv}</a> <span class="fdot">&middot;</span> <a href="#" data-cookies>Cookies</a></p></div></footer>`;
}
const SHELL_CSS = `
header.nav{position:sticky;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 40px;background:rgba(244,241,231,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line,#e6e1d3);transition:.45s ease}
header.nav.home{position:fixed;background:transparent;backdrop-filter:none;border-bottom:0;padding:16px 40px}
header.nav.home.scrolled{background:rgba(244,241,231,.9);backdrop-filter:blur(14px);padding:9px 40px;border-bottom:1px solid var(--line,#e6e1d3)}
header.nav .brand{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1;text-decoration:none}
header.nav .brand .mark{display:block;color:var(--green,#1f5e30);overflow:visible;width:120px;height:auto}
header.nav .brand .tag{font-family:var(--serif,'Cormorant Garamond',serif);letter-spacing:.34em;text-transform:uppercase;color:var(--gold,#a9863c);font-weight:600;font-size:.5rem;margin-top:1px;margin-left:3px}
header.nav .nav-links{display:flex;gap:34px;list-style:none;align-items:center;margin:0;padding:0}
header.nav .nav-links a{color:var(--ink,#2e2a22);text-decoration:none;font-size:.76rem;letter-spacing:.18em;text-transform:uppercase;font-weight:400;position:relative;padding:4px 0;transition:.3s}
header.nav .nav-links a::after{content:"";position:absolute;left:0;bottom:0;width:0;height:1px;background:var(--gold,#a9863c);transition:.35s}
header.nav .nav-links a:hover{color:var(--green,#1f5e30)}
header.nav .nav-links a:hover::after,header.nav .nav-links a.current::after{width:100%}
header.nav .nav-links a.current{color:var(--green,#1f5e30)}
header.nav .nav-cta{border:1px solid var(--green,#1f5e30);color:var(--green,#1f5e30)!important;padding:10px 22px!important;border-radius:2px;transition:.4s}
header.nav .nav-cta:hover{background:var(--green,#1f5e30);color:#fff!important}
header.nav .nav-cta::after{display:none!important}
header.nav .lang-switch a{padding:7px 8px;border-radius:6px;text-decoration:none}
header.nav .burger{display:none;background:none;border:none;color:var(--green,#1f5e30);font-size:1.7rem;line-height:1;cursor:pointer;padding:6px 8px}
footer.site{padding:54px 0 40px;border-top:1px solid var(--line,#e6e1d3);text-align:center;margin-top:40px;background:transparent;color:var(--muted,#6e7365);font-size:.85rem}
footer.site .container{max-width:1180px;margin:0 auto;padding:0 32px}
footer.site .brand{align-items:center;display:inline-flex;flex-direction:column;margin-bottom:14px;text-decoration:none;line-height:1}
footer.site .brand .mark{width:122px;height:auto;color:var(--green,#1f5e30);overflow:visible}
footer.site .brand .tag{font-family:var(--serif,'Cormorant Garamond',serif);letter-spacing:.34em;text-transform:uppercase;color:var(--gold,#a9863c);font-weight:600;font-size:.5rem;margin-top:3px}
footer.site .fline{color:var(--muted,#6e7365);font-size:.8rem;letter-spacing:.04em;margin-top:10px}
footer.site .fdot{color:var(--gold,#a9863c);margin:0 9px}
footer.site .fline a{color:var(--muted,#6e7365);text-decoration:none;border-bottom:1px solid var(--line-gold,#d8cba8);padding-bottom:1px;transition:.3s}
footer.site .fline a:hover{color:var(--green,#1f5e30);border-color:var(--green,#1f5e30)}
@media(max-width:920px){
header.nav .nav-links{position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;gap:0;background:rgba(244,241,231,.98);backdrop-filter:blur(14px);border-bottom:1px solid var(--line,#e6e1d3);box-shadow:0 20px 44px -20px rgba(31,94,48,.35);padding:4px 22px 16px;display:none}
header.nav .nav-links.open{display:flex}
header.nav .nav-links li{display:block}
header.nav .nav-links a:not(.nav-cta){display:block;padding:15px 2px;font-size:.95rem;letter-spacing:.14em;border-top:1px solid var(--line,#e6e1d3)}
header.nav .nav-links a:not(.nav-cta)::after{display:none}
header.nav .nav-links .nav-cta{display:block;text-align:center;margin-top:14px;padding:15px 20px!important}
header.nav .burger{display:block}
header.nav,header.nav.home,header.nav.home.scrolled{padding:14px 22px}
}`;
// внутрішні лінки на локалізованій сторінці → тримати мовний префікс.
// Анкери (#), зовнішні, mailto/tel і БЛОГ (/porady, PL-only) — не чіпаємо.
function localizeHref(s, lang) {
  if (lang === "pl" || !s) return null;
  // блог і політика конфіденційності — PL-only (не префіксуємо)
  if (s.startsWith("#") || /^(https?:|mailto:|tel:)/.test(s)) return null;
  if (s.startsWith("/porady") || s === "/prywatnosc") return null;
  if (s === "/") return "/" + lang + "/";
  if (s.startsWith("/#")) return "/" + lang + "/" + s.slice(1);
  if (s === "/quiz") return "/" + lang + s;
  return null;
}
const SEC_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};
// hreflang — tylko strony z wersjami PL/UA/EN; polityka prywatności jest tylko po polsku
// (sam canonical, bez alternates).
const PAGES = {
  home: { asset: "/", pl: "/", meta: META, hreflang: true },
  quiz: { asset: "/quiz", pl: "/quiz", meta: META_QUIZ, hreflang: true },
  priv: { asset: "/prywatnosc", pl: "/prywatnosc", meta: META_PRIV, hreflang: false },
};
// Dane z bota (cennik, ocena) wstrzykujemy na stronę główną (PL/UK/EN) i do quizu.
const DATA_PAGES = new Set(["home", "quiz"]);
async function localizedPage(request, env, api, lang, pageKey) {
  const page = PAGES[pageKey];
  const u = new URL(request.url);
  u.pathname = page.asset;
  u.search = "";
  const withData = DATA_PAGES.has(pageKey);
  // HTML zależy od danych z bota i od wersji wdrożenia (?v= przy JS/CSS, wspólny
  // nagłówek/stopka z workera) → bez warunkowych nagłówków: ETag pliku tego nie
  // odzwierciedla, a 304 zostawiłby w przeglądarce stare ceny / stare adresy skryptów.
  const assetHeaders = new Headers(request.headers);
  for (const h of ["if-none-match", "if-modified-since", "range", "if-range"]) assetHeaders.delete(h);
  const [res, contentRes, pagesRes] = await Promise.all([
    env.ASSETS.fetch(new Request(u.toString(), { headers: assetHeaders })),
    withData ? api.content() : null,
    // linki „Więcej o zabiegu” — dodatek: lista stron czytana bez czekania na origin
    pageKey === "home" ? api.pages({ soft: true }) : null,
  ]);
  const content = contentRes && contentRes.data;
  const cat = withData ? buildCatalogue(content) : null;
  const pageFor = pageByCategory(pagesOf(pagesRes));
  const zones = cat ? cat.zones : new Set();
  const rating = withData ? parseRating(content) : null;
  const meta = page.meta[lang] || page.meta.pl;
  const dict = I18N[lang] || {};
  const canon = SITE + href(lang, page.pl);
  const locale = (META[lang] || META.pl).locale;
  const home = pageKey === "home";
  const current = pageKey === "quiz" ? "quiz" : "";
  let rw = new HTMLRewriter()
    .on("html", { element(e) { e.setAttribute("lang", lang); } })
    .on("title", { element(e) { e.setInnerContent(meta.title); } })
    .on('meta[name="description"]', { element(e) { e.setAttribute("content", meta.desc); } })
    .on('meta[property="og:title"]', { element(e) { if (meta.ogtitle) e.setAttribute("content", meta.ogtitle); } })
    .on('meta[property="og:description"]', { element(e) { if (meta.ogdesc) e.setAttribute("content", meta.ogdesc); } })
    .on('meta[property="og:locale"]', { element(e) { e.setAttribute("content", locale); } })
    .on('link[rel="canonical"]', { element(e) { e.remove(); } }) // приберемо статичний, щоб не було дубля
    .on("head", { element(e) {
      if (page.hreflang) e.append(hreflangFor(page.pl), { html: true });
      e.append(`<link rel="canonical" href="${canon}">`, { html: true });
      e.append(`<style>${SHELL_CSS}</style>`, { html: true }); // канон-каркас: авторитетний, останнім
      e.append(`<script src="/nav.js" defer></script>`, { html: true });
    } })
    // Уніфікований каркас: прибираємо власні header/footer сторінки й вставляємо канонічні.
    // ⚠️ ЛИШЕ header.nav (не чат-віджет header.zchat-head!). footer сторінки — <footer>
    // (чат-підвал це <div class="zchat-foot">, тож не зачіпаємо).
    .on("header.nav", { element(e) { e.remove(); } })
    .on("footer", { element(e) { e.remove(); } })
    .on("body", { element(e) {
      e.prepend(headerHtml(lang, { home, current, pl: page.pl }), { html: true });
      e.append(footerHtml(lang), { html: true });
    } })
    .on("img[src]", { element(e) { const s = e.getAttribute("src"); if (s && !/^(https?:|\/|data:)/.test(s)) e.setAttribute("src", "/" + s); } })
    .on("script[src]", { element(e) { const s = e.getAttribute("src"); if (s && !/^(https?:|\/)/.test(s)) e.setAttribute("src", "/" + s); } })
    .on("a[href]", { element(e) { const t = localizeHref(e.getAttribute("href"), lang); if (t) e.setAttribute("href", t); } });
  if (lang !== "pl") {
    rw = rw
      .on("[data-i18n]", {
        element(e) {
          const v = dict[e.getAttribute("data-i18n")];
          if (v != null) e.setInnerContent(v, { html: true });
        },
      })
      .on("[data-i18n-attrs]", {
        element(e) {
          for (const pair of String(e.getAttribute("data-i18n-attrs")).split(/\s+/)) {
            const [attr, k] = pair.split("=");
            if (attr && k && dict[k] != null) e.setAttribute(attr, htmlToText(dict[k]));
          }
        },
      });
  }
  if (pageKey === "quiz") {
    // H1 + wstęp w surowym HTML (tylko strona quizu; #card w modalu na głównej — bez zmian)
    rw = rw.on("#card", { element(e) {
      e.setAttribute("data-ssr", "");
      e.setInnerContent(quizIntroHtml(lang), { html: true });
    } });
  }
  if (withData && cat) {
    // ceny dla quizu (quiz.js czyta #cennik-data; to dane, nie skrypt — CSP bez zmian)
    rw = rw.on("head", { element(e) {
      e.append(`<script type="application/json" id="cennik-data">${quizDataJson(cat)}</script>`, { html: true });
    } });
  }
  if (home) {
    // Galeria z bota: pierwsze N kafelków (reszta — statyczne zdjęcia strony)
    const tiles = homeGallery(content, lang);
    if (tiles.length) {
      let gi = 0;
      rw = rw.on(".gallery-grid .gitem", { element(e) {
        const t = tiles[gi++];
        if (!t) return;
        // plitka „Więcej na Instagramie” (<a>) — zdjęcie z bota zastępuje cały element, bez linku
        if (e.tagName === "a") e.replace(`<div class="gitem reveal d3">${galleryTileInner(t)}</div>`, { html: true });
        else e.setInnerContent(galleryTileInner(t), { html: true });
      } });
    }
    // Zdjęcia studia pod tekstem „O mnie” (portret bez zmian)
    const studio = aboutPhotos(content, lang);
    if (studio.length) {
      rw = rw.on(".about-stats", { element(e) { e.after(aboutStudioHtml(studio), { html: true }); } });
    }
    // Przed i po: suwaki z bota; brak par — sekcja zostaje ukryta
    const pairs = beforeAfter(content, lang);
    if (pairs.length) {
      rw = rw
        .on("#efekty", { element(e) { e.removeAttribute("hidden"); } })
        .on("#ba-wrap", { element(e) { e.setInnerContent(baHtml(pairs, lang), { html: true }); } });
    }
    // Cennik renderowany na serwerze (Google/AI widzą aktualne ceny bez JS).
    if (cat) {
      rw = rw.on(".svc-cats", { element(e) { e.setInnerContent(cennikHtml(cat, lang, pageFor), { html: true }); } });
    } else if (lang !== "pl") {
      // Brak danych i kopii → statyczny snapshot z index.html (jedyna kopia offline),
      // ale z przetłumaczonymi kategoriami, notą, „od” i czasem trwania (nazwy usług — PL,
      // jak przy braku tłumaczeń w API).
      rw = rw
        .on(".svc-cats .cat-h h3", textMapHandler((raw) => {
          const d = CAT_BY_KEY.get(catKey(decodeEntities(raw)));
          return d ? esc(d[lang]) : raw;
        }))
        .on(".svc-cats .feat-note", { element(e) { e.setInnerContent(FEAT_NOTE[lang]); } })
        .on(".svc-cats .cat-new", { element(e) { e.setInnerContent(NEW_BADGE[lang]); } })
        .on(".svc-cats .pdur", textMapHandler((raw) => esc(fmtDuration(decodeEntities(raw), lang))))
        .on(".svc-cats .price", textMapHandler((raw) => raw.replace(/^od\s/, PRICE_FROM[lang] + " ")));
    }

    // Ocena Google: z API, a bez danych — ze snapshotu <meta name="zelika:google-rating">
    // (head, więc jest przeczytany, zanim dojdziemy do elementów w body).
    let snapshot = null;
    const R = () => rating || snapshot;
    const txt = REVIEWS_TXT[lang] || REVIEWS_TXT.pl;
    // FAQPage budujemy z widocznego FAQ (PL — z HTML, UK/EN — ze słownika), z pominięciem
    // pytań ukrytych przez data-needs; wstawiamy na końcu <body>.
    const faq = [];
    let faqCur = null;
    const needsOk = (e) => {
      const need = String(e.getAttribute("data-needs") || "").split(/\s+/).filter(Boolean);
      return !need.length || need.some((z) => zones.has(z));
    };
    const faqPart = (field) => ({
      element(e) {
        if (!faqCur) return;
        const k = e.getAttribute("data-i18n");
        if (lang !== "pl" && k && dict[k] != null) faqCur[field] = htmlToText(dict[k]);
        else faqCur[field + "Raw"] = "";
      },
      text(t) {
        if (faqCur && faqCur[field + "Raw"] != null) {
          faqCur[field + "Raw"] += t.text;
          if (t.lastInTextNode) faqCur[field] = htmlToText(faqCur[field + "Raw"]);
        }
      },
    });

    rw = rw
      .on('meta[name="zelika:google-rating"]', { element(e) { snapshot = parseRatingSnapshot(e.getAttribute("content")); e.remove(); } })
      .on("script#ld-business", jsonScriptHandler((ld) => businessLd(ld, cat, lang)))
      .on("script#ld-person", jsonScriptHandler((ld) => {
        if (lang !== "pl" && ld && typeof ld === "object") ld.jobTitle = JOB_TITLE[lang];
        return ld;
      }))
      // (kolejność ważna: pozycję FAQ zapisujemy, zanim [data-needs] ewentualnie ją usunie)
      .on("details.faq-item", { element(e) { faqCur = { ok: needsOk(e), q: "", a: "" }; faq.push(faqCur); } })
      // „uśpione” treści (np. FAQ o ustach) — tylko gdy strefa jest w katalogu
      .on("[data-needs]", { element(e) {
        if (needsOk(e)) e.removeAttribute("hidden");
        else e.remove();
      } })
      .on("details.faq-item > summary", faqPart("q"))
      .on("details.faq-item > div", faqPart("a"))
      .on("body", { element(e) {
        e.onEndTag((end) => {
          const ld = faqPageLd(faq, lang);
          if (ld) end.before(`<script type="application/ld+json">${scriptJson(ld)}</script>`, { html: true });
        });
      } })
      .on("[data-google-rating]", { element(e) { const v = R(); if (v) e.setInnerContent(fmtRating(v.r, lang)); } })
      .on("[data-stars]", { element(e) { const v = R(); if (v) e.setInnerContent(starsOf(v.r)); } })
      .on("[data-reviews]", { element(e) {
        const v = R();
        const f = txt[e.getAttribute("data-reviews")];
        if (v && f) e.setInnerContent(f(fmtRating(v.r, lang), v.n), { html: true });
      } })
      .on("a.hv-rating", { element(e) { const v = R(); if (v) e.setAttribute("aria-label", txt.aria(fmtRating(v.r, lang))); } })
      // karuzela tylko z prawdziwymi opiniami; bez nich — bez pustego pudełka
      .on("#rev-track", { element(e) {
        if (rating && rating.list.length) e.setInnerContent(reviewCardsHtml(rating.list), { html: true });
        else e.remove();
      } });
  }
  const out = rw.transform(res);
  const h = new Headers(out.headers);
  h.set("Content-Security-Policy", HOMEPAGE_CSP);
  for (const k in SEC_HEADERS) h.set(k, SEC_HEADERS[k]);
  h.delete("ETag");
  h.delete("Last-Modified");
  if (withData) {
    h.set("Cache-Control", "public, max-age=0, must-revalidate");
    h.set("X-Zelika-Data", contentRes.source);
  }
  return new Response(out.body, { status: res.status, statusText: res.statusText, headers: h });
}

// ── Kanoniczne adresy (301) ─────────────────────────────────────────────────────
// Воркер запускається першим для всіх сторінок (wrangler.jsonc: run_worker_first — усе,
// крім статики), тож www→apex і канонічні шляхи віддаємо самі як 301 — раніше частину робив шар
// assets (html_handling: auto-trailing-slash) тимчасовим 307, а частина (/index.html,
// /porady/, /uk/quiz/) віддавала дубль сторінки з 200.
const WWW_HOST = "www.zelika.pl";
const CANON_PATHS = new Map([
  ["/index.html", "/"],
  ["/index", "/"], // (warstwa assets robi to 307, a dla /index/ — dwoma skokami)
  ["/uk", "/uk/"],
  ["/uk/index.html", "/uk/"],
  ["/en", "/en/"],
  ["/en/index.html", "/en/"],
  ["/quiz.html", "/quiz"],
  ["/prywatnosc.html", "/prywatnosc"],
]);
// strony i pliki z workera bez końcowego „/” (adres z „/” → 301 bez niego); strony usług
// /<slug>/ — osobno (renderServicePage: 301 tylko dla istniejącej strony)
const NO_SLASH_RE = /^\/(?:porady(?:\/[^/]+)?|quiz|uk\/quiz|en\/quiz|prywatnosc|robots\.txt|sitemap\.xml|llms\.txt)$/;
function canonicalPath(p) {
  if (CANON_PATHS.has(p)) return CANON_PATHS.get(p);
  if (p.length > 1 && p.endsWith("/")) {
    const s = p.replace(/\/+$/, "");
    if (s === "") return "/"; // „//”
    if (s === "/uk" || s === "/en") return p === s + "/" ? null : s + "/"; // „/uk//”
    if (CANON_PATHS.has(s)) return CANON_PATHS.get(s); // „/index/”, „/quiz.html/”
    if (NO_SLASH_RE.test(s)) return s;
  }
  return null;
}
function redirect301(location, maxAge = 3600) {
  return new Response(null, {
    status: 301,
    headers: { Location: location, "Cache-Control": `public, max-age=${maxAge}`, ...SEC_HEADERS },
  });
}

// ── Wersjonowanie lokalnych JS/CSS per wdrożenie (cache-busting) ─────────────────
// JS/CSS mają w _headers długi cache (doba + SWR), a nazwy plików są bez hasha. Każdy
// HTML z workera (statyczne strony przez HTMLRewriter i szablony) dostaje więc przy
// lokalnych <script src> i <link rel=stylesheet|preload href> → .js/.css parametr
// ?v=<8 znaków id wersji Workera> (binding version_metadata) — po wdrożeniu nowy adres,
// stara kopia z cache przeglądarki nie zostanie użyta. Bez bindingu (dev) — "dev".
const LOCAL_JS_CSS_RE = /^(?![a-z][a-z0-9+.-]*:|\/\/)[^?#]*\.(?:js|css)(?:[?#]|$)/i;
function assetVersion(env) {
  const id = env && env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id;
  return (id && String(id).replace(/[^A-Za-z0-9]/g, "").slice(0, 8)) || "dev";
}
function versionedUrl(u, v) {
  if (!u || !LOCAL_JS_CSS_RE.test(u)) return null;
  const i = u.indexOf("#");
  const base = i < 0 ? u : u.slice(0, i);
  if (/[?&]v=/.test(base)) return null;
  return base + (base.includes("?") ? "&" : "?") + "v=" + v + (i < 0 ? "" : u.slice(i));
}
function versionAssets(res, v) {
  if (!res.body || !/^text\/html/i.test(res.headers.get("Content-Type") || "")) return res;
  const attr = (name) => ({
    element(e) {
      const t = versionedUrl(e.getAttribute(name), v);
      if (t) e.setAttribute(name, t);
    },
  });
  return new HTMLRewriter()
    .on("script[src]", attr("src"))
    .on('link[href][rel~="stylesheet"]', attr("href"))
    .on('link[href][rel~="preload"]', attr("href"))
    .transform(res);
}

export default {
  async fetch(request, env, ctx) {
    return versionAssets(await site.route(request, env, ctx), assetVersion(env));
  },
};

const site = {
  async route(request, env, ctx) {
    const url = new URL(request.url);
    // www → apex: przed całym routingiem (strony, robots, sitemap, llms, /media; zdjęcia i
    // JS/CSS/ikony serwuje warstwa assets bez workera — patrz run_worker_first)
    // (od razu na kanoniczną ścieżkę: www…/index.html → https://zelika.pl/ jednym skokiem)
    if (url.hostname === WWW_HOST) {
      return redirect301(SITE + (canonicalPath(url.pathname) || url.pathname) + url.search, 86400);
    }
    const canon = canonicalPath(url.pathname);
    if (canon) return redirect301(new URL(canon + url.search, url).toString());

    const path = url.pathname.replace(/\/+$/, "") || "/";
    const api = makeApi(env, ctx);

    if (path === "/porady") return renderIndex(api);
    if (path.startsWith("/porady/")) {
      let slug;
      try {
        slug = decodeURIComponent(path.slice("/porady/".length));
      } catch (_) {
        slug = ""; // zepsute %-kodowanie → 404, nie wyjątek
      }
      return renderPost(api, slug);
    }
    const media = url.pathname.match(/^\/media\/([A-Za-z0-9_-]{1,128})\.jpg$/);
    if (media) return mediaResponse(request, env, ctx, media[1]);
    if (path === "/sitemap.xml") return renderSitemap(api);
    if (path === "/robots.txt") return renderRobots();
    if (path === "/llms.txt") return renderLlms(api);

    // Strona główna: czat z widgetem Turnstile, który wstrzykuje inline-skrypt
    // (z losowym tokenem → hash niestabilny, nonce niemożliwy na statyce). Dlatego
    // TYLKO dla "/" luzujemy script-src do 'unsafe-inline'. Reszta stron (_headers)
    // zostaje ścisła. Ryzyko znikome: strona statyczna, brak wstrzykiwania HTML.
    // Локалізовані сторінки (PL/UA/EN) через HTMLRewriter (data-i18n) + hreflang +
    // перемикач мов. PL теж через воркер — щоб мати hreflang і перемикач.
    // (/index.html, /uk, /uk/index.html, /en… → 301 wyżej; tu już tylko /, /uk/, /en/)
    if (path === "/") return localizedPage(request, env, api, "pl", "home");
    if (path === "/uk") return localizedPage(request, env, api, "uk", "home");
    if (path === "/en") return localizedPage(request, env, api, "en", "home");
    if (path === "/quiz") return localizedPage(request, env, api, "pl", "quiz");
    if (path === "/uk/quiz") return localizedPage(request, env, api, "uk", "quiz");
    if (path === "/en/quiz") return localizedPage(request, env, api, "en", "quiz");
    // /prywatnosc — юридичний документ, лишається PL, але через воркер (уніфікований каркас)
    if (path === "/prywatnosc") return localizedPage(request, env, api, "pl", "priv");

    // Strony usług /<slug> (opublikowane z /api/pages, a bez listy — znane slugi przez
    // /api/pages/<slug>, KNOWN_PAGE_SLUGS; /<slug>/ → 301). Wzorzec bez kropki nie
    // zasłania plików statycznych (wszystkie mają rozszerzenie), a zajęte nazwy
    // (RESERVED_SLUGS, np. katalog img) i trasy wyżej mają pierwszeństwo.
    const sp = url.pathname.match(/^\/([a-z0-9-]{1,120})(\/+)?$/);
    if (sp && isPageSlug(sp[1])) {
      const r = await renderServicePage(request, api, sp[1], !!sp[2]);
      if (r) return r;
    }

    // wszystko inne → statyka; brak pliku (też /uk/…, /en/…, /.git/…, /worker.js — wykluczone
    // w .assetsignore) → brandowana 404
    const res = await env.ASSETS.fetch(request);
    if (res.status === 404) return wantsHtmlPage(request, url) ? notFoundResponse(api) : plainNotFound();
    // przekierowania warstwy assets (html_handling, np. /index/ → /index) — trwałe 301 zamiast
    // 307 i od razu na kanoniczną ścieżkę (/index/ → / jednym skokiem), z query żądania
    if ((res.status === 307 || res.status === 308) && res.headers.has("Location")) {
      const loc = new URL(res.headers.get("Location"), url);
      if (loc.origin === url.origin) {
        loc.pathname = canonicalPath(loc.pathname) || loc.pathname;
        if (!loc.search) loc.search = url.search;
      }
      return redirect301(loc.toString());
    }
    return res;
  },
};
