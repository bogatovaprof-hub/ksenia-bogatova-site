# Статус материалов сайта v5.0

Дата проверки: 2026-09-02
Этап: 2

| Материал | Статус | Файл | Проверен | Разрешён к публикации | Блокирует этап |
|---|---|---|---|---|---|
| Портрет desktop | PRESENT / VERIFIED | `assets/ksenia-bogatova-portrait-desktop.webp` | Да: файл и загрузка HTTP 200 | Да, согласно CURRENT | 1 |
| Портрет mobile | PRESENT / VERIFIED | `assets/ksenia-bogatova-portrait-mobile.webp` | Да: файл и загрузка HTTP 200 | Да, согласно CURRENT | 1 |
| Портрет JPG fallback | PRESENT / VERIFIED | `assets/ksenia-bogatova-portrait-fallback.jpg` | Да: файл и загрузка HTTP 200 | Да, согласно CURRENT | 1 |
| Главный кейс — изображение 1 | MISSING | — | Нет | Нет | 5 / 9 |
| Главный кейс — изображение 2 | MISSING | — | Нет | Нет | 5 / 9 |
| Кейс аренды | MISSING | — | Нет | Нет | 5 / 9 |
| Рекомендательное письмо | MISSING / OPTIONAL | — | Нет | Нет | Не обязательно |
| Видео | SOURCE PRESENT / NOT APPROVED | `видео для сайта.mp4` | Только наличие файла | Нет | 7 / 9 |
| Постер видео | MISSING | — | Нет | Нет | 7 / 9 |
| Субтитры видео | UNDETERMINED | — | Нет | Нет | 7 / 9, если есть речь |
| OG-изображение | MISSING | — | Нет | Нет | 9 |
| Полный логотип | SOURCE PRESENT | `Лента Фибоначчи — логотип.png` | Только наличие файла | Не определено | Не блокирует Этап 0 |
| MAX | MISSING / DEV BLOCKED | `assets/js/config.js` содержит `{{MAX_URL}}` | Оба программных режима проверены с временной тестовой HTTPS-ссылкой; реальная ссылка отсутствует | Нет | Публикационная готовность 2 / 9 |
| E-mail | MISSING / DEV BLOCKED | `assets/js/config.js` содержит `{{EMAIL}}` | Кодирование `mailto:` проверено с временным тестовым адресом; реальный адрес отсутствует | Нет | Публикационная готовность 2 / 9 |
| Реквизиты | MISSING | — | Нет | Нет | 9 |
| Политика | MISSING | — | Нет | Нет | 9 |
| Аналитика | ADAPTER PRESENT / DISABLED | `assets/js/config.js`, `assets/js/analytics.js` | Да: no-op адаптер и режим `disabled`; поставщик не подключён | Не применимо | 8 / 9 |

## Активы текущего `index.html`

Все семь активных локальных ресурсов проверяются через локальный HTTP-сервер:

- `assets/css/site.css`;
- `assets/js/config.js`;
- `assets/js/analytics.js`;
- `assets/js/site.js`;
- `assets/ksenia-bogatova-portrait-mobile.webp`;
- `assets/ksenia-bogatova-portrait-desktop.webp`;
- `assets/ksenia-bogatova-portrait-fallback.jpg`.
