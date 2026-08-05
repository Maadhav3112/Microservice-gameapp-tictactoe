import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app as match_app  # noqa: E402


class FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code

    def json(self):
        return self._json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


@pytest.fixture
def client(monkeypatch):
    match_app.QUEUE.clear()
    match_app.MATCHES.clear()
    match_app.PLAYER_MATCH_INDEX.clear()

    def fake_post(url, json=None, timeout=5):
        # Simulate the game-service's /games response
        return FakeResponse({
            "id": "fake-game-id",
            "board": [None] * 9,
            "players": {"X": json["player_x"], "O": json["player_o"]},
            "turn": "X",
            "status": "in_progress",
            "winner": None,
        }, 201)

    monkeypatch.setattr(match_app.requests, "post", fake_post)

    match_app.app.config["TESTING"] = True
    with match_app.app.test_client() as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200


def test_first_player_waits(client):
    resp = client.post("/queue", json={"player_id": "p1", "username": "alice"})
    assert resp.status_code == 202
    assert resp.get_json()["status"] == "waiting"


def test_second_player_gets_matched(client):
    client.post("/queue", json={"player_id": "p1", "username": "alice"})
    resp = client.post("/queue", json={"player_id": "p2", "username": "bob"})
    body = resp.get_json()
    assert resp.status_code == 201
    assert body["status"] == "matched"
    assert body["match"]["game_id"] == "fake-game-id"
    assert len(body["match"]["players"]) == 2


def test_queue_status_after_match(client):
    client.post("/queue", json={"player_id": "p1", "username": "alice"})
    client.post("/queue", json={"player_id": "p2", "username": "bob"})
    resp = client.get("/queue/status/p1")
    assert resp.get_json()["status"] == "matched"


def test_queue_status_not_in_queue(client):
    resp = client.get("/queue/status/ghost")
    assert resp.get_json()["status"] == "not_in_queue"


def test_leave_queue(client):
    client.post("/queue", json={"player_id": "p1", "username": "alice"})
    resp = client.post("/queue/leave", json={"player_id": "p1"})
    assert resp.status_code == 200
    status = client.get("/queue/status/p1").get_json()
    assert status["status"] == "not_in_queue"


def test_get_match_not_found(client):
    resp = client.get("/matches/does-not-exist")
    assert resp.status_code == 404


def test_missing_player_id(client):
    resp = client.post("/queue", json={})
    assert resp.status_code == 400
