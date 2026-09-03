# Сайт Ксении Богатовой

Персональный сайт финансового директора на аутсорсе.

## Открыть сайт

[Сайт Ксении Богатовой](https://bogatovaprof-hub.github.io/ksenia-bogatova-site/).

GitHub Pages публикует текущую версию из корня ветки `codex/client-first-prototype-v2`.

## Текущий статус

Проект находится в стадии разработки.

Текущая рабочая версия:
index.html

Текущая ветка:
codex/client-first-prototype-v2

## Локальный просмотр

Сайт использует HTML, CSS и JavaScript без установки зависимостей и сборки.
Для локального просмотра нужен Node.js:

```sh
node scripts/preview-prototype.mjs
```

Открыть [первый экран сайта](http://127.0.0.1:4175/index.html#top).
Страницы документов: `privacy.html` и `consent.html`.

Проверки текущего прототипа:

```sh
node scripts/check-prototype.mjs
node scripts/check-feedback.mjs
```

Результаты локальных проверок и снимки экрана сохраняются в `artifacts/` и не включаются в репозиторий.

## Готовность к публикации

Это рабочий прототип. Политика обработки персональных данных и согласие пока содержат заглушки; рабочие контакты и реквизиты ожидают заполнения.
Индексация отключена через `noindex, nofollow`.

## Документация

Главный контекст:
docs/MASTER_CONTEXT.md

Журнал решений:
docs/DECISIONS.md

Правила работы Codex:
AGENTS.md

Reference:
marketing_spec_site_v2_2.md
TZ_Codex_three_screen_site_v1.md

## Важно

Существующий код и старые спецификации не являются автоматическим источником истины.

Перед разработкой проверять MASTER_CONTEXT и DECISIONS.
