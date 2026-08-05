"""
Game Service
------------
Owns the Tic-Tac-Toe board state and game rules.
Games are kept in memory (a real production system would swap this
dict for Redis, but in-memory keeps this beginner-friendly).
"""
import os
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory store: { game_id: game_dict }
GAMES = {}

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),  # rows
    (0, 3, 6), (1, 4, 7), (2, 5, 8),  # columns
    (0, 4, 8), (2, 4, 6),             # diagonals
]


def check_winner(board):
    """Return 'X', 'O', 'draw', or None."""
    for a, b, c in WIN_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    if all(cell for cell in board):
        return "draw"
    return None


@app.get("/health")
def health():
    return jsonify(status="ok", service="game-service"), 200


@app.post("/games")
def create_game():
    """Create a new game between two players."""
    data = request.get_json(force=True) or {}
    player_x = data.get("player_x")
    player_o = data.get("player_o")

    if not player_x or not player_o:
        return jsonify(error="player_x and player_o are required"), 400

    game_id = str(uuid.uuid4())
    GAMES[game_id] = {
        "id": game_id,
        "board": [None] * 9,
        "players": {"X": player_x, "O": player_o},
        "turn": "X",
        "status": "in_progress",  # in_progress | X | O | draw
        "winner": None,
    }
    return jsonify(GAMES[game_id]), 201


@app.get("/games/<game_id>")
def get_game(game_id):
    game = GAMES.get(game_id)
    if not game:
        return jsonify(error="game not found"), 404
    return jsonify(game), 200


@app.post("/games/<game_id>/move")
def make_move(game_id):
    game = GAMES.get(game_id)
    if not game:
        return jsonify(error="game not found"), 404

    if game["status"] != "in_progress":
        return jsonify(error="game already finished", game=game), 400

    data = request.get_json(force=True) or {}
    player_id = data.get("player_id")
    position = data.get("position")  # 0-8

    if position is None or not isinstance(position, int) or not (0 <= position <= 8):
        return jsonify(error="position must be an integer 0-8"), 400

    # Work out which symbol this player owns
    symbol = None
    for sym, pid in game["players"].items():
        if pid == player_id:
            symbol = sym
    if symbol is None:
        return jsonify(error="player is not part of this game"), 403

    if symbol != game["turn"]:
        return jsonify(error="not your turn"), 409

    if game["board"][position] is not None:
        return jsonify(error="cell already taken"), 409

    game["board"][position] = symbol
    result = check_winner(game["board"])

    if result == "draw":
        game["status"] = "draw"
    elif result in ("X", "O"):
        game["status"] = result
        game["winner"] = game["players"][result]
    else:
        game["turn"] = "O" if symbol == "X" else "X"

    return jsonify(game), 200


@app.get("/games")
def list_games():
    """List all games (mainly for debugging / match-service polling)."""
    return jsonify(list(GAMES.values())), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
