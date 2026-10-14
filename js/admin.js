/* =============================================================
   admin.js — панель управления оператора / администратора
   Разделы: дашборд, заявки, абоненты, обращения, тарифы,
            оборудование, сотрудники, отчёты.
   ============================================================= */
(function () {
  "use strict";

  const esc = App.esc, money = App.money, date = App.date, today = App.today;

  let me = null;

  const REQ_STATUS = { new: "Новая", in_work: "В работе", done: "Выполнена", cancel: "Отменена" };
  const TICKET_STATUS = { open: "Новое", in_work: "В работе", closed: "Закрыто" };

  /* ---------- Индикаторы статусов ---------- */
  function reqBadge(s) {
    const cls = s === "new" ? "badge--new" : s === "in_work" ? "badge--work" : s === "done" ? "badge--done" : "badge--cancel";
    return '<span class="badge ' + cls + '">' + (REQ_STATUS[s] || s) + "</span>";
  }
  function tickBadge(s) {
    const cls = s === "open" ? "badge--new" : s === "in_work" ? "badge--work" : "badge--done";
    return '<span class="badge ' + cls + '">' + (TICKET_STATUS[s] || s) + "</span>";
  }

  /* ---------- Боковое меню ---------- */
  function renderSide() {
    document.getElementById("sideUser").innerHTML =
      '<div class="avatar">' + esc(App.initials(me.fio)) + "</div>" +
      '<div><div class="side__name">' + esc(me.fio) + "</div>" +
      '<div class="side__meta">' + (me.role === "admin" ? "Администратор" : "Оператор") + "</div></div>";

    document.querySelectorAll(".side__link[data-section]").forEach((btn) =>
      btn.addEventListener("click", () => show(btn.getAttribute("data-section"))));
    document.getElementById("logoutBtn").addEventListener("click", () => {
      Auth.logout(); location.href = "index.html";
    });
    document.getElementById("sideReset").addEventListener("click", () => {
      if (confirm("Сбросить демонстрационную базу данных к исходному состоянию?")) {
        Store.reset(); location.reload();
      }
    });
  }

  const RENDERERS = {
    dashboard: renderDashboard,
    requests: renderRequests,
    clients: renderClients,
    tickets: renderTickets,
    tariffs: renderTariffs,
    equipment: renderEquipment,
    staff: renderStaff,
    reports: renderReports
  };

  function show(name) {
    document.querySelectorAll(".side__link[data-section]").forEach((b) =>
      b.classList.toggle("is-active", b.getAttribute("data-section") === name));
    document.querySelectorAll("[data-view]").forEach((v) =>
      v.classList.toggle("hidden", v.getAttribute("data-view") !== name));
    if (RENDERERS[name]) RENDERERS[name]();
  }

  /* ---------- Дашборд ---------- */
  function renderDashboard() {
    const clients = Store.list("clients");
    const requests = Store.list("requests");
    const tickets = Store.list("tickets");
    const payments = Store.list("payments");
    const active = clients.filter((c) => c.status === "active").length;
    const debtors = clients.filter((c) => c.balance < 0).length;
    const newReqs = requests.filter((r) => r.status === "new").length;
    const inWork = requests.filter((r) => r.status === "in_work").length;
    const openTk = tickets.filter((t) => t.status !== "closed").length;
    const income = payments.reduce((s, p) => s + p.amount, 0);

    // распределение абонентов по тарифам
    const byTariff = {};
    clients.forEach((c) => { byTariff[c.tariffId] = (byTariff[c.tariffId] || 0) + 1; });
    const maxCount = Math.max.apply(null, Object.values(byTariff).concat([1]));

    document.getElementById("view-dashboard").innerHTML = `
      <h2 class="mb-0">Панель управления</h2>
      <p class="muted">Сводка по работе предприятия на ${date(today())}.</p>

      <div class="grid grid-4">
        <div class="card"><div class="stat"><span class="stat__label">Абонентов всего</span>
          <span class="stat__value">${clients.length}</span>
          <small class="muted">активных: ${active}</small></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Новые заявки</span>
          <span class="stat__value stat__value--warn">${newReqs}</span>
          <small class="muted">в работе: ${inWork}</small></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Открытые обращения</span>
          <span class="stat__value">${openTk}</span>
          <small class="muted">всего: ${tickets.length}</small></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Поступления (всего)</span>
          <span class="stat__value stat__value--ok" style="font-size:1.4rem">${money(income)}</span>
          <small class="muted">платежей: ${payments.length}</small></div></div>
      </div>

      <div class="grid grid-2 mt-2">
        <div class="card">
          <h3>Распределение абонентов по тарифам</h3>
          ${Object.keys(byTariff).map((tid) => {
            const count = byTariff[tid];
            return `<div style="margin-bottom:12px">
              <div class="row row--between" style="font-size:.9rem">
                <span>${esc(Store.tariffName(tid))}</span><b>${count} чел.</b></div>
              <div class="progress"><div class="progress__bar" style="width:${Math.round(count / maxCount * 100)}%"></div></div>
            </div>`;
          }).join("")}
          <p class="muted mb-0" style="font-size:.85rem">Абонентов с задолженностью: <b>${debtors}</b></p>
        </div>

        <div class="card">
          <h3>Последние заявки</h3>
          <div class="table-wrap">
            <table class="table table--compact">
              <tbody>
                ${requests.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((r) => `
                  <tr>
                    <td><b>${esc(r.fio)}</b><br><small class="muted">${esc(Store.tariffName(r.tariffId))}</small></td>
                    <td>${date(r.createdAt)}</td>
                    <td>${reqBadge(r.status)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <button class="btn btn--sm btn--ghost mt-2" onclick="document.querySelector('[data-section=requests]').click()">Все заявки →</button>
        </div>
      </div>`;
  }

  /* ---------- Заявки ---------- */
  function renderRequests() {
    const list = Store.list("requests").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const filter = renderRequests._filter || "all";
    const shown = filter === "all" ? list : list.filter((r) => r.status === filter);

    document.getElementById("view-requests").innerHTML = `
      <div class="row row--between">
        <h2 class="mb-0">Заявки на подключение и сервис</h2>
        <button class="btn btn--sm btn--ghost" onclick="location.reload()">🔄 Обновить</button>
      </div>
      <div class="row mt-2 mb-2">
        ${["all", "new", "in_work", "done", "cancel"].map((s) =>
          `<button class="btn btn--sm ${filter === s ? "btn--primary" : "btn--ghost"}" data-filter="${s}">
            ${s === "all" ? "Все" : REQ_STATUS[s]}</button>`).join("")}
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>№</th><th>Клиент / заказчик</th><th>Тариф</th><th>Адрес</th>
            <th>Создана</th><th>Исполнитель</th><th>Статус</th><th>Действия</th></tr></thead>
          <tbody>
            ${shown.length ? shown.map((r) => `<tr>
              <td>${r.id}</td>
              <td><b>${esc(r.fio)}</b><br><small class="muted">${esc(r.phone)}</small></td>
              <td>${esc(Store.tariffName(r.tariffId))}</td>
              <td><small>${esc(r.address || "—")}</small></td>
              <td>${date(r.createdAt)}</td>
              <td><small>${esc(r.assignee || "не назначен")}</small></td>
              <td>${reqBadge(r.status)}</td>
              <td><button class="btn btn--sm btn--ghost" data-open-req="${r.id}">Открыть</button></td>
            </tr>`).join("") : '<tr><td colspan="8" class="muted">Заявок нет.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    document.querySelectorAll("[data-filter]").forEach((b) =>
      b.addEventListener("click", () => { renderRequests._filter = b.getAttribute("data-filter"); renderRequests(); }));

    document.querySelectorAll("[data-open-req]").forEach((b) =>
      b.addEventListener("click", () => openRequest(Number(b.getAttribute("data-open-req")))));
  }

  function openRequest(id) {
    const r = Store.get("requests", id);
    App.openModal("Заявка №" + r.id,
      `<dl class="kv" style="margin-bottom:16px">
        <dt>Клиент</dt><dd>${esc(r.fio)}</dd>
        <dt>Телефон</dt><dd>${esc(r.phone)}</dd>
        <dt>Адрес</dt><dd>${esc(r.address || "—")}</dd>
        <dt>Тариф</dt><dd>${esc(Store.tariffName(r.tariffId))}</dd>
        <dt>Создана</dt><dd>${date(r.createdAt)}</dd>
        <dt>Комментарий</dt><dd>${esc(r.text || "—")}</dd>
      </dl>
      <div class="field"><label class="field__label">Статус заявки</label>
        <select class="select" id="reqStatus">
          ${Object.keys(REQ_STATUS).map((s) =>
            `<option value="${s}" ${r.status === s ? "selected" : ""}>${REQ_STATUS[s]}</option>`).join("")}
        </select></div>
      <div class="field"><label class="field__label">Исполнитель</label>
        <input class="input" id="reqAssignee" value="${esc(r.assignee || "")}" placeholder="ФИО монтажника / оператора"></div>
      <div class="field"><label class="field__label">Срок выполнения</label>
        <input class="input" type="date" id="reqDue" value="${esc(r.dueDate || "")}"></div>
      <div class="row">
        <button class="btn btn--ghost" data-close>Отмена</button>
        ${me.role === "admin" ? '<button class="btn btn--danger" id="reqDelete">Удалить</button>' : ""}
        <button class="btn btn--primary" id="reqSave">Сохранить</button>
      </div>`);

    document.getElementById("reqSave").addEventListener("click", () => {
      Store.update("requests", r.id, {
        status: document.getElementById("reqStatus").value,
        assignee: document.getElementById("reqAssignee").value.trim(),
        dueDate: document.getElementById("reqDue").value
      });
      App.closeModal(); App.toast("Заявка №" + r.id + " обновлена", "ok"); renderRequests();
    });
    const del = document.getElementById("reqDelete");
    if (del) del.addEventListener("click", () => {
      if (confirm("Удалить заявку №" + r.id + "?")) {
        Store.remove("requests", r.id); App.closeModal(); App.toast("Заявка удалена"); renderRequests();
      }
    });
  }

  /* ---------- Абоненты ---------- */
  function renderClients() {
    const list = Store.list("clients");
    const q = (renderClients._q || "").toLowerCase();
    const shown = list.filter((c) =>
      !q || (c.fio + c.login + c.phone + c.account).toLowerCase().includes(q));

    document.getElementById("view-clients").innerHTML = `
      <div class="row row--between">
        <h2 class="mb-0">Абоненты</h2>
        <button class="btn btn--sm btn--primary" id="addClient">+ Добавить абонента</button>
      </div>
      <div class="field mt-2" style="max-width:340px">
        <input class="input" id="clientSearch" placeholder="🔍 Поиск по ФИО, логину, телефону, л/с" value="${esc(renderClients._q || "")}">
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Л/с</th><th>ФИО</th><th>Логин</th><th>Тариф</th>
            <th>Баланс</th><th>Подключён</th><th>Статус</th><th>Действия</th></tr></thead>
          <tbody>
            ${shown.length ? shown.map((c) => `<tr>
              <td>${esc(c.account)}</td>
              <td><b>${esc(c.fio)}</b><br><small class="muted">${esc(c.phone)}</small></td>
              <td><small>${esc(c.login)}</small></td>
              <td>${esc(Store.tariffName(c.tariffId))}</td>
              <td><b class="${c.balance < 0 ? "stat__value--bad" : ""}">${money(c.balance)}</b></td>
              <td>${date(c.connectedAt)}</td>
              <td>${c.status === "active" ? '<span class="badge badge--done">активен</span>' : '<span class="badge badge--cancel">блок</span>'}</td>
              <td><button class="btn btn--sm btn--ghost" data-open-client="${c.id}">Карточка</button></td>
            </tr>`).join("") : '<tr><td colspan="8" class="muted">Ничего не найдено.</td></tr>'}
          </tbody>
        </table>
      </div>`;

    const search = document.getElementById("clientSearch");
    search.addEventListener("input", () => {
      renderClients._q = search.value;
      const pos = search.selectionStart;
      renderClients();
      const s2 = document.getElementById("clientSearch"); s2.focus(); s2.setSelectionRange(pos, pos);
    });
    document.getElementById("addClient").addEventListener("click", () => openClient(null));
    document.querySelectorAll("[data-open-client]").forEach((b) =>
      b.addEventListener("click", () => openClient(Number(b.getAttribute("data-open-client")))));
  }

  function openClient(id) {
    const c = id ? Store.get("clients", id) : {
      id: null, fio: "", login: "", password: "12345", phone: "", email: "",
      address: "", tariffId: 1, balance: 0, status: "active", account: App.makeAccount()
    };
    const tariffs = Store.list("tariffs");

    App.openModal(c.id ? "Карточка абонента №" + c.id : "Новый абонент",
      `<div class="form-grid">
        <div class="field field--full"><label class="field__label">ФИО / организация</label>
          <input class="input" id="clFio" value="${esc(c.fio)}"></div>
        <div class="field"><label class="field__label">Лицевой счёт</label>
          <input class="input" id="clAcc" value="${esc(c.account)}"></div>
        <div class="field"><label class="field__label">Логин</label>
          <input class="input" id="clLogin" value="${esc(c.login)}"></div>
        <div class="field"><label class="field__label">Пароль</label>
          <input class="input" id="clPass" value="${esc(c.password)}"></div>
        <div class="field"><label class="field__label">Телефон</label>
          <input class="input" id="clPhone" value="${esc(c.phone)}"></div>
        <div class="field field--full"><label class="field__label">E-mail</label>
          <input class="input" id="clEmail" value="${esc(c.email)}"></div>
        <div class="field field--full"><label class="field__label">Адрес</label>
          <input class="input" id="clAddr" value="${esc(c.address)}"></div>
        <div class="field"><label class="field__label">Тариф</label>
          <select class="select" id="clTariff">
            ${tariffs.map((t) => `<option value="${t.id}" ${t.id === c.tariffId ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
          </select></div>
        <div class="field"><label class="field__label">Баланс, ₽</label>
          <input class="input" type="number" id="clBalance" value="${c.balance}"></div>
        <div class="field"><label class="field__label">Статус</label>
          <select class="select" id="clStatus">
            <option value="active" ${c.status === "active" ? "selected" : ""}>Активен</option>
            <option value="blocked" ${c.status === "blocked" ? "selected" : ""}>Заблокирован</option>
          </select></div>
      </div>
      <div class="row">
        <button class="btn btn--ghost" data-close>Отмена</button>
        ${c.id ? '<button class="btn btn--danger" id="clDelete">Удалить</button>' : ""}
        <button class="btn btn--primary" id="clSave">Сохранить</button>
      </div>`);

    document.getElementById("clSave").addEventListener("click", () => {
      const data = {
        fio: document.getElementById("clFio").value.trim(),
        account: document.getElementById("clAcc").value.trim(),
        login: document.getElementById("clLogin").value.trim().toLowerCase(),
        password: document.getElementById("clPass").value,
        phone: document.getElementById("clPhone").value.trim(),
        email: document.getElementById("clEmail").value.trim(),
        address: document.getElementById("clAddr").value.trim(),
        tariffId: Number(document.getElementById("clTariff").value),
        balance: Number(document.getElementById("clBalance").value) || 0,
        status: document.getElementById("clStatus").value
      };
      if (!data.fio || !data.login) { App.toast("Укажите ФИО и логин", "err"); return; }
      if (c.id) Store.update("clients", c.id, data);
      else Store.insert("clients", Object.assign({ connectedAt: today() }, data));
      App.closeModal(); App.toast("Данные абонента сохранены", "ok"); renderClients();
    });

    const del = document.getElementById("clDelete");
    if (del) del.addEventListener("click", () => {
      if (confirm("Удалить абонента " + c.fio + "?")) {
        Store.remove("clients", c.id); App.closeModal(); App.toast("Абонент удалён"); renderClients();
      }
    });
  }

  /* ---------- Обращения ---------- */
  function renderTickets() {
    const list = Store.list("tickets").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    document.getElementById("view-tickets").innerHTML = `
      <h2>Обращения в поддержку</h2>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>№</th><th>Абонент</th><th>Тема</th><th>Приоритет</th>
            <th>Дата</th><th>Статус</th><th>Действия</th></tr></thead>
          <tbody>
            ${list.length ? list.map((t) => `<tr>
              <td>${t.id}</td>
              <td>${t.clientId ? esc(Store.clientName(t.clientId)) : '<span class="muted">гость сайта</span>'}</td>
              <td><b>${esc(t.subject)}</b></td>
              <td>${t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢"} ${t.priority}</td>
              <td>${date(t.createdAt)}</td>
              <td>${tickBadge(t.status)}</td>
              <td><button class="btn btn--sm btn--ghost" data-open-tk="${t.id}">Обработать</button></td>
            </tr>`).join("") : '<tr><td colspan="7" class="muted">Обращений нет.</td></tr>'}
          </tbody>
        </table>
      </div>`;
    document.querySelectorAll("[data-open-tk]").forEach((b) =>
      b.addEventListener("click", () => openTicket(Number(b.getAttribute("data-open-tk")))));
  }

  function openTicket(id) {
    const t = Store.get("tickets", id);
    App.openModal("Обращение №" + t.id,
      `<dl class="kv" style="margin-bottom:12px">
        <dt>Абонент</dt><dd>${t.clientId ? esc(Store.clientName(t.clientId)) : "гость сайта"}</dd>
        <dt>Тема</dt><dd>${esc(t.subject)}</dd>
        <dt>Текст</dt><dd>${esc(t.text || "—")}</dd>
        <dt>Дата</dt><dd>${date(t.createdAt)}</dd>
      </dl>
      <div class="field"><label class="field__label">Ответ абоненту</label>
        <textarea class="textarea" id="tkAnswer">${esc(t.answer || "")}</textarea></div>
      <div class="field"><label class="field__label">Статус</label>
        <select class="select" id="tkStatus">
          ${Object.keys(TICKET_STATUS).map((s) =>
            `<option value="${s}" ${t.status === s ? "selected" : ""}>${TICKET_STATUS[s]}</option>`).join("")}
        </select></div>
      <div class="row"><button class="btn btn--ghost" data-close>Отмена</button>
        <button class="btn btn--primary" id="tkSave">Сохранить</button></div>`);
    document.getElementById("tkSave").addEventListener("click", () => {
      Store.update("tickets", t.id, {
        answer: document.getElementById("tkAnswer").value.trim(),
        status: document.getElementById("tkStatus").value
      });
      App.closeModal(); App.toast("Обращение обновлено", "ok"); renderTickets();
    });
  }

  /* ---------- Тарифы ---------- */
  function renderTariffs() {
    const list = Store.list("tariffs");
    document.getElementById("view-tariffs").innerHTML = `
      <div class="row row--between">
        <h2 class="mb-0">Тарифные планы</h2>
        ${me.role === "admin" ? '<button class="btn btn--sm btn--primary" id="addTariff">+ Новый тариф</button>' : "<span class='muted'>Редактирование доступно администратору</span>"}
      </div>
      <div class="table-wrap mt-2">
        <table class="table">
          <thead><tr><th>Код</th><th>Название</th><th>Скорость</th><th>ТВ</th>
            <th>Тип</th><th>Цена</th><th>Активен</th><th>Действия</th></tr></thead>
          <tbody>
            ${list.map((t) => `<tr>
              <td><small>${esc(t.code)}</small></td>
              <td><b>${esc(t.name)}</b>${t.popular ? ' <span class="badge badge--info">популярный</span>' : ""}</td>
              <td>${t.speed ? t.speed + " Мбит/с" : "—"}</td>
              <td>${t.tv || "—"}</td>
              <td>${esc(t.type)}</td>
              <td><b>${money(t.price)}</b></td>
              <td>${t.active ? "✅" : "—"}</td>
              <td>${me.role === "admin" ? '<button class="btn btn--sm btn--ghost" data-edit-tariff="' + t.id + '">Изменить</button>' : "—"}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    const add = document.getElementById("addTariff");
    if (add) add.addEventListener("click", () => openTariff(null));
    document.querySelectorAll("[data-edit-tariff]").forEach((b) =>
      b.addEventListener("click", () => openTariff(Number(b.getAttribute("data-edit-tariff")))));
  }

  function openTariff(id) {
    const t = id ? Store.get("tariffs", id) : { id: null, code: "", name: "", speed: 100, tv: 0, price: 500, type: "Интернет", desc: "", popular: 0, active: 1 };
    App.openModal(t.id ? "Тариф: " + esc(t.name) : "Новый тариф",
      `<div class="form-grid">
        <div class="field"><label class="field__label">Код</label><input class="input" id="tCode" value="${esc(t.code)}"></div>
        <div class="field"><label class="field__label">Название</label><input class="input" id="tName" value="${esc(t.name)}"></div>
        <div class="field"><label class="field__label">Скорость, Мбит/с</label><input class="input" type="number" id="tSpeed" value="${t.speed}"></div>
        <div class="field"><label class="field__label">Телеканалов</label><input class="input" type="number" id="tTv" value="${t.tv}"></div>
        <div class="field"><label class="field__label">Цена, ₽/мес.</label><input class="input" type="number" id="tPrice" value="${t.price}"></div>
        <div class="field"><label class="field__label">Тип услуги</label><input class="input" id="tType" value="${esc(t.type)}"></div>
        <div class="field field--full"><label class="field__label">Описание</label><input class="input" id="tDesc" value="${esc(t.desc)}"></div>
        <div class="field"><label class="field__label">Активен</label><select class="select" id="tActive">
          <option value="1" ${t.active ? "selected" : ""}>Да</option><option value="0" ${!t.active ? "selected" : ""}>Нет</option></select></div>
        <div class="field"><label class="field__label">Популярный</label><select class="select" id="tPop">
          <option value="0" ${!t.popular ? "selected" : ""}>Нет</option><option value="1" ${t.popular ? "selected" : ""}>Да</option></select></div>
      </div>
      <div class="row"><button class="btn btn--ghost" data-close>Отмена</button>
        ${t.id ? '<button class="btn btn--danger" id="tDel">Удалить</button>' : ""}
        <button class="btn btn--primary" id="tSave">Сохранить</button></div>`);
    document.getElementById("tSave").addEventListener("click", () => {
      const data = {
        code: document.getElementById("tCode").value.trim(),
        name: document.getElementById("tName").value.trim(),
        speed: Number(document.getElementById("tSpeed").value) || 0,
        tv: Number(document.getElementById("tTv").value) || 0,
        price: Number(document.getElementById("tPrice").value) || 0,
        type: document.getElementById("tType").value.trim(),
        desc: document.getElementById("tDesc").value.trim(),
        active: Number(document.getElementById("tActive").value),
        popular: Number(document.getElementById("tPop").value)
      };
      if (!data.name) { App.toast("Укажите название", "err"); return; }
      if (t.id) Store.update("tariffs", t.id, data); else Store.insert("tariffs", data);
      App.closeModal(); App.toast("Тариф сохранён", "ok"); renderTariffs();
    });
    const del = document.getElementById("tDel");
    if (del) del.addEventListener("click", () => {
      if (confirm("Удалить тариф?")) { Store.remove("tariffs", t.id); App.closeModal(); renderTariffs(); }
    });
  }

  /* ---------- Оборудование ---------- */
  function renderEquipment() {
    const list = Store.list("equipment");
    const totals = list.reduce((a, e) => a + e.qty * e.price, 0);
    document.getElementById("view-equipment").innerHTML = `
      <h2>Склад абонентского оборудования</h2>
      <div class="grid grid-3 mb-2">
        <div class="card"><div class="stat"><span class="stat__label">Позиций</span>
          <span class="stat__value">${list.length}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Единиц на складе</span>
          <span class="stat__value">${list.reduce((a, e) => a + e.qty, 0)}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Стоимость запаса</span>
          <span class="stat__value" style="font-size:1.4rem">${money(totals)}</span></div></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>№</th><th>Наименование</th><th>Модель</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Статус</th></tr></thead>
          <tbody>
            ${list.map((e) => `<tr>
              <td>${e.id}</td><td><b>${esc(e.name)}</b></td><td><small>${esc(e.model)}</small></td>
              <td>${e.qty} ${esc(e.unit)}</td><td>${money(e.price)}</td><td>${money(e.qty * e.price)}</td>
              <td>${e.qty > 10 ? '<span class="badge badge--done">в наличии</span>'
                  : e.qty > 0 ? '<span class="badge badge--work">мало</span>'
                  : '<span class="badge badge--cancel">нет</span>'}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- Сотрудники ---------- */
  function renderStaff() {
    const list = Store.list("employees");
    document.getElementById("view-staff").innerHTML = `
      <h2>Сотрудники и права доступа</h2>
      <p class="muted">Учётные записи пользователей ИС с указанием роли.</p>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Логин</th><th>ФИО</th><th>Должность</th><th>Роль</th><th>Права</th></tr></thead>
          <tbody>
            ${list.map((e) => `<tr>
              <td><b>${esc(e.login)}</b></td><td>${esc(e.fio)}</td><td>${esc(e.position)}</td>
              <td><span class="badge ${e.role === "admin" ? "badge--cancel" : "badge--info"}">
                ${e.role === "admin" ? "администратор" : "оператор"}</span></td>
              <td><small>${e.role === "admin" ? "полный доступ" : "заявки, абоненты, обращения"}</small></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="card mt-2">
        <h3>Матрица разграничения прав доступа</h3>
        <div class="table-wrap">
          <table class="table table--compact">
            <thead><tr><th>Функция</th><th>Абонент</th><th>Оператор</th><th>Администратор</th></tr></thead>
            <tbody>
              <tr><td>Просмотр своих услуг и баланса</td><td>✅</td><td>—</td><td>—</td></tr>
              <tr><td>Оплата и смена тарифа</td><td>✅</td><td>—</td><td>—</td></tr>
              <tr><td>Создание обращений</td><td>✅</td><td>✅</td><td>✅</td></tr>
              <tr><td>Обработка заявок и обращений</td><td>—</td><td>✅</td><td>✅</td></tr>
              <tr><td>Ведение карточек абонентов</td><td>—</td><td>✅</td><td>✅</td></tr>
              <tr><td>Управление тарифами</td><td>—</td><td>—</td><td>✅</td></tr>
              <tr><td>Управление сотрудниками и складом</td><td>—</td><td>—</td><td>✅</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /* ---------- Отчёты ---------- */
  function renderReports() {
    const clients = Store.list("clients");
    const payments = Store.list("payments");
    const requests = Store.list("requests");
    const tariffs = Store.list("tariffs");

    const byMonth = {};
    payments.forEach((p) => {
      const m = (p.createdAt || "").slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + p.amount;
    });
    const months = Object.keys(byMonth).sort();
    const maxMonth = Math.max.apply(null, Object.values(byMonth).concat([1]));

    // ожидаемая выручка по действующим абонентам
    const expected = clients.filter((c) => c.status === "active")
      .reduce((s, c) => s + ((Store.get("tariffs", c.tariffId) || {}).price || 0), 0);

    document.getElementById("view-reports").innerHTML = `
      <h2>Отчёты и аналитика</h2>
      <div class="row no-print mb-2">
        <button class="btn btn--sm btn--ghost" onclick="window.print()">🖨 Печать / PDF</button>
      </div>

      <div class="grid grid-4">
        <div class="card"><div class="stat"><span class="stat__label">Ожидаемая выручка/мес.</span>
          <span class="stat__value stat__value--ok" style="font-size:1.4rem">${money(expected)}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Факт поступлений</span>
          <span class="stat__value" style="font-size:1.4rem">${money(payments.reduce((s, p) => s + p.amount, 0))}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Абонентов</span>
          <span class="stat__value">${clients.length}</span></div></div>
        <div class="card"><div class="stat"><span class="stat__label">Заявок обработано</span>
          <span class="stat__value">${requests.filter((r) => r.status === "done").length}</span></div></div>
      </div>

      <div class="grid grid-2 mt-2">
        <div class="card">
          <h3>Поступления по месяцам</h3>
          ${months.map((m) => `<div style="margin-bottom:12px">
            <div class="row row--between" style="font-size:.9rem"><span>${m}</span><b>${money(byMonth[m])}</b></div>
            <div class="progress"><div class="progress__bar" style="width:${Math.round(byMonth[m] / maxMonth * 100)}%"></div></div>
          </div>`).join("")}
        </div>
        <div class="card">
          <h3>Отчёт по заявкам</h3>
          <div class="table-wrap">
            <table class="table table--compact">
              <tbody>
                <tr><td>Всего заявок</td><td><b>${requests.length}</b></td></tr>
                <tr><td>Выполнено</td><td><b>${requests.filter((r) => r.status === "done").length}</b></td></tr>
                <tr><td>В работе</td><td><b>${requests.filter((r) => r.status === "in_work").length}</b></td></tr>
                <tr><td>Новые</td><td><b>${requests.filter((r) => r.status === "new").length}</b></td></tr>
                <tr><td>Отменено</td><td><b>${requests.filter((r) => r.status === "cancel").length}</b></td></tr>
              </tbody>
            </table>
          </div>
          <h3 class="mt-2">Абоненты по тарифам</h3>
          <div class="table-wrap">
            <table class="table table--compact">
              <tbody>
                ${tariffs.map((t) => `<tr><td>${esc(t.name)}</td>
                  <td><b>${clients.filter((c) => c.tariffId === t.id).length}</b> чел.</td>
                  <td>${money(t.price)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Точка входа ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    me = Auth.requireEmployee();
    if (!me) return;
    renderSide();
    show("dashboard");
  });
})();
