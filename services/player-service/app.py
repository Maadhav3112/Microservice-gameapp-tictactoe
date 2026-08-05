"""
Player Service
--------------
Manages player usernames and profiles. Uses a simple in-memory store
for beginner-friendliness. Swap PLAYERS for a real database table
when you're ready to move past the tutorial stage.
"""
import os
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory store: { player_id: player_dict }
PLAYERS = {}
# Reverse index so we can enforce unique usernames quickly
USERNAME_INDEX = {}


@app.get("/health")
def health():
    return jsonify(status="ok", service="player-service"), 200


@app.post("/players")
def create_player():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()

    if not username:
        return jsonify(error="username is required"), 400

    if username.lower() in USERNAME_INDEX:
        # Username already exists -> return the existing profile (idempotent join)
        existing_id = USERNAME_INDEX[username.lower()]
        return jsonify(PLAYERS[existing_id]), 200

    player_id = str(uuid.uuid4())
    player = {"id": player_id, "username": username}
    PLAYERS[player_id] = player
    USERNAME_INDEX[username.lower()] = player_id
    return jsonify(player), 201


@app.get("/players/<player_id>")
def get_player(player_id):
    player = PLAYERS.get(player_id)
    if not player:
        return jsonify(error="player not found"), 404
    return jsonify(player), 200


@app.get("/players")
def list_or_search_players():
    username = request.args.get("username")
    if username:
        pid = USERNAME_INDEX.get(username.lower())
        if not pid:
            return jsonify(error="player not found"), 404
        return jsonify(PLAYERS[pid]), 200
    return jsonify(list(PLAYERS.values())), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port)
