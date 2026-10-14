/* =============================================================
   app.js — общая логика интерфейса
   -------------------------------------------------------------
   Отвечает за:
     • построение общей шапки и подвала (шаблонизация);
     • переключение темы (светлая/тёмная);
     • утилиты (форматирование, уведомления, модальные окна);
     • обработку форм публичной части (заявка на подключение).
   ============================================================= */
(function () {
  "use strict";

  /* ---------- 1. Утилиты ---------- */

  // Экранирование HTML для защиты от XSS при выводе пользовательских данных
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Форматирование денежных сумм
  function money(v) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(v || 0);
  }

  // Форматирование даты ISO -> ДД.ММ.ГГГГ
  function date(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("ru-RU");
  }

  // Сегодняшняя дата в формате YYYY-MM-DD
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // Инициалы для аватара
  function initials(fio) {
    return String(fio || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  // Генерация номера лицевого счёта
  function makeAccount() {
    const n = 1100000 + Store.list("clients").length + Math.floor(Math.random() * 900) + 1;
    return String(n);
  }

  /* ---------- 2. Тема (светлая/тёмная) ---------- */
  const Theme = {
    init() {
      const saved = localStorage.getItem("svt_theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    },
    toggle() {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("svt_theme", next);
      const btn = document.getElementById("themeBtn");
      if (btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
    }
  };

  /* ---------- 3. Уведомления (тосты) ---------- */
  function toast(msg, type) {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(30px)"; }, 3200);
    setTimeout(() => el.remove(), 3600);
  }

  /* ---------- 4. Модальные окна ---------- */
  function openModal(title, html) {
    let m = document.getElementById("appModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "appModal";
      m.className = "modal";
      m.innerHTML =
        '<div class="modal__box"><div class="modal__head"><h3 class="modal__title"></h3>' +
        '<button class="icon-btn" data-close>✕</button></div><div class="modal__body"></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", (e) => {
        if (e.target === m || e.target.hasAttribute("data-close")) m.classList.remove("is-open");
      });
    }
    m.querySelector(".modal__title").textContent = title;
    m.querySelector(".modal__body").innerHTML = html;
    m.classList.add("is-open");
    return m;
  }
  function closeModal() {
    const m = document.getElementById("appModal");
    if (m) m.classList.remove("is-open");
  }

  /* ---------- 5. Шапка и подвал ---------- */
  const NAV = [
    { href: "index.html",    label: "Главная",      key: "home" },
    { href: "services.html", label: "Услуги",       key: "services" },
    { href: "tariffs.html",  label: "Тарифы",       key: "tariffs" },
    { href: "about.html",    label: "О компании",   key: "about" },
    { href: "contacts.html", label: "Контакты",     key: "contacts" }
  ];

  function renderHeader(active) {
    const session = Auth.current();
    const links = NAV.map((n) =>
      `<a class="nav__link${n.key === active ? " is-active" : ""}" href="${n.href}">${n.label}</a>`
    ).join("");

    let action;
    if (session && session.kind === "client") {
      action = `<a class="btn btn--sm btn--ghost" href="cabinet.html">Личный кабинет</a>`;
    } else if (session && session.kind === "employee") {
      action = `<a class="btn btn--sm btn--ghost" href="admin.html">Панель управления</a>`;
    } else {
      action = `<a class="btn btn--sm btn--primary" href="login.html">Войти</a>`;
    }

    return `
    <div class="wrap site-header__inner">
      <a class="logo" href="index.html">
        <span class="logo__mark">📶</span>
        <span>СвязьТелеком<span class="logo__sub">информационная система предприятия связи</span></span>
      </a>
      <button class="icon-btn burger" id="burgerBtn" aria-label="Меню">☰</button>
      <nav class="nav" id="mainNav">${links}</nav>
      <div class="header-actions">
        <button class="icon-btn" id="themeBtn" title="Сменить тему">🌙</button>
        ${action}
      </div>
    </div>`;
  }

  function renderFooter() {
    return `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <h4>📶 СвязьТелеком</h4>
          <p style="font-size:.9rem">Малый оператор связи: доступ в интернет, цифровое телевидение,
          городская и корпоративная телефония, видеонаблюдение. Работаем с 2011 года.</p>
        </div>
        <div>
          <h4>Услуги</h4>
          <ul class="footer-list">
            <li><a href="services.html">Домашний интернет</a></li>
            <li><a href="services.html">Цифровое ТВ</a></li>
            <li><a href="services.html">Телефония</a></li>
            <li><a href="services.html">Для бизнеса</a></li>
          </ul>
        </div>
        <div>
          <h4>Абонентам</h4>
          <ul class="footer-list">
            <li><a href="login.html">Личный кабинет</a></li>
            <li><a href="tariffs.html">Тарифы</a></li>
            <li><a href="contacts.html">Поддержка</a></li>
            <li><a href="docs.html">Документация ИС</a></li>
          </ul>
        </div>
        <div>
          <h4>Контакты</h4>
          <ul class="footer-list">
            <li>г. Вологда, ул. Мира, д. 34</li>
            <li>+7 (8172) 50-50-50</li>
            <li>support@svyaztelecom.ru</li>
            <li>Круглосуточно, без выходных</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2011–2026 ООО «СвязьТелеком». Все права защищены.</span>
        <span>Демонстрационный проект информационной системы · 4 курс</span>
      </div>
    </div>`;
  }

  function mountLayout() {
    const header = document.querySelector("[data-header]");
    const footer = document.querySelector("[data-footer]");
    if (header) header.innerHTML = renderHeader(header.getAttribute("data-header"));
    if (footer) footer.innerHTML = renderFooter();

    // Инициализация переключателя темы
    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
      btn.addEventListener("click", Theme.toggle);
    }

    // Мобильное меню
    const burger = document.getElementById("burgerBtn");
    const nav = document.getElementById("mainNav");
    if (burger && nav) {
      burger.addEventListener("click", () => nav.classList.toggle("is-open"));
      nav.addEventListener("click", (e) => { if (e.target.tagName === "A") nav.classList.remove("is-open"); });
    }
  }

  /* ---------- 6. Вкладки ---------- */
  function initTabs(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-tabs]").forEach((group) => {
      const buttons = group.querySelectorAll(".tab");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-tab");
          group.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b === btn));
          const container = group.parentElement;
          container.querySelectorAll(".tab-panel").forEach((p) =>
            p.classList.toggle("is-active", p.getAttribute("data-panel") === target)
          );
        });
      });
    });
  }

  /* ---------- 7. Аккордеон ---------- */
  function initAccordions() {
    document.querySelectorAll(".accordion__head").forEach((head) => {
      head.addEventListener("click", () => head.parentElement.classList.toggle("is-open"));
    });
  }

  /* ---------- 8. Форма заявки на подключение ---------- */
  function initRequestForm() {
    const form = document.getElementById("requestForm");
    if (!form) return;

    // Заполняем список тарифов
    const select = form.querySelector("[name=tariffId]");
    if (select) {
      select.innerHTML = '<option value="">— выберите тариф —</option>' +
        Store.list("tariffs").filter((t) => t.active)
          .map((t) => `<option value="${t.id}">${esc(t.name)} — ${money(t.price)}/мес.</option>`).join("");
    }

    // Предвыбор тарифа из ссылки ?tariff=ID
    const urlTariff = new URLSearchParams(location.search).get("tariff");
    if (urlTariff && select) select.value = urlTariff;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const data = {
        fio: String(f.get("fio") || "").trim(),
        phone: String(f.get("phone") || "").trim(),
        address: String(f.get("address") || "").trim(),
        tariffId: Number(f.get("tariffId")) || null,
        text: String(f.get("text") || "").trim(),
        clientId: null,
        status: "new",
        createdAt: today(),
        dueDate: "",
        assignee: ""
      };

      if (!data.fio || !data.phone || !data.tariffId) {
        toast("Заполните ФИО, телефон и тариф", "err");
        return;
      }

      Store.insert("requests", data);
      form.reset();
      if (select) select.value = "";
      openModal("✅ Заявка принята",
        `<p>Спасибо, <b>${esc(data.fio)}</b>! Ваша заявка на подключение зарегистрирована в информационной системе.</p>
         <dl class="kv">
           <dt>Тариф</dt><dd>${esc(Store.tariffName(data.tariffId))}</dd>
           <dt>Телефон</dt><dd>${esc(data.phone)}</dd>
           <dt>Дата регистрации</dt><dd>${date(data.createdAt)}</dd>
         </dl>
         <p class="muted mt-2">Обработка заявки занимает до 2 рабочих дней. Оператор свяжется с вами по указанному номеру.</p>
         <button class="btn btn--primary btn--block mt-2" data-close>Хорошо</button>`);
      toast("Заявка отправлена", "ok");
    });
  }

  /* ---------- 9. Рендер тарифов на публичных страницах ---------- */
  function renderPublicTariffs() {
    document.querySelectorAll("[data-tariffs]").forEach((container) => {
      const limit = Number(container.getAttribute("data-limit")) || 0;
      let list = Store.list("tariffs").filter((t) => t.active);
      list.sort((a, b) => a.price - b.price);
      if (limit) list = list.slice(0, limit);

      container.innerHTML = list.map((t) => `
        <article class="card tariff${t.popular ? " tariff--popular" : ""}">
          ${t.popular ? '<span class="tariff__flag">ПОПУЛЯРНЫЙ</span>' : ""}
          <h3 class="tariff__name">${esc(t.name)}</h3>
          <div class="tariff__speed">${t.speed ? t.speed + " Мбит/с" : "Телефония"}</div>
          <div class="tariff__price">${money(t.price)}<span>/мес.</span></div>
          <p class="muted mb-0" style="font-size:.9rem">${esc(t.desc)}</p>
          <ul class="tariff__list">
            ${t.speed ? `<li>Скорость до ${t.speed} Мбит/с</li>` : ""}
            ${t.tv ? `<li>${t.tv} телеканалов в HD</li>` : ""}
            <li>Тип: ${esc(t.type)}</li>
            <li>Безлимитный трафик</li>
            <li>Поддержка 24/7</li>
          </ul>
          <a class="btn btn--primary btn--block" href="index.html?tariff=${t.id}#connect">Подключить</a>
        </article>`).join("");
    });
  }

  /* ---------- Инициализация ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    Theme.init();
    mountLayout();
    initTabs();
    initAccordions();
    renderPublicTariffs();
    initRequestForm();

    // Если пришли со ссылкой ?tariff=ID — прокрутить к форме
    if (new URLSearchParams(location.search).get("tariff")) {
      const anchor = document.getElementById("connect");
      if (anchor) setTimeout(() => anchor.scrollIntoView({ behavior: "smooth" }), 150);
    }
  });

  /* ---------- Экспорт утилит ---------- */
  window.App = { esc, money, date, today, initials, makeAccount, toast, openModal, closeModal, initTabs };
})();
