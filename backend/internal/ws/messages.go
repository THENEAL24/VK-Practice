package ws

import "github.com/THENEAL24/VK-Practice/backend/internal/model"

type Envelope struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

const (
	TypeRoomState     = "room:state"
	TypeGameCountdown = "game:countdown"
	TypeGameStart     = "game:start"
	TypeLeaderboard   = "leaderboard:update"
)

type GameCountdownPayload struct {
	Value int `json:"value"`
}

type RoomStatePayload = model.RoomResponse

type LeaderboardPayload = model.LeaderboardResponse
