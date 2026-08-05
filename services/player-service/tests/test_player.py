import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import app, PLAYERS, USERNAME_INDEX  # noqa: E402


@pytest.fixture
def client():
    PLAYERS.clear()
    USERNAME_INDEX.clear()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200


def test_create_player(client):
    resp = client.post("/players", json={"username": "alice"})
    body = resp.get_json()
    assert resp.status_code == 201
    assert body["username"] == "alice"
    assert "id" in body


def test_create_player_missing_username(client):
    resp = client.post("/players", json={})
    assert resp.status_code == 400


def test_create_duplicate_username_is_idempotent(client):
    first = client.post("/players", json={"username": "alice"}).get_json()
    second = client.post("/players", json={"username": "alice"}).get_json()
    assert first["id"] == second["id"]


def test_get_player(client):
    created = client.post("/players", json={"username": "bob"}).get_json()
    resp = client.get(f"/players/{created['id']}")
    assert resp.status_code == 200
    assert resp.get_json()["username"] == "bob"


def test_get_player_not_found(client):
    resp = client.get("/players/does-not-exist")
    assert resp.status_code == 404


def test_search_player_by_username(client):
    client.post("/players", json={"username": "carol"})
    resp = client.get("/players?username=carol")
    assert resp.status_code == 200
    assert resp.get_json()["username"] == "carol"


def test_list_players(client):
    client.post("/players", json={"username": "dave"})
    client.post("/players", json={"username": "erin"})
    resp = client.get("/players")
    assert resp.status_code == 200
    assert len(resp.get_json()) == 2
