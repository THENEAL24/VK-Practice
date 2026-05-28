package ws

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/THENEAL24/VK-Practice/backend/internal/model"
)

func normalizeRoomCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

type RoomLoader func(ctx context.Context, roomCode string) (*model.RoomResponse, error)

type LeaderboardLoader func(ctx context.Context, roomCode string) (*model.LeaderboardResponse, error)

type Hub struct {
	mu          sync.RWMutex
	rooms       map[string]map[*Client]bool
	progress    *progressStore
	countdown   map[string]int
	inCountdown map[string]bool

	loadRoom        RoomLoader
	loadLeaderboard LeaderboardLoader
}

func NewHub(loadRoom RoomLoader, _ QuizLoader, loadLeaderboard LeaderboardLoader) *Hub {
	return &Hub{
		rooms:           make(map[string]map[*Client]bool),
		progress:        newProgressStore(),
		countdown:       make(map[string]int),
		inCountdown:     make(map[string]bool),
		loadRoom:        loadRoom,
		loadLeaderboard: loadLeaderboard,
	}
}

// QuizLoader kept for NewHub signature compatibility.
type QuizLoader func(ctx context.Context, roomCode string) (timePerQuestion int, totalQuestions int, err error)

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[c.roomCode] == nil {
		h.rooms[c.roomCode] = make(map[*Client]bool)
	}
	h.rooms[c.roomCode][c] = true
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.rooms[c.roomCode]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.rooms, c.roomCode)
		}
	}
	close(c.send)
}

func (h *Hub) broadcast(roomCode string, env Envelope) {
	roomCode = normalizeRoomCode(roomCode)
	h.mu.RLock()
	clients := h.rooms[roomCode]
	list := make([]*Client, 0, len(clients))
	for c := range clients {
		list = append(list, c)
	}
	h.mu.RUnlock()

	for _, c := range list {
		c.sendJSON(env)
	}
}

func (h *Hub) BroadcastRoom(ctx context.Context, roomCode string) {
	roomCode = normalizeRoomCode(roomCode)
	if h.loadRoom == nil {
		return
	}
	room, err := h.loadRoom(ctx, roomCode)
	if err != nil {
		log.Printf("ws BroadcastRoom %s: %v", roomCode, err)
		return
	}
	h.broadcast(roomCode, Envelope{Type: TypeRoomState, Data: room})
}

func (h *Hub) BroadcastLeaderboard(ctx context.Context, roomCode string) {
	if h.loadLeaderboard == nil {
		return
	}
	lb, err := h.loadLeaderboard(ctx, roomCode)
	if err != nil {
		return
	}
	h.broadcast(roomCode, Envelope{Type: TypeLeaderboard, Data: lb})
}

func (h *Hub) CanAnswer(roomCode, playerID string, questionIndex, totalQuestions int) error {
	roomCode = normalizeRoomCode(roomCode)
	h.mu.RLock()
	inCD := h.inCountdown[roomCode]
	h.mu.RUnlock()
	if inCD {
		return errGameNotActive
	}
	return h.progress.canAnswer(roomCode, playerID, questionIndex, totalQuestions)
}

func (h *Hub) MarkAnswered(roomCode, playerID string, questionIndex int) {
	h.progress.markAnswered(normalizeRoomCode(roomCode), playerID, questionIndex)
}

func (h *Hub) StartGame(_ context.Context, roomCode string) {
	roomCode = normalizeRoomCode(roomCode)
	h.mu.Lock()
	h.progress.resetRoom(roomCode)
	h.inCountdown[roomCode] = true
	h.mu.Unlock()

	go h.broadcastCountdown(roomCode)
}

func (h *Hub) broadcastCountdown(roomCode string) {
	for n := 3; n >= 1; n-- {
		h.mu.Lock()
		h.countdown[roomCode] = n
		h.mu.Unlock()

		h.broadcast(roomCode, Envelope{
			Type: TypeGameCountdown,
			Data: GameCountdownPayload{Value: n},
		})
		time.Sleep(time.Second)
	}

	h.mu.Lock()
	delete(h.countdown, roomCode)
	delete(h.inCountdown, roomCode)
	h.mu.Unlock()

	h.broadcast(roomCode, Envelope{Type: TypeGameStart, Data: map[string]any{}})
}

func (h *Hub) sendSnapshot(c *Client) {
	ctx := context.Background()
	if h.loadRoom != nil {
		if room, err := h.loadRoom(ctx, c.roomCode); err == nil {
			c.sendJSON(Envelope{Type: TypeRoomState, Data: room})
		}
	}

	h.mu.RLock()
	n, inCD := h.countdown[c.roomCode]
	h.mu.RUnlock()
	if inCD && n > 0 {
		c.sendJSON(Envelope{Type: TypeGameCountdown, Data: GameCountdownPayload{Value: n}})
	}
}

var errGameNotActive = &gameError{msg: "game is not active for this player"}

type gameError struct{ msg string }

func (e *gameError) Error() string { return e.msg }

func IsGameError(err error) bool {
	_, ok := err.(*gameError)
	return ok
}
