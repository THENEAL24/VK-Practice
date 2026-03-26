package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	FrontendURL string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8050"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/vkquiz?sslmode=disable"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func (c *Config) Addr() string {
	return fmt.Sprintf(":%s", c.Port)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
