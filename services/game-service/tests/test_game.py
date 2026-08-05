import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import app, GAMES  # noqa: E402


@pytest.fixture
def client():
    GAMES.clear()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def create_game(client, player_x="alice", player_o="bob"):
    resp = client.post("/games", json={"player_x": player_x, "player_o": player_o})
    return resp.get_json()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_create_game(client):
    game = create_game(client)
    assert game["turn"] == "X"
    assert game["status"] == "in_progress"
    assert game["board"] == [None] * 9


def test_create_game_missing_players(client):
    resp = client.post("/games", json={"player_x": "alice"})
    assert resp.status_code == 400


def test_valid_move(client):
    game = create_game(client)
    resp = client.post(f"/games/{game['id']}/move", json={"player_id": "alice", "position": 0})
    body = resp.get_json()
    assert resp.status_code == 200
    assert body["board"][0] == "X"
    assert body["turn"] == "O"


def test_move_out_of_turn(client):
    game = create_game(client)
    resp = client.post(f"/games/{game['id']}/move", json={"player_id": "bob", "position": 0})
    assert resp.status_code == 409


def test_move_on_taken_cell(client):
    game = create_game(client)
    client.post(f"/games/{game['id']}/move", json={"player_id": "alice", "position": 0})
    resp = client.post(f"/games/{game['id']}/move", json={"player_id": "bob", "position": 0})
    assert resp.status_code == 409


def test_win_detection(client):
    game = create_game(client)
    gid = game["id"]
    moves = [
        ("alice", 0), ("bob", 3),
        ("alice", 1), ("bob", 4),
        ("alice", 2),  # X wins top row
    ]
    body = None
    for pid, pos in moves:
        resp = client.post(f"/games/{gid}/move", json={"player_id": pid, "position": pos})
        body = resp.get_json()
    assert body["status"] == "X"
    assert body["winner"] == "alice"


def test_draw_detection(client):
    game = create_game(client)
    gid = game["id"]
    # X O X / X O O / O X X -> draw
    moves = [
        ("alice", 0), ("bob", 1),
        ("alice", 2), ("bob", 4),
        ("alice", 3), ("bob", 5),
        ("alice", 7), ("bob", 6),
        ("alice", 8),
    ]
    body = None
    for pid, pos in moves:
        resp = client.post(f"/games/{gid}/move", json={"player_id": pid, "position": pos})
        body = resp.get_json()
    assert body["status"] == "draw"


def test_game_not_found(client):
    resp = client.get("/games/does-not-exist")
    assert resp.status_code == 404
