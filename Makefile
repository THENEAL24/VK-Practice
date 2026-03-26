.PHONY: up down build logs restart

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
