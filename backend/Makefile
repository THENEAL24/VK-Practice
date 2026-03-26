.PHONY: run build sqlc migrate-up migrate-down docker-up docker-down

run:
	go run cmd/api/main.go

build:
	go build -o bin/api cmd/api/main.go

sqlc:
	sqlc generate

docker-up:
	docker compose -f ../docker-compose.yml up -d

docker-down:
	docker compose -f ../docker-compose.yml down

migrate-up:
	psql "$(DATABASE_URL)" -f db/migrations/001_init.up.sql

migrate-down:
	psql "$(DATABASE_URL)" -f db/migrations/001_init.down.sql

tidy:
	go mod tidy
