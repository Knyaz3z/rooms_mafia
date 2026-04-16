# SPEC.md — Mafia Fix Rooms

## 1. Project Overview

Веб-приложение для ведения статистики игры "Мафия" на мероприятиях. Ведущий создаёт комнату, игроки входят по QR-коду/коду, ведущий начисляет баллы, игроки видят рейтинг в реальном времени.

## 2. Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL + Prisma |
| Frontend | React + Vite |
| Auth | JWT |
| Deploy | Railway |

## 3. Data Model

### User (Ведущий)
- `id` — UUID
- `email` — string, unique
- `password` — string (hashed)
- `name` — string
- `role` — enum: 'HOST', 'ADMIN'
- `createdAt` — timestamp

### Room (Комната)
- `id` — UUID
- `hostId` — UUID (FK User)
- `name` — string (название игры/мероприятия)
- `gameDate` — date
- `code` — string (6 символов, уникальный)
- `status` — enum: 'WAITING', 'IN_PROGRESS', 'FINISHED'
- `createdAt` — timestamp

### Player (Игрок в комнате)
- `id` — UUID
- `roomId` — UUID (FK Room)
- `name` — string
- `avatar` — string (emoji)
- `score` — integer (текущие баллы)
- `joinedAt` — timestamp

### GameHistory (История игры)
- `id` — UUID
- `roomId` — UUID (FK Room)
- `playerId` — UUID (FK Player)
- `score` — integer
- `round` — integer (номер раунда/игры)
- `createdAt` — timestamp

## 4. Functionality

### Auth
- Регистрация ведущего (email + password + name)
- Логин → JWT токен

### Room (Ведущий)
- Создать комнату → генерация 6-значного кода + QR-код
- Список своих комнат (с фильтром по дате)
- Редактирование комнаты: название, дата
- Удаление комнаты

### Players (Ведущий)
- Добавить игрока вручную (имя + аватар)
- Удалить игрока
- Редактировать имя/аватар игрока

### Scoring (Ведущий)
- Режим редактирования баллов: ввод баллов для всех игроков
- Кнопка "Опубликовать" → обновление баллов у всех игроков
- История набранных баллов по раундам

### Player View
- Вход по коду комнаты
- Выбор аватарки (emoji) + ввод имени
- Просмотр рейтинга (сортировка по очкам)
- Realtime обновление при публикации баллов ведущим

### Restrictions
- Игрок не может выйти из комнаты
- Игрок не может изменить имя/аватар после входа
- Один игрок = одна сессия (по коду комнаты)

## 5. UI/UX

### Страницы
1. `/` — Лендинг (текущий HTML)
2. `/login` — Вход для ведущих
3. `/register` — Регистрация ведущих
4. `/dashboard` — Панель ведущего (список комнат)
5. `/room/:code` — Комната (ведущий: управление + начисление баллов; игрок: просмотр рейтинга)

### Аватарки
Набор emoji: 🙂 😎 😈 🤡 👽 🤖 🎭 🦊 🐼 🦁 🦄 🐸 🐯 🦅 🐙

### Цветовая схема
- Тёмная тема с акцентом (фиолетовый/сиреневый — под "мафию")
- Тёмный фон: `#1a1a2e`
- Акцент: `#6c5ce7`
- Текст: `#f5f5f5`

## 6. Realtime

Socket.io:
- `room:join` — игрок присоединяется
- `room:leave` — (не используется, игрок не может выйти)
- `score:update` — ведущий опубликовал баллы → обновление у игроков
- `player:join` — игрок присоединился → уведомление ведущему