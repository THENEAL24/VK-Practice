package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/THENEAL24/VK-Practice/backend/internal/service"
)

type ctxKey int

const (
	userCtxKey ctxKey = iota
	tokenCtxKey
)

// AuthOptional attaches a user (if a valid Bearer token is supplied) to the request context.
// Endpoints that need authentication should check the context themselves.
func AuthOptional(auth *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearer(r)
			if token != "" {
				if user, err := auth.LookupSession(r.Context(), token); err == nil {
					ctx := context.WithValue(r.Context(), userCtxKey, user)
					ctx = context.WithValue(ctx, tokenCtxKey, token)
					r = r.WithContext(ctx)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// UserFromContext returns the user attached by AuthOptional, or nil.
func UserFromContext(ctx context.Context) *model.UserResponse {
	if v, ok := ctx.Value(userCtxKey).(*model.UserResponse); ok {
		return v
	}
	return nil
}

// TokenFromContext returns the raw bearer token associated with the current user.
func TokenFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(tokenCtxKey).(string); ok {
		return v
	}
	return ""
}

func extractBearer(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if header == "" {
		return ""
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return ""
	}
	return strings.TrimSpace(header[len(prefix):])
}
