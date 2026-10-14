/* =============================================================
   data.js — модель данных информационной системы
   -------------------------------------------------------------
   Реализует упрощённое «ядро» ИС: набор справочников и
   документов (сущностей), а также API доступа к данным.
   В качестве хранилища используется localStorage браузера —
   это позволяет демонстрировать работу системы без сервера
   и СУБД. В промышленной версии этот слой заменяется на
   обращения к REST API над PostgreSQL/MySQL.
   ============================================================= */
(function (global) {
  "use strict";

  const DB_KEY = "svyaztelecom_db_v1";
  const SESSION_KEY = "svyaztelecom_session_v1";

  /* ---------------------------------------------------------
     Эталонные данные (начальное наполнение БД).
     Структура повторяет таблицы реляционной схемы, описанной
     в пояснительной записке (раздел «Модель данных»).
     --------------------------------------------------------- */
  function seed() {
    return {
      /* Справочник тарифов */
      tariffs: [
        { id: 1, code: "HOME-100",  name: "Домашний Старт",  speed: 100,  tv: 0,   price: 450,  type: "Интернет",     desc: "Базовый доступ в интернет для одного-двух устройств.", popular: 0, active: 1 },
        { id: 2, code: "HOME-300",  name: "Оптимум",         speed: 300,  tv: 120, price: 700,  type: "Интернет+ТВ",  desc: "Оптимальное решение: быстрый интернет и 120 каналов ТВ.", popular: 1, active: 1 },
        { id: 3, code: "HOME-1000", name: "Максимум",        speed: 1000, tv: 200, price: 1100, type: "Интернет+ТВ",  desc: "Гигабитный интернет, 200 каналов и облачное видеонаблюдение.", popular: 0, active: 1 },
        { id: 4, code: "BUS-500",   name: "Бизнес 500",      speed: 500,  tv: 0,   price: 1500, type: "Для бизнеса",  desc: "Выделенный статический IP-адрес, SLA 99,9 %, приоритетная поддержка.", popular: 0, active: 1 },
        { id: 5, code: "PHONE-01",  name: "Городская связь", speed: 0,    tv: 0,   price: 300,  type: "Телефония",    desc: "Городской номер с безлимитными звонками внутри сети.", popular: 0, active: 1 }
      ],

      /* Реестр абонентов */
      clients: [
        { id: 1, login: "ivanov",  password: "12345", fio: "Иванов Иван Иванович",     phone: "+7 (900) 111-22-33", email: "ivanov@mail.ru",    address: "ул. Ленина, д. 12, кв. 45",   tariffId: 2, balance: 350,    status: "active",   connectedAt: "2023-04-11", account: "1100001" },
        { id: 2, login: "petrova", password: "12345", fio: "Петрова Анна Сергеевна",   phone: "+7 (900) 222-33-44", email: "petrova@yandex.ru", address: "пр. Мира, д. 8, кв. 3",       tariffId: 3, balance: 1240,   status: "active",   connectedAt: "2022-11-02", account: "1100002" },
        { id: 3, login: "sidorov", password: "12345", fio: "Сидоров Пётр Алексеевич",  phone: "+7 (900) 333-44-55", email: "sidorov@gmail.com", address: "ул. Садовая, д. 5",           tariffId: 1, balance: -120,   status: "blocked",  connectedAt: "2024-02-19", account: "1100003" },
        { id: 4, login: "ooo_romashka", password: "12345", fio: "ООО «Ромашка» (юр. лицо)", phone: "+7 (900) 444-55-66", email: "office@romashka.ru", address: "ул. Заводская, д. 21, офис 7", tariffId: 4, balance: 5000, status: "active", connectedAt: "2021-06-30", account: "1100004" },
        { id: 5, login: "kuznetsov", password: "12345", fio: "Кузнецов Дмитрий Олегович", phone: "+7 (900) 555-66-77", email: "kuznetsov@mail.ru", address: "ул. Лесная, д. 3, кв. 12", tariffId: 2, balance: 60, status: "active", connectedAt: "2025-01-15", account: "1100005" }
      ],

      /* Заявки на подключение и сервисные заявки */
      requests: [
        { id: 1, clientId: 5, tariffId: 2, fio: "Кузнецов Дмитрий Олегович", phone: "+7 (900) 555-66-77", address: "ул. Лесная, д. 3, кв. 12", text: "Подключение после переезда", status: "done",    createdAt: "2025-01-15",   dueDate: "2025-01-18",  assignee: "Монтажник Орлов А." },
        { id: 2, clientId: null, tariffId: 3, fio: "Смирнова Ольга Петровна", phone: "+7 (900) 777-88-99", address: "ул. Гагарина, д. 14, кв. 88", text: "Хочу подключить гигабитный тариф", status: "in_work", createdAt: "2026-10-02", dueDate: "2026-10-06", assignee: "Оператор Белова М." },
        { id: 3, clientId: null, tariffId: 5, fio: "ИП Волков (магазин «Продукты»)", phone: "+7 (900) 888-99-00", address: "ул. Центральная, д. 1", text: "Требуется городской номер + интернет", status: "new", createdAt: "2026-10-09", dueDate: "2026-10-13", assignee: "" },
        { id: 4, clientId: 3, tariffId: 1, fio: "Сидоров Пётр Алексеевич", phone: "+7 (900) 333-44-55", address: "ул. Садовая, д. 5", text: "Низкая скорость вечером", status: "new", createdAt: "2026-10-12", dueDate: "2026-10-14", assignee: "" },
        { id: 5, clientId: null, tariffId: 2, fio: "Николаев Артём Игоревич", phone: "+7 (900) 999-00-11", address: "ул. Молодёжная, д. 9, кв. 21", text: "Подключение интернета и ТВ", status: "cancel", createdAt: "2026-09-21", dueDate: "2026-09-25", assignee: "Оператор Белова М." }
      ],

      /* История платежей */
      payments: [
        { id: 1, clientId: 1, amount: 700,  method: "Банковская карта", status: "paid", createdAt: "2026-09-05" },
        { id: 2, clientId: 2, amount: 1100, method: "Банковская карта", status: "paid", createdAt: "2026-09-07" },
        { id: 3, clientId: 4, amount: 4500, method: "Безналичный расчёт", status: "paid", createdAt: "2026-09-10" },
        { id: 4, clientId: 3, amount: 450,  method: "СБП",              status: "paid", createdAt: "2026-08-14" },
        { id: 5, clientId: 5, amount: 700,  method: "Банковская карта", status: "paid", createdAt: "2026-10-01" }
      ],

      /* Обращения в службу поддержки */
      tickets: [
        { id: 1, clientId: 3, subject: "Медленный интернет", text: "Вечером скорость падает до 10 Мбит/с.", status: "open",    priority: "high", createdAt: "2026-10-12", answer: "" },
        { id: 2, clientId: 2, subject: "Не работает один ТВ-канал", text: "Пропал канал «Наука HD».", status: "closed", priority: "low", createdAt: "2026-10-05", answer: "Канал временно недоступен у вещателя, доступ восстановлен." },
        { id: 3, clientId: 5, subject: "Смена тарифа", text: "Хочу перейти на тариф «Максимум».", status: "in_work", priority: "medium", createdAt: "2026-10-11", answer: "" }
      ],

      /* Склад абонентского оборудования (справочник + остатки) */
      equipment: [
        { id: 1, name: "Оптический терминал (ONU) GPON", model: "Huawei HG8010H", qty: 42, price: 2400, unit: "шт." },
        { id: 2, name: "Wi-Fi роутер", model: "Keenetic Giga", qty: 17, price: 4900, unit: "шт." },
        { id: 3, name: "ТВ-приставка IPTV", model: "Eltex NV-501", qty: 23, price: 3600, unit: "шт." },
        { id: 4, name: "Оптический патч-корд", model: "SC/APC 3 м", qty: 180, price: 210, unit: "шт." },
        { id: 5, name: "Медиаконвертер", model: "TP-Link MC220L", qty: 6, price: 1900, unit: "шт." }
      ],

      /* Пользователи ИС — сотрудники предприятия (роли) */
      employees: [
        { id: 1, login: "admin",  password: "admin", fio: "Администратор системы", role: "admin",    position: "Системный администратор" },
        { id: 2, login: "operator", password: "operator", fio: "Белова Мария Игоревна", role: "operator", position: "Оператор контакт-центра" }
      ],

      /* Служебная таблица — счётчики для автоинкремента */
      _meta: { version: 1, nextId: {} }
    };
  }

  /* ---------------------------------------------------------
     Низкоуровневый доступ к «базе данных»
     --------------------------------------------------------- */
  function readDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        const fresh = seed();
        localStorage.setItem(DB_KEY, JSON.stringify(fresh));
        return fresh;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error("Ошибка чтения БД:", e);
      return seed();
    }
  }

  function writeDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }

  const TABLES = ["tariffs", "clients", "requests", "payments", "tickets", "equipment", "employees"];

  /* ---------------------------------------------------------
     Публичный API хранилища (аналог слоя репозиториев)
     --------------------------------------------------------- */
  const Store = {
    tables: TABLES,

    all() { return readDB(); },

    /* SELECT * FROM table [WHERE filter] */
    list(table, filter) {
      const rows = readDB()[table] || [];
      if (!filter) return rows.slice();
      return rows.filter((row) =>
        Object.keys(filter).every((k) => String(row[k]) === String(filter[k]))
      );
    },

    /* SELECT * FROM table WHERE id = ? */
    get(table, id) {
      return (readDB()[table] || []).find((r) => r.id === Number(id)) || null;
    },

    /* INSERT */
    insert(table, obj) {
      const db = readDB();
      if (!db[table]) db[table] = [];
      const nextId = db[table].reduce((m, r) => Math.max(m, r.id), 0) + 1;
      const row = Object.assign({ id: nextId }, obj);
      db[table].push(row);
      writeDB(db);
      return row;
    },

    /* UPDATE */
    update(table, id, patch) {
      const db = readDB();
      const rows = db[table] || [];
      const i = rows.findIndex((r) => r.id === Number(id));
      if (i === -1) return null;
      rows[i] = Object.assign({}, rows[i], patch);
      writeDB(db);
      return rows[i];
    },

    /* DELETE */
    remove(table, id) {
      const db = readDB();
      db[table] = (db[table] || []).filter((r) => r.id !== Number(id));
      writeDB(db);
      return true;
    },

    /* Полный сброс к эталонным данным */
    reset() {
      localStorage.removeItem(DB_KEY);
      return readDB();
    },

    /* Вспомогательные выборки (имитация SQL-представлений) */
    tariffsById() {
      const map = {};
      this.list("tariffs").forEach((t) => (map[t.id] = t));
      return map;
    },
    tariffName(id) {
      const t = this.get("tariffs", id);
      return t ? t.name : "—";
    },
    clientName(id) {
      const c = this.get("clients", id);
      return c ? c.fio : "—";
    }
  };

  /* ---------------------------------------------------------
     Подсистема аутентификации и разграничения прав доступа
     --------------------------------------------------------- */
  const Auth = {
    /* Проверяет учётные данные абонента */
    loginClient(login, password) {
      const c = Store.list("clients").find(
        (x) => x.login === String(login).trim().toLowerCase() && x.password === String(password)
      );
      if (!c) return null;
      const session = { kind: "client", id: c.id, fio: c.fio, login: c.login };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    /* Проверяет учётные данные сотрудника */
    loginEmployee(login, password) {
      const e = Store.list("employees").find(
        (x) => x.login === String(login).trim().toLowerCase() && x.password === String(password)
      );
      if (!e) return null;
      const session = { kind: "employee", id: e.id, fio: e.fio, login: e.login, role: e.role };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    /* Универсальный вход: сначала ищет среди сотрудников, затем абонентов */
    login(login, password) {
      return this.loginEmployee(login, password) || this.loginClient(login, password);
    },

    current() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    requireClient() {
      const s = this.current();
      if (!s || s.kind !== "client") { location.href = "login.html"; return null; }
      return Store.get("clients", s.id);
    },

    requireEmployee() {
      const s = this.current();
      if (!s || s.kind !== "employee") { location.href = "login.html?role=admin"; return null; }
      return Store.list("employees").find((e) => e.id === s.id) || null;
    },

    logout() {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  /* Экспорт в глобальную область */
  global.Store = Store;
  global.Auth = Auth;
  global.DB_KEY = DB_KEY;
})(window);
