.PHONY: up down build logs restart miro-board

# Создать доску Miro (нужен MIRO_ACCESS_TOKEN, см. scripts/miro/README.md)
miro-board:
	node scripts/miro/create-board.mjs

# Проверить токен Miro без создания доски
miro-check:
	node scripts/miro/create-board.mjs --check-token

# Поднять весь стек (Postgres + API + фронт)
up:
	docker compose up -d --build

# Остановить и удалить контейнеры (данные Postgres в volume сохраняются)
down:
	docker compose down

# Только сборка образов
build:
	docker compose build

logs:
	docker compose logs -f

restart:
	docker compose restart
