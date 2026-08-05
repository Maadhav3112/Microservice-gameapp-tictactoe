import sys
import os

# Point at an in-memory SQLite DB *before* importing the app, so it
# never tries to reach a real MySQL server during tests.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from app import app, db  # noqa: E402


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.app_context():
        db.drop_all()
        db.create_all()
    with app.test_client() as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200


def test_record_win(client):
    resp = client.post("/stats/result", json={
        "winner_id": "p1", "loser_id": "p2",
        "winner_username": "alice", "loser_username": "bob",
    })
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["winner"]["wins"] == 1
    assert body["loser"]["losses"] == 1


def test_record_win_missing_fields(client):
    resp = client.post("/stats/result", json={"winner_id": "p1"})
    assert resp.status_code == 400


def test_record_draw(client):
    resp = client.post("/stats/result", json={
        "draw": True,
        "players": [
            {"player_id": "p1", "username": "alice"},
            {"player_id": "p2", "username": "bob"},
        ],
    })
    assert resp.status_code == 201
    p1 = client.get("/stats/player/p1").get_json()
    assert p1["draws"] == 1


def test_get_player_stats_not_found(client):
    resp = client.get("/stats/player/ghost")
    assert resp.status_code == 404


def test_leaderboard_ordering(client):
    client.post("/stats/result", json={"winner_id": "p1", "loser_id": "p2"})
    client.post("/stats/result", json={"winner_id": "p1", "loser_id": "p2"})
    client.post("/stats/result", json={"winner_id": "p2", "loser_id": "p1"})

    resp = client.get("/stats/leaderboard")
    board = resp.get_json()
    assert resp.status_code == 200
    assert board[0]["player_id"] == "p1"
    assert board[0]["wins"] == 2


def test_win_rate_calculation(client):
    client.post("/stats/result", json={"winner_id": "p1", "loser_id": "p2"})
    client.post("/stats/result", json={"winner_id": "p2", "loser_id": "p1"})
    p1 = client.get("/stats/player/p1").get_json()
    assert p1["games_played"] == 2
    assert p1["win_rate"] == 0.5
