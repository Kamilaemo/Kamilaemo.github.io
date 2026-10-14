/* =============================================================
   cabinet.js — логика личного кабинета абонента
   Разделы: обзор, услуги, платежи, обращения, профиль.
   ============================================================= */
(function () {
  "use strict";

  const esc = App.esc, money = App.money, date = App.date, today = App.today;

  let client = null;

  /* ---------- Боковое меню ---------- */
  function renderSide() {
    const box = document.getElementById("sideUser");
    box.innerHTML =
      '<div class="avatar">' + esc(App.initials(client.fio)) + "</div>" +
      '<div><div class="side__name">' + esc(client.fio) + '</div>' +
      '<div class="side__meta">Л/с ' + esc(client.account) + "</div></div>";

    document.querySelectorAll(".side__link").forEach((btn) => {
      btn.addEventListener("click", () => showSection(btn.getAttribute("data-section")));
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
      Auth.logout();
      location.href = "index.html";
    });
    document.getElementById("sideReset").addEventListener("click", () => {
      if (confirm("Сбросить демонстрационную базу данных к исходному состоянию?")) {
        Store.reset();
        location.reload();
      }
    });
  }

  function showSection(name) {
    document.querySelectorAll(".side__link").forEach((b) =>
      b.classList.toggle("is-active", b.getAttribute("data-section") === name));
    document.querySelectorAll("[data-view]").forEach((v) =>
      v.classList.toggle("hidden", v.getAttribute("data-view") !== name));
    if (name === "payments") renderPayments();
    if (name === "tickets") renderTickets();
    if (name === "services") renderServices();
    if (name === "overview") renderOverview();
  }

  /* ---------- Обзор ---------- */
  function renderOverview() {
    const tariff = Store.get("tariffs", client.tariffId);
    const payments = Store.list("payments", { clientId: client.id });
    const tickets = Store.list("tickets", { clientId: client.id });
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    const openTickets = tickets.filter((t) => t.status !== "closed").length;
    const balanceBad = client.balance < 0;

    document.getElementById("view-overview").innerHTML = `
      <h2 class="mb-0">Здравствуйте, ${esc(client.fio.split(" ")[1] || client.fio)}!</h2>
      <p class="muted">Лицевой счёт ${esc(client.account)} · статус:
        <span class="badge ${client.status === "active" ? "badge--done" : "badge--cancel"}">
        ${client.status === "active" ? "активен" : "заблокирован"}</span></p>

      ${balanceBad ? '<div class="notice notice--err">⚠️ Задолженность ' + money(Math.abs(client.balance)) +
        '. Пополните счёт для восстановления доступа к услугам.</div>' : ""}
      ${openTickets ? '<div class="notice notice--warn">📨 У вас ' + openTickets +
        ' активн(ое) обращени(е) в поддержку.</div>' : ""}

      <div class="grid grid-3">
        <div class="card"><div class="stat">
          <span class="stat__label">Лицевой счёт</span>
          <span class="stat__value">${esc(client.account)}</span></div></div>
        <div class="card"><div class="stat">
          <span class="stat__label">Баланс</span>
          <span class="stat__value ${balanceBad ? "stat__value--bad" : "stat__value--ok"}">${money(client.balance)}</span></div></div>
        <div class="card"><div class="stat">
          <span class="stat__label">Тариф</span>
          <span class="stat__value" style="font-size:1.2rem">${esc(tariff ? tariff.name : "—")}</span></div></div>
        <div class="card"><div class="stat">
          <span class="stat__label">Абон. плата</span>
          <span class="stat__value" style="font-size:1.2rem">${money(tariff ? tariff.price : 0)}</span></div></div>
        <div class="card"><div class="stat">
          <span class="stat__label">Услуга подключена</span>
          <span class="stat__value" style="font-size:1.2rem">${date(client.connectedAt)}</span></div></div>
        <div class="card"><div class="stat">
          <span class="stat__label">Всего оплачено</span>
          <span class="stat__value" style="font-size:1.2rem">${money(paid)}</span></div></div>
      </div>

      <div class="card mt-2">
        <div class="row row--between">
          <div>
            <h3 class="mb-0">Текущий тариф: ${esc(tariff ? tariff.name : "—")}</h3>
            <p class="muted mb-0" style="font-size:.9rem">${esc(tariff ? tariff.desc : "")}</p>
          </div>
          <div class="row">
            <button class="btn btn--sm btn--ghost" onclick="document.querySelector('[data-section=services]').click()">Сменить тариф</button>
            <button class="btn btn--sm btn--primary" onclick="document.querySelector('[data-section=payments]').click()">Пополнить счёт</button>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Услуги / смена тарифа ---------- */
  function renderServices() {
    const cur = client.tariffId;
    const tariffs = Store.list("tariffs").filter((t) => t.active).sort((a, b) => a.price - b.price);
    document.getElementById("view-services").innerHTML = `
      <h2>Мои услуги и тариф</h2>
      <p class="muted">Смена тарифа вступает в силу с первого числа следующего месяца.</p>
      <div class="grid grid-3">
        ${tariffs.map((t) => `
          <div class="card tariff ${t.id === cur ? "tariff--popular" : ""}">
            ${t.id === cur ? '<span class="tariff__flag" style="background:#16a34a;color:#fff">ТЕКУЩИЙ</span>' : ""}
            <h3 class="tariff__name">${esc(t.name)}</h3>
            <div class="tariff__speed">${t.speed ? t.speed + " Мбит/с" : "Телефония"}</div>
            <div class="tariff__price">${money(t.price)}<span>/мес.</span></div>
            <ul class="tariff__list">
              ${t.speed ? "<li>до " + t.speed + " Мбит/с</li>" : ""}
              ${t.tv ? "<li>" + t.tv + " каналов</li>" : "<li>Голосовая связь</li>"}
              <li>Тип: ${esc(t.type)}</li>
            </ul>
            <button class="btn ${t.id === cur ? "btn--ghost" : "btn--primary"} btn--block"
              ${t.id === cur ? "disabled" : ""} data-switch="${t.id}">
              ${t.id === cur ? "Подключён" : "Перейти на тариф"}
            </button>
          </div>`).join("")}
      </div>
      <div class="card mt-2">
        <h3>Дополнительные услуги</h3>
        <div class="table-wrap">
          <table class="table table--compact">
            <thead><tr><th>Услуга</th><th>Стоимость</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              <tr><td>Фиксированный IP-адрес</td><td>150 ₽/мес.</td><td><span class="badge badge--muted">не подключена</span></td>
                  <td><button class="btn btn--sm btn--ghost" onclick="App.toast('Функция доступна в полной версии','')">Подключить</button></td></tr>
              <tr><td>Облачное видеонаблюдение (2 камеры)</td><td>390 ₽/мес.</td><td><span class="badge badge--muted">не подключена</span></td>
                  <td><button class="btn btn--sm btn--ghost" onclick="App.toast('Функция доступна в полной версии','')">Подключить</button></td></tr>
              <tr><td>Антивирус для устройств</td><td>99 ₽/мес.</td><td><span class="badge badge--muted">не подключена</span></td>
                  <td><button class="btn btn--sm btn--ghost" onclick="App.toast('Функция доступна в полной версии','')">Подключить</button></td></tr>
            </tbody>
          </table>
        </div>
      </div>`;

    document.querySelectorAll("[data-switch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-switch"));
        const t = Store.get("tariffs", id);
        App.openModal("Смена тарифа",
          `<p>Перейти на тариф <b>${esc(t.name)}</b> — ${money(t.price)}/мес.?</p>
           <p class="muted" style="font-size:.9rem">Изменения применяются с первого числа следующего расчётного периода.</p>
           <div class="row">
             <button class="btn btn--ghost" data-close>Отмена</button>
             <button class="btn btn--primary" id="confirmSwitch">Подтвердить</button>
           </div>`);
        document.getElementById("confirmSwitch").addEventListener("click", () => {
          Store.update("clients", client.id, { tariffId: id });
          Store.insert("tickets", {
            clientId: client.id, subject: "Заявка на смену тарифа",
            text: "Абонент переведён на тариф «" + t.name + "».",
            status: "in_work", priority: "medium", createdAt: today(), answer: ""
          });
          client = Store.get("clients", client.id);
          App.closeModal();
          App.toast("Тариф изменён на «" + t.name + "»", "ok");
          renderServices();
        });
      });
    });
  }

  /* ---------- Платежи ---------- */
  function renderPayments() {
    const list = Store.list("payments", { clientId: client.id }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    document.getElementById("view-payments").innerHTML = `
      <div class="row row--between">
        <h2 class="mb-0">Платежи и баланс</h2>
        <button class="btn btn--primary" id="payBtn">Пополнить счёт</button>
      </div>
      <div class="grid grid-3 mt-2 mb-2">
        <div class="card"><div class="stat"><span class="stat__label">Текущий баланс</span>
          <span class="stat__value ${client.balance < 0 ? "stat__value--bad" : "stat__value--ok"}">${money(client.balance)}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Абон. плата</span>
          <span class="stat__value" style="font-size:1.4rem">${money(Store.get("tariffs", client.tariffId)?.price || 0)}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Платежей всего</span>
          <span class="stat__value" style="font-size:1.4rem">${list.length}</span></div></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>№</th><th>Дата</th><th>Сумма</th><th>Способ оплаты</th><th>Статус</th></tr></thead>
          <tbody>
            ${list.length ? list.map((p) => `<tr>
              <td>${p.id}</td><td>${date(p.createdAt)}</td>
              <td><b>${money(p.amount)}</b></td><td>${esc(p.method)}</td>
              <td><span class="badge badge--done">зачислен</span></td></tr>`).join("")
            : '<tr><td colspan="5" class="muted">Платежей пока нет.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    document.getElementById("payBtn").addEventListener("click", openPayModal);
  }

  let payPreset = 0;
  function openPayModal() {
    const tariff = Store.get("tariffs", client.tariffId);
    const due = Math.max(0, (tariff ? tariff.price : 500) - client.balance);
    const suggested = Math.ceil(due / 100) * 100 || (tariff ? tariff.price : 500);
    App.openModal("Пополнение лицевого счёта",
      `<p class="muted" style="font-size:.9rem">Лицевой счёт <b>${esc(client.account)}</b></p>
       <div class="field">
         <label class="field__label">Сумма пополнения</label>
         <input class="input" type="number" id="payAmount" min="1" step="1" value="${suggested}">
         <div class="field__hint">Рекомендуемая сумма: ${money(suggested)}</div>
       </div>
       <div class="field">
         <label class="field__label">Способ оплаты</label>
         <select class="select" id="payMethod">
           <option>Банковская карта</option><option>СБП</option>
           <option>Мобильный платёж</option><option>Безналичный расчёт</option>
         </select>
       </div>
       <div class="row">
         <button class="btn btn--ghost" data-close>Отмена</button>
         <button class="btn btn--primary" id="doPay">Оплатить</button>
       </div>`);
    document.getElementById("doPay").addEventListener("click", function () {
      const amount = Number(document.getElementById("payAmount").value);
      const method = document.getElementById("payMethod").value;
      if (!amount || amount <= 0) { App.toast("Введите корректную сумму", "err"); return; }
      Store.insert("payments", { clientId: client.id, amount, method, status: "paid", createdAt: today() });
      Store.update("clients", client.id, { balance: client.balance + amount, status: "active" });
      client = Store.get("clients", client.id);
      App.closeModal();
      App.toast("Платёж " + money(amount) + " проведён. Баланс: " + money(client.balance), "ok");
      renderPayments();
      renderSide();
    });
  }

  /* ---------- Обращения ---------- */
  function renderTickets() {
    const list = Store.list("tickets", { clientId: client.id }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const statusBadge = (s) =>
      s === "open" ? '<span class="badge badge--new">новое</span>'
      : s === "in_work" ? '<span class="badge badge--work">в работе</span>'
      : '<span class="badge badge--done">закрыто</span>';

    document.getElementById("view-tickets").innerHTML = `
      <div class="row row--between">
        <h2 class="mb-0">Обращения в поддержку</h2>
        <button class="btn btn--primary" id="newTicketBtn">Создать обращение</button>
      </div>
      <p class="muted">Опишите проблему — заявка попадёт в ИС и будет обработана технической службой.</p>
      <div class="table-wrap mt-2">
        <table class="table">
          <thead><tr><th>№</th><th>Тема</th><th>Дата</th><th>Приоритет</th><th>Статус</th><th>Ответ</th></tr></thead>
          <tbody>
            ${list.length ? list.map((t) => `<tr>
              <td>${t.id}</td>
              <td><b>${esc(t.subject)}</b><br><small class="muted">${esc(t.text)}</small></td>
              <td>${date(t.createdAt)}</td>
              <td>${t.priority === "high" ? "🔴 высокий" : t.priority === "medium" ? "🟡 средний" : "🟢 низкий"}</td>
              <td>${statusBadge(t.status)}</td>
              <td>${t.answer ? esc(t.answer) : '<span class="muted">—</span>'}</td>
            </tr>`).join("") : '<tr><td colspan="6" class="muted">Обращений нет.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    document.getElementById("newTicketBtn").addEventListener("click", function () {
      App.openModal("Новое обращение",
        `<div class="field"><label class="field__label">Тема</label>
           <input class="input" id="tkSubject" placeholder="Например: низкая скорость интернета"></div>
         <div class="field"><label class="field__label">Приоритет</label>
           <select class="select" id="tkPriority">
             <option value="low">Низкий</option><option value="medium" selected>Средний</option>
             <option value="high">Высокий</option></select></div>
         <div class="field"><label class="field__label">Описание проблемы</label>
           <textarea class="textarea" id="tkText" placeholder="Опишите подробно"></textarea></div>
         <div class="row"><button class="btn btn--ghost" data-close>Отмена</button>
           <button class="btn btn--primary" id="tkSubmit">Отправить</button></div>`);
      document.getElementById("tkSubmit").addEventListener("click", function () {
        const subject = document.getElementById("tkSubject").value.trim();
        const text = document.getElementById("tkText").value.trim();
        if (!subject) { App.toast("Укажите тему обращения", "err"); return; }
        Store.insert("tickets", {
          clientId: client.id, subject, text, status: "open",
          priority: document.getElementById("tkPriority").value, createdAt: today(), answer: ""
        });
        App.closeModal();
        App.toast("Обращение зарегистрировано", "ok");
        renderTickets();
      });
    });
  }

  /* ---------- Профиль ---------- */
  function renderProfile() {
    document.getElementById("view-profile").innerHTML = `
      <h2>Профиль абонента</h2>
      <div class="grid grid-2">
        <div class="card">
          <h3>Персональные данные</h3>
          <dl class="kv">
            <dt>ФИО</dt><dd>${esc(client.fio)}</dd>
            <dt>Лицевой счёт</dt><dd>${esc(client.account)}</dd>
            <dt>Телефон</dt><dd>${esc(client.phone)}</dd>
            <dt>E-mail</dt><dd>${esc(client.email)}</dd>
            <dt>Адрес</dt><dd>${esc(client.address)}</dd>
            <dt>Логин</dt><dd>${esc(client.login)}</dd>
            <dt>Статус</dt><dd>${client.status === "active" ? "Активен" : "Заблокирован"}</dd>
            <dt>Дата подключения</dt><dd>${date(client.connectedAt)}</dd>
          </dl>
        </div>
        <div class="card">
          <h3>Изменение контактных данных</h3>
          <form id="profileForm">
            <div class="field"><label class="field__label">Телефон</label>
              <input class="input" name="phone" value="${esc(client.phone)}"></div>
            <div class="field"><label class="field__label">E-mail</label>
              <input class="input" name="email" value="${esc(client.email)}"></div>
            <div class="field"><label class="field__label">Новый пароль</label>
              <input class="input" type="password" name="password" placeholder="оставьте пустым, чтобы не менять"></div>
            <div class="field"><label class="field__label">Адрес</label>
              <input class="input" name="address" value="${esc(client.address)}"></div>
            <button class="btn btn--primary" type="submit">Сохранить изменения</button>
          </form>
        </div>
      </div>`;

    document.getElementById("profileForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const f = new FormData(e.target);
      const patch = {
        phone: String(f.get("phone") || "").trim(),
        email: String(f.get("email") || "").trim(),
        address: String(f.get("address") || "").trim()
      };
      const pass = String(f.get("password") || "");
      if (pass) patch.password = pass;
      Store.update("clients", client.id, patch);
      client = Store.get("clients", client.id);
      App.toast("Данные обновлены", "ok");
      renderProfile();
    });
  }

  /* ---------- Точка входа ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    client = Auth.requireClient();
    if (!client) return;
    if (client.status === "blocked") {
      App.toast("Внимание: доступ к услугам приостановлен из-за задолженности", "err");
    }
    renderSide();
    showSection("overview");
    renderServices();
    renderTickets();
    renderProfile();
  });
})();
