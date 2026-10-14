-- =============================================================
-- Схема базы данных информационной системы малого предприятия связи
-- СУБД: PostgreSQL 14+  (совместимо с MySQL с незначительными правками)
-- =============================================================

-- ---------- Справочник тарифных планов ----------
CREATE TABLE tariffs (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    speed       INTEGER      DEFAULT 0,        -- скорость, Мбит/с
    tv          INTEGER      DEFAULT 0,        -- количество телеканалов
    price       NUMERIC(10,2) NOT NULL,        -- абонентская плата, руб./мес.
    type        VARCHAR(40)  NOT NULL,         -- тип услуги
    description TEXT,
    popular     SMALLINT     DEFAULT 0,
    active      SMALLINT     DEFAULT 1
);

-- ---------- Реестр абонентов ----------
CREATE TABLE clients (
    id           SERIAL PRIMARY KEY,
    account      VARCHAR(20)  NOT NULL UNIQUE, -- лицевой счёт
    login        VARCHAR(50)  NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,        -- в пром. версии — хэш (bcrypt)
    fio          VARCHAR(150) NOT NULL,
    phone        VARCHAR(30),
    email        VARCHAR(100),
    address      VARCHAR(200),
    tariff_id    INTEGER REFERENCES tariffs(id),
    balance      NUMERIC(12,2) DEFAULT 0,
    status       VARCHAR(15)  DEFAULT 'active',  -- active | blocked
    connected_at DATE,
    CONSTRAINT chk_status CHECK (status IN ('active','blocked'))
);

-- ---------- Заявки на подключение и сервис ----------
CREATE TABLE requests (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    tariff_id   INTEGER REFERENCES tariffs(id),
    fio         VARCHAR(150) NOT NULL,
    phone       VARCHAR(30),
    address     VARCHAR(200),
    text        TEXT,
    status      VARCHAR(15) DEFAULT 'new',       -- new | in_work | done | cancel
    created_at  DATE DEFAULT CURRENT_DATE,
    due_date    DATE,
    assignee    VARCHAR(150),
    CONSTRAINT chk_req_status CHECK (status IN ('new','in_work','done','cancel'))
);

-- ---------- Платежи ----------
CREATE TABLE payments (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    amount     NUMERIC(12,2) NOT NULL,
    method     VARCHAR(50),                      -- способ оплаты
    status     VARCHAR(15) DEFAULT 'paid',       -- paid | pending | failed
    created_at DATE DEFAULT CURRENT_DATE
);

-- ---------- Обращения в поддержку ----------
CREATE TABLE tickets (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    subject    VARCHAR(200) NOT NULL,
    text       TEXT,
    status     VARCHAR(15) DEFAULT 'open',       -- open | in_work | closed
    priority   VARCHAR(10) DEFAULT 'medium',     -- low | medium | high
    created_at DATE DEFAULT CURRENT_DATE,
    answer     TEXT
);

-- ---------- Склад оборудования ----------
CREATE TABLE equipment (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(150) NOT NULL,
    model  VARCHAR(100),
    qty    INTEGER DEFAULT 0,
    price  NUMERIC(12,2) DEFAULT 0,
    unit   VARCHAR(10) DEFAULT 'шт.'
);

-- ---------- Пользователи-сотрудники и роли ----------
CREATE TABLE employees (
    id       SERIAL PRIMARY KEY,
    login    VARCHAR(50)  NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fio      VARCHAR(150) NOT NULL,
    role     VARCHAR(15)  NOT NULL,              -- admin | operator
    position VARCHAR(100),
    CONSTRAINT chk_role CHECK (role IN ('admin','operator'))
);

-- ---------- Индексы ----------
CREATE INDEX idx_clients_tariff   ON clients(tariff_id);
CREATE INDEX idx_requests_status  ON requests(status);
CREATE INDEX idx_requests_created ON requests(created_at);
CREATE INDEX idx_payments_client  ON payments(client_id);
CREATE INDEX idx_tickets_client   ON tickets(client_id);

-- =============================================================
-- Представления (используются для отчётов и дашборда)
-- =============================================================

-- Карточка абонента с названием тарифа
CREATE VIEW v_clients_full AS
SELECT c.id, c.account, c.fio, c.phone, c.email, c.address,
       c.balance, c.status, c.connected_at,
       t.name AS tariff_name, t.price AS tariff_price
FROM clients c
LEFT JOIN tariffs t ON t.id = c.tariff_id;

-- Сводка заявок по статусам
CREATE VIEW v_requests_summary AS
SELECT status, COUNT(*) AS total
FROM requests
GROUP BY status;

-- Выручка по месяцам
CREATE VIEW v_revenue_by_month AS
SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(amount) AS total
FROM payments
WHERE status = 'paid'
GROUP BY 1
ORDER BY 1;

-- =============================================================
-- Примеры наполнения справочника тарифов
-- =============================================================
INSERT INTO tariffs (code, name, speed, tv, price, type, description, popular, active) VALUES
('HOME-100',  'Домашний Старт', 100,  0,   450.00, 'Интернет',    'Базовый доступ в интернет.', 0, 1),
('HOME-300',  'Оптимум',        300,  120, 700.00, 'Интернет+ТВ', 'Интернет и 120 каналов ТВ.', 1, 1),
('HOME-1000', 'Максимум',       1000, 200, 1100.00,'Интернет+ТВ', 'Гигабитный интернет и видеонаблюдение.', 0, 1),
('BUS-500',   'Бизнес 500',     500,  0,   1500.00,'Для бизнеса', 'Статический IP, SLA 99,9 %.', 0, 1),
('PHONE-01',  'Городская связь',0,    0,   300.00, 'Телефония',   'Городской номер с безлимитом.', 0, 1);

INSERT INTO employees (login, password, fio, role, position) VALUES
('admin',    'admin',    'Администратор системы', 'admin',    'Системный администратор'),
('operator', 'operator', 'Белова Мария Игоревна', 'operator', 'Оператор контакт-центра');
