package ws

type playerProgress struct {
	answered map[int]bool
}

type roomProgress struct {
	players map[string]*playerProgress
}

type progressStore struct {
	rooms map[string]*roomProgress
}

func newProgressStore() *progressStore {
	return &progressStore{rooms: make(map[string]*roomProgress)}
}

func (ps *progressStore) resetRoom(roomCode string) {
	roomCode = normalizeRoomCode(roomCode)
	ps.rooms[roomCode] = &roomProgress{players: make(map[string]*playerProgress)}
}

func (ps *progressStore) getPlayer(roomCode, playerID string) *playerProgress {
	roomCode = normalizeRoomCode(roomCode)
	room, ok := ps.rooms[roomCode]
	if !ok || room == nil {
		room = &roomProgress{players: make(map[string]*playerProgress)}
		ps.rooms[roomCode] = room
	}
	p, ok := room.players[playerID]
	if !ok || p == nil {
		p = &playerProgress{answered: make(map[int]bool)}
		room.players[playerID] = p
	}
	return p
}

func (ps *progressStore) canAnswer(roomCode, playerID string, questionIndex, totalQuestions int) error {
	if questionIndex < 0 || questionIndex >= totalQuestions {
		return &gameError{msg: "invalid question index"}
	}

	p := ps.getPlayer(roomCode, playerID)
	if p.answered[questionIndex] {
		return &gameError{msg: "already answered this question"}
	}
	for i := 0; i < questionIndex; i++ {
		if !p.answered[i] {
			return &gameError{msg: "answer questions in order"}
		}
	}
	return nil
}

func (ps *progressStore) markAnswered(roomCode, playerID string, questionIndex int) {
	p := ps.getPlayer(roomCode, playerID)
	p.answered[questionIndex] = true
}
