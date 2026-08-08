"""
Match Service
-------------
Puts players in a waiting queue, pairs them up two at a time, and asks
the Game Service to create a new game for the pair. Also keeps a small
in-memory index of active matches so the frontend can look up "what
game is player X currently in".
"""
import os
import uuid
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

GAME_SERVICE_URL = os.environ.get("GAME_SERVICE_URL", "http://game-service:5001")
PLAYER_SERVICE_URL = os.environ.get("PLAYER_SERVICE_URL", "http://player-service:5002")

# Waiting queue: list of {"player_id": ..., "username": ...}
QUEUE = []

# match_id -> {"id", "game_id", "players": [...]}
MATCHES = {}

# player_id -> match_id, so a player can poll "am I matched yet?"
PLAYER_MATCH_INDEX = {}


@app.get("/health")
def health():
    return jsonify(status="ok", service="match-service"), 200


@app.post("/queue")
def join_queue():
    data = request.get_json(force=True) or {}
    player_id = data.get("player_id")
    username = data.get("username", "")

    if not player_id:
        return jsonify(error="player_id is required"), 400

    # Already matched? Just tell them where.
    if player_id in PLAYER_MATCH_INDEX:
        match = MATCHES[PLAYER_MATCH_INDEX[player_id]]
        return jsonify(status="matched", match=match), 200

    # Already waiting? Don't add them twice.
    if any(p["player_id"] == player_id for p in QUEUE):
        return jsonify(status="waiting", position=len(QUEUE)), 200

    QUEUE.append({"player_id": player_id, "username": username})

    if len(QUEUE) >= 2:
        player_x = QUEUE.pop(0)
        player_o = QUEUE.pop(0)
        match = _create_match(player_x, player_o)
        return jsonify(status="matched", match=match), 201

    return jsonify(status="waiting", position=len(QUEUE)), 202


def _create_match(player_x, player_o):
    """Call the Game Service to start a new game, then remember the match."""
    resp = requests.post(
        f"{GAME_SERVICE_URL}/games",
        json={"player_x": player_x["player_id"], "player_o": player_o["player_id"]},
        timeout=5,
    )
    resp.raise_for_status()
    game = resp.json()

    match_id = str(uuid.uuid4())
    match = {
        "id": match_id,
        "game_id": game["id"],
        "players": [player_x, player_o],
    }
    MATCHES[match_id] = match
    PLAYER_MATCH_INDEX[player_x["player_id"]] = match_id
    PLAYER_MATCH_INDEX[player_o["player_id"]] = match_id
    return match


@app.get("/queue/status/<player_id>")
def queue_status(player_id):
    if player_id in PLAYER_MATCH_INDEX:
        match = MATCHES[PLAYER_MATCH_INDEX[player_id]]
        return jsonify(status="matched", match=match), 200
    if any(p["player_id"] == player_id for p in QUEUE):
        return jsonify(status="waiting"), 200
    return jsonify(status="not_in_queue"), 200


@app.post("/queue/leave")
def leave_queue():
    data = request.get_json(force=True) or {}
    player_id = data.get("player_id")
    global QUEUE
    QUEUE = [p for p in QUEUE if p["player_id"] != player_id]

    # Also forget any match this player was previously in, so rejoining
    # the queue later (even with the same player_id) starts a genuinely
    # fresh match instead of being handed back a stale/old one.
    match_id = PLAYER_MATCH_INDEX.pop(player_id, None)
    if match_id and match_id in MATCHES:
        match = MATCHES[match_id]
        other_players = [p["player_id"] for p in match["players"] if p["player_id"] != player_id]
        # Only fully discard the match once BOTH players have left, so the
        # other player's in-game state/polling isn't yanked out from under them.
        still_active = any(pid in PLAYER_MATCH_INDEX for pid in other_players)
        if not still_active:
            MATCHES.pop(match_id, None)

    return jsonify(status="left"), 200


@app.get("/matches/<match_id>")
def get_match(match_id):
    match = MATCHES.get(match_id)
    if not match:
        return jsonify(error="match not found"), 404
    return jsonify(match), 200


@app.get("/matches")
def list_matches():
    """List active matches - useful for an admin view or debugging."""
    return jsonify(list(MATCHES.values())), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)