(function(){
const BOOKSY = "https://booksy.com/pl-pl/334211_zelika-pmu-makijaz-permanentny-wielun_brwi-i-rzesy_25323_wielun";
  const LEAD_URL = "https://hooks.zelika.pl/webhook/lead";

  // Мова з URL (/uk/quiz, /en/quiz) — тексти беремо зі словника, логіка балів спільна.
  const LANG = (location.pathname.match(/^\/(uk|en)(\/|$)/) || [])[1] || "pl";
  const HOME = LANG === "pl" ? "/" : "/" + LANG + "/";

  const QUESTIONS = [
    {
      q: "Jak opisałabyś swoje brwi dzisiaj?",
      answers: [
        { t:"Mają prześwity — brakuje włosków", s:{wlosowa:2,pudrowa:2,mieszana:2} },
        { t:"Niesforne — rosną w różnych kierunkach", s:{laminacja:3} },
        { t:"Cienkie i jasne po latach regulacji", s:{pudrowa:2,mieszana:2,regulacja:1} },
        { t:"Są okej — chcę tylko nadać im kształt", s:{regulacja:2,laminacja:1} }
      ]
    },
    {
      q: "O jakim efekcie marzysz?",
      answers: [
        { t:"Naturalny — jakby to były moje własne włoski", s:{wlosowa:3} },
        { t:"Makijażowy — wyraziste i gładko wypełnione", s:{pudrowa:3} },
        { t:"Złoty środek — naturalnie, ale z charakterem", s:{mieszana:3} },
        { t:"Gęstsze i ułożone, ale bez makijażu permanentnego", s:{laminacja:3,regulacja:1} }
      ]
    },
    {
      q: "Czy malujesz brwi na co dzień?",
      answers: [
        { t:"Tak — nie wychodzę bez wymalowanych brwi", s:{pudrowa:2,mieszana:1} },
        { t:"Czasem, gdy mam wyjście", s:{wlosowa:1,mieszana:2} },
        { t:"Rzadko albo wcale", s:{wlosowa:2,laminacja:1,regulacja:1} },
        { t:"Chcę przestać tracić na to czas każdego ranka", s:{wlosowa:2,pudrowa:2,mieszana:2} }
      ]
    },
    {
      q: "Jaka jest Twoja skóra w okolicy brwi?",
      answers: [
        { t:"Raczej tłusta", s:{pudrowa:3} },
        { t:"Normalna lub sucha", s:{wlosowa:2,mieszana:1} },
        { t:"Mieszana", s:{mieszana:2} },
        { t:"Trudno powiedzieć / nie wiem", s:{mieszana:1,regulacja:1} }
      ]
    },
    {
      q: "Na jaki krok jesteś gotowa?",
      answers: [
        { t:"Chcę efektu na długie miesiące", s:{wlosowa:2,pudrowa:2,mieszana:2} },
        { t:"Wolę zacząć od czegoś nietrwałego", s:{laminacja:3,regulacja:2} },
        { t:"Najpierw chcę konsultację — mam pewne obawy", s:{regulacja:2} }
      ]
    }
  ];

  const RESULTS = {
    wlosowa: { service:"Makijaż permanentny brwi", title:"Metoda włosowa", price:"od 600 zł",
      desc:"Twój typ to naturalność. Metoda włosowa odtwarza pojedyncze włoski tak realistycznie, że nikt nie pozna, że to makijaż permanentny. Idealna, gdy masz prześwity, ale chcesz wyglądać po prostu jak lepsza, wyspana wersja siebie — każdego dnia, bez malowania." },
    pudrowa: { service:"Makijaż permanentny brwi", title:"Metoda pudrowa (ombré)", price:"od 600 zł",
      desc:"Marzysz o efekcie makijażu, który się nie ściera. Metoda pudrowa daje miękki, równomiernie wypełniony look — jak po delikatnej pomadce do brwi. Świetnie sprawdza się również przy cerze tłustej. Obudzisz się z gotowymi brwiami i zapomnisz o porannym rysowaniu." },
    mieszana: { service:"Makijaż permanentny brwi", title:"Metoda mieszana", price:"od 600 zł",
      desc:"Chcesz złoty środek — naturalnie u nasady, wyraziście ku końcowi. Metoda mieszana łączy realistyczne włoski z delikatnym cieniowaniem. To najbardziej uniwersalny wybór, który pięknie podkreśla brwi i pasuje niemal każdej twarzy." },
    laminacja: { service:"Stylizacja brwi", title:"Laminacja brwi", price:"od 140 zł",
      desc:"Twoje brwi potrzebują ujarzmienia, ale nie jesteś (jeszcze) gotowa na makijaż permanentny. Laminacja układa włoski w jednym kierunku, dodaje gęstości i optycznie podkręca brwi — efekt utrzymuje się do około 6 tygodni. Idealny, niezobowiązujący pierwszy krok. W cenie regulacja i farbka." },
    regulacja: { service:"Stylizacja brwi", title:"Regulacja i farbka brwi", price:"od 90 zł",
      desc:"Lubisz mieć kontrolę i wolisz zacząć od małego kroku. Profesjonalna regulacja nada brwiom idealny kształt dopasowany do rysów Twojej twarzy, a farbka podkreśli ich kolor. Świetny start, by oswoić się i zobaczyć potencjał swoich brwi przed decyzją o makijażu permanentnym." }
  };

  // Переклади текстів (порядок питань/відповідей = як у QUESTIONS; бали спільні)
  const QT = {
    uk: [
      { q:"Як би ти описала свої брови зараз?", a:["Є прогалини — бракує волосків","Неслухняні — ростуть у різні боки","Тонкі й світлі після років вищипування","Загалом ок — хочу лише надати форму"] },
      { q:"Про який ефект мрієш?", a:["Природний — наче це мої власні волоски","Макіяжний — виразні й рівно заповнені","Золота середина — природно, але з характером","Густіші й вкладені, але без перманентного макіяжу"] },
      { q:"Чи фарбуєш брови щодня?", a:["Так — не виходжу без нафарбованих брів","Іноді, коли є вихід","Рідко або ніколи","Хочу перестати марнувати на це час щоранку"] },
      { q:"Яка в тебе шкіра в зоні брів?", a:["Радше жирна","Нормальна або суха","Комбінована","Важко сказати / не знаю"] },
      { q:"На який крок ти готова?", a:["Хочу ефект на довгі місяці","Волію почати з чогось нетривкого","Спершу хочу консультацію — маю певні сумніви"] }
    ],
    en: [
      { q:"How would you describe your brows right now?", a:["They have gaps — missing hairs","Unruly — growing in different directions","Thin and light after years of plucking","They're okay — I just want to shape them"] },
      { q:"What result are you dreaming of?", a:["Natural — as if they were my own hairs","Makeup-like — bold and smoothly filled","The golden mean — natural but with character","Fuller and set, but without permanent makeup"] },
      { q:"Do you fill in your brows daily?", a:["Yes — I never go out without done brows","Sometimes, when I go out","Rarely or never","I want to stop wasting time every morning"] },
      { q:"What's your skin like around the brows?", a:["Rather oily","Normal or dry","Combination","Hard to say / I don't know"] },
      { q:"What step are you ready for?", a:["I want a result for many months","I'd rather start with something non-permanent","First I'd like a consultation — I have some concerns"] }
    ]
  };
  const RT = {
    uk: {
      wlosowa:{ service:"Перманентний макіяж брів", title:"Волоскова методика", price:"від 600 zł",
        desc:"Твій типаж — природність. Волоскова методика відтворює окремі волоски настільки реалістично, що ніхто не здогадається, що це перманентний макіяж. Ідеально, коли є прогалини, але хочеш виглядати просто як краща, виспана версія себе — щодня, без фарбування." },
      pudrowa:{ service:"Перманентний макіяж брів", title:"Пудрова методика (ombré)", price:"від 600 zł",
        desc:"Мрієш про ефект макіяжу, який не стирається. Пудрова методика дає м'який, рівномірно заповнений вигляд — наче після делікатної помадки для брів. Чудово підходить і для жирної шкіри. Прокинешся з готовими бровами й забудеш про ранкове малювання." },
      mieszana:{ service:"Перманентний макіяж брів", title:"Змішана методика", price:"від 600 zł",
        desc:"Хочеш золоту середину — природно біля основи, виразно до кінчика. Змішана методика поєднує реалістичні волоски з делікатним розтушуванням. Це найуніверсальніший вибір, що красиво підкреслює брови й пасує майже кожному обличчю." },
      laminacja:{ service:"Стилізація брів", title:"Ламінування брів", price:"від 140 zł",
        desc:"Твоїм бровам потрібне приборкання, але ти ще не готова до перманентного макіяжу. Ламінування вкладає волоски в одному напрямку, додає густоти й візуально підкручує брови — ефект тримається до ~6 тижнів. Ідеальний, ні до чого не зобов'язуючий перший крок. У ціні — корекція та фарбування." },
      regulacja:{ service:"Стилізація брів", title:"Корекція та фарбування брів", price:"від 90 zł",
        desc:"Любиш контроль і волієш почати з маленького кроку. Професійна корекція надасть бровам ідеальну форму під риси твого обличчя, а фарбування підкреслить колір. Чудовий старт, щоб призвичаїтись і побачити потенціал своїх брів перед рішенням про перманентний макіяж." }
    },
    en: {
      wlosowa:{ service:"Permanent brow makeup", title:"Hair-stroke method", price:"from 600 zł",
        desc:"Your type is all about natural. The hair-stroke method recreates individual hairs so realistically that no one will know it's permanent makeup. Perfect when you have gaps but want to look like a better, well-rested version of yourself — every day, without filling them in." },
      pudrowa:{ service:"Permanent brow makeup", title:"Powder method (ombré)", price:"from 600 zł",
        desc:"You dream of a makeup effect that doesn't rub off. The powder method gives a soft, evenly filled look — like after a gentle brow pomade. It also works great on oily skin. You'll wake up with ready brows and forget about morning drawing." },
      mieszana:{ service:"Permanent brow makeup", title:"Combined method", price:"from 600 zł",
        desc:"You want the golden mean — natural at the base, defined toward the tail. The combined method blends realistic hairs with soft shading. It's the most universal choice that beautifully enhances brows and suits almost any face." },
      laminacja:{ service:"Brow styling", title:"Brow lamination", price:"from 140 zł",
        desc:"Your brows need taming, but you're not (yet) ready for permanent makeup. Lamination sets the hairs in one direction, adds density and visually lifts the brows — the effect lasts up to ~6 weeks. A perfect, no-commitment first step. Shaping and tint included." },
      regulacja:{ service:"Brow styling", title:"Brow shaping & tint", price:"from 90 zł",
        desc:"You like being in control and prefer to start small. Professional shaping gives your brows the perfect form for your face, and tinting enhances their colour. A great start to get comfortable and see your brows' potential before deciding on permanent makeup." }
    }
  };
  const UI = {
    pl: { eyebrow:"Quiz", h1:"Jaki zabieg brwi <em>jest dla Ciebie?</em>", lead:"Każda twarz jest inna — i każde brwi też. Odpowiedz na kilka pytań, a podpowiem Ci, który zabieg najlepiej odpowie na Twoje potrzeby i oczekiwania.", start:"Rozpocznij quiz", note:"5 pytań &middot; <b>około 1 minuty</b> &middot; bez zobowiązań", qlabel:(n,N)=>`Pytanie ${n} z ${N}`, back:"← Wróć", resEyebrow:"Twój wynik", consult:"<p><b>Masz obawy? To zupełnie naturalne.</b> Umów się najpierw na niezobowiązującą konsultację — spokojnie porozmawiamy, odpowiem na wszystkie pytania i wspólnie dobierzemy najlepsze rozwiązanie dla Ciebie.</p>", booksy:"Zarezerwuj w Booksy", leadTitle:"<p><b>Wolisz, żebyśmy odezwali się z rekomendacją?</b> Zostaw kontakt — Anna napisze do Ciebie 💕</p>", placeholder:"Instagram lub telefon", send:"Wyślij kontakt", noteEmpty:"Wpisz Instagram lub telefon 🙂", noteOk:"Dziękujemy! Odezwiemy się wkrótce 💕", noteErr:"Spróbuj ponownie za chwilę.", cennik:"Zobacz pełny cennik", restart:"↺ Powtórz quiz" },
    uk: { eyebrow:"Квіз", h1:"Яка процедура для брів <em>підходить саме тобі?</em>", lead:"Кожне обличчя різне — і кожні брови теж. Дай відповідь на кілька запитань, і я підкажу, яка процедура найкраще відповість на твої потреби й очікування.", start:"Почати квіз", note:"5 запитань &middot; <b>близько 1 хвилини</b> &middot; без зобов'язань", qlabel:(n,N)=>`Питання ${n} з ${N}`, back:"← Назад", resEyebrow:"Твій результат", consult:"<p><b>Маєш сумніви? Це цілком нормально.</b> Запишися спершу на необов'язкову консультацію — спокійно поговоримо, відповім на всі питання й разом підберемо найкраще рішення для тебе.</p>", booksy:"Забронювати в Booksy", leadTitle:"<p><b>Волієш, щоб ми написали з рекомендацією?</b> Залиш контакт — Анна тобі напише 💕</p>", placeholder:"Instagram або телефон", send:"Надіслати контакт", noteEmpty:"Введи Instagram або телефон 🙂", noteOk:"Дякуємо! Ми скоро напишемо 💕", noteErr:"Спробуй ще раз за мить.", cennik:"Переглянути повний прайс", restart:"↺ Пройти ще раз" },
    en: { eyebrow:"Quiz", h1:"Which brow treatment <em>is right for you?</em>", lead:"Every face is different — and so are your brows. Answer a few questions and I'll suggest which treatment best fits your needs and expectations.", start:"Start the quiz", note:"5 questions &middot; <b>about 1 minute</b> &middot; no commitment", qlabel:(n,N)=>`Question ${n} of ${N}`, back:"← Back", resEyebrow:"Your result", consult:"<p><b>Have concerns? That's completely normal.</b> Book a no-obligation consultation first — we'll talk it through calmly, I'll answer all your questions and together we'll choose the best option for you.</p>", booksy:"Book on Booksy", leadTitle:"<p><b>Prefer us to reach out with a recommendation?</b> Leave your contact — Anna will message you 💕</p>", placeholder:"Instagram or phone", send:"Send contact", noteEmpty:"Enter Instagram or phone 🙂", noteOk:"Thank you! We'll be in touch soon 💕", noteErr:"Please try again in a moment.", cennik:"See the full price list", restart:"↺ Retake the quiz" }
  };
  const ui = UI[LANG] || UI.pl;
  const qText = (qi) => (QT[LANG] && QT[LANG][qi] && QT[LANG][qi].q) || QUESTIONS[qi].q;
  const aText = (qi, ai) => (QT[LANG] && QT[LANG][qi] && QT[LANG][qi].a[ai]) || QUESTIONS[qi].answers[ai].t;
  const rOf = (key) => (RT[LANG] && RT[LANG][key]) || RESULTS[key];

  const PRIORITY = ['mieszana','wlosowa','pudrowa','laminacja','regulacja'];

  let step = 0;
  let answers = [];
  const card = document.getElementById('card');

  function computeResult(){
    const s = {wlosowa:0,pudrowa:0,mieszana:0,laminacja:0,regulacja:0};
    answers.forEach((ai,qi)=>{
      const sc = QUESTIONS[qi].answers[ai].s;
      for(const k in sc){ s[k]+=sc[k]; }
    });
    let best = PRIORITY[0], bestVal = -1;
    PRIORITY.forEach(k=>{ if(s[k] > bestVal){ bestVal = s[k]; best = k; } });
    return best;
  }

  function esc(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function introHTML(){
    return `
      <span class="eyebrow">${ui.eyebrow}</span>
      <h1>${ui.h1}</h1>
      <p class="lead">${esc(ui.lead)}</p>
      <div class="btn-row"><button class="btn" data-action="start">${esc(ui.start)}</button></div>
      <p class="intro-note">${ui.note}</p>
    `;
  }

  function questionHTML(qi){
    const pct = Math.round((qi+1)/QUESTIONS.length*100);
    const backBtn = qi>0 ? `<button class="progress-back" data-action="back">${esc(ui.back)}</button>` : `<span></span>`;
    const opts = QUESTIONS[qi].answers.map((a,ai)=>{
      const sel = answers[qi]===ai ? ' sel' : '';
      return `<button class="answer${sel}" data-action="answer" data-ai="${ai}">${esc(aText(qi,ai))}</button>`;
    }).join('');
    return `
      <div class="progress-head">
        <span class="progress-label">${esc(ui.qlabel(qi+1, QUESTIONS.length))}</span>
        ${backBtn}
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <h2 class="q-title">${esc(qText(qi))}</h2>
      <div class="answers">${opts}</div>
    `;
  }

  function resultHTML(){
    const R = rOf(computeResult());
    const consultBlock = answers[4]===2 ? `<div class="consult">${ui.consult}</div>` : '';
    return `
      <span class="eyebrow">${ui.resEyebrow}</span>
      <div class="res-service">${esc(R.service)}</div>
      <h1>${esc(R.title)}</h1>
      <div class="res-price">${esc(R.price)}</div>
      <p class="res-desc">${esc(R.desc)}</p>
      ${consultBlock}
      <div class="btn-row">
        <a class="btn" href="${BOOKSY}" target="_blank" rel="noopener noreferrer">${esc(ui.booksy)}</a>
      </div>
      <div class="consult lead-cta">
        ${ui.leadTitle}
        <input id="lead-contact" type="text" placeholder="${esc(ui.placeholder)}" maxlength="120" autocomplete="off" style="width:100%;padding:12px 14px;margin:10px 0;border:1px solid #cdbfae;border-radius:10px;font:inherit;background:#fff">
        <button class="btn-ghost" data-action="lead">${esc(ui.send)}</button>
        <p id="lead-note" style="margin-top:10px;font-size:.95em"></p>
      </div>
      <div class="res-links">
        <a href="${HOME}#services">${esc(ui.cennik)}</a>
        <button data-action="restart">${esc(ui.restart)}</button>
      </div>
    `;
  }

  function buildHTML(){
    if(step===0) return introHTML();
    if(step>=1 && step<=QUESTIONS.length) return questionHTML(step-1);
    return resultHTML();
  }

  const modal = document.getElementById('quiz-modal');
  function show(scroll){
    card.classList.add('fade');
    setTimeout(()=>{
      card.innerHTML = buildHTML();
      card.classList.remove('fade');
      if(scroll){
        const sc = document.querySelector('.quiz');
        if(sc) sc.scrollIntoView({behavior:'smooth',block:'start'});
        else if(modal) modal.scrollTop = 0;
      }
    },180);
  }

  card.addEventListener('click', (e)=>{
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const act = el.dataset.action;
    if(act==='start'){ step=1; show(true); }
    else if(act==='answer'){
      answers[step-1] = parseInt(el.dataset.ai,10);
      el.classList.add('sel');
      step++;
      setTimeout(()=>show(true), 160);
    }
    else if(act==='back'){ if(step>1){ step--; show(true); } }
    else if(act==='lead'){
      const inp = document.getElementById('lead-contact');
      const note = document.getElementById('lead-note');
      const contact = ((inp && inp.value) || '').trim();
      if(!contact){ if(note) note.textContent = ui.noteEmpty; return; }
      el.disabled = true;
      const R = rOf(computeResult());
      fetch(LEAD_URL, {
        method:'POST', headers:{'Content-Type':'text/plain'},
        body: JSON.stringify({ source:'quiz', recommendation:R.title, contact:contact, url:location.href })
      }).then(function(res){
        if(!res.ok) throw new Error('HTTP '+res.status);
        if(note) note.textContent = ui.noteOk;
        if(inp) inp.style.display = 'none'; el.style.display = 'none';
      }).catch(function(){
        if(note) note.textContent = ui.noteErr; el.disabled = false;
      });
    }
    else if(act==='restart'){ answers=[]; step=0; show(true); }
  });

  // Модалка на головній: відкрити з [data-quiz-open], закрити X/бекдроп/Esc.
  function openQuiz(){ answers=[]; step=0; card.innerHTML=buildHTML(); if(modal){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); modal.scrollTop=0; document.body.style.overflow='hidden'; } }
  function closeQuiz(){ if(modal){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; } }
  if(modal){
    document.addEventListener('click',(e)=>{
      const op=e.target.closest('[data-quiz-open]'); if(op){ e.preventDefault(); openQuiz(); return; }
      const cl=e.target.closest('[data-quiz-close]'); if(cl){ e.preventDefault(); closeQuiz(); return; }
      if(e.target===modal) closeQuiz();
    });
    document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && modal.classList.contains('open')) closeQuiz(); });
  }

  card.innerHTML = buildHTML();

})();
