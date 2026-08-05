"""
Stats Service
-------------
Stores win/loss/draw history and serves the leaderboard.
Uses MySQL in production (via SQLAlchemy + PyMySQL). Tests override
DATABASE_URL to point at an in-memory SQLite database so pytest
doesn't need a real MySQL server running.
"""
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "mysql+pymysql://ttt_user:ttt_password@mysql:3306/ttt_stats",
)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class PlayerStats(db.Model):
    __tablename__ = "player_stats"

    player_id = db.Column(db.String(64), primary_key=True)
    username = db.Column(db.String(64), nullable=False)
    wins = db.Column(db.Integer, default=0, nullable=False)
    losses = db.Column(db.Integer, default=0, nullable=False)
    draws = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self):
        games_played = self.wins + self.losses + self.draws
        win_rate = round(self.wins / games_played, 3) if games_played else 0.0
        return {
            "player_id": self.player_id,
            "username": self.username,
            "wins": self.wins,
            "losses": self.losses,
            "draws": self.draws,
            "games_played": games_played,
            "win_rate": win_rate,
        }


def _get_or_create(player_id, username=""):
    row = db.session.get(PlayerStats, player_id)
    if not row:
        row = PlayerStats(player_id=player_id, username=username or player_id, wins=0, losses=0, draws=0)
        db.session.add(row)
    elif username:
        row.username = username
    return row


with app.app_context():
    db.create_all()


@app.get("/health")
def health():
    return jsonify(status="ok", service="stats-service"), 200


@app.post("/stats/result")
def record_result():
    """
    Record the outcome of a finished game.
    Body examples:
      Draw:  {"draw": true, "players": [{"player_id": "p1", "username": "alice"}, {"player_id": "p2", "username": "bob"}]}
      Win:   {"winner_id": "p1", "loser_id": "p2", "winner_username": "alice", "loser_username": "bob"}
    """
    data = request.get_json(force=True) or {}

    if data.get("draw"):
        players = data.get("players", [])
        if len(players) != 2:
            return jsonify(error="draw requires exactly 2 players"), 400
        for p in players:
            row = _get_or_create(p["player_id"], p.get("username", ""))
            row.draws += 1
        db.session.commit()
        return jsonify(status="recorded", type="draw"), 201

    winner_id = data.get("winner_id")
    loser_id = data.get("loser_id")
    if not winner_id or not loser_id:
        return jsonify(error="winner_id and loser_id are required"), 400

    winner = _get_or_create(winner_id, data.get("winner_username", ""))
    loser = _get_or_create(loser_id, data.get("loser_username", ""))
    winner.wins += 1
    loser.losses += 1
    db.session.commit()

    return jsonify(status="recorded", type="win", winner=winner.to_dict(), loser=loser.to_dict()), 201


@app.get("/stats/player/<player_id>")
def get_player_stats(player_id):
    row = db.session.get(PlayerStats, player_id)
    if not row:
        return jsonify(error="no stats for this player yet"), 404
    return jsonify(row.to_dict()), 200


@app.get("/stats/leaderboard")
def leaderboard():
    limit = request.args.get("limit", default=10, type=int)
    rows = PlayerStats.query.order_by(PlayerStats.wins.desc(), PlayerStats.draws.desc()).limit(limit).all()
    return jsonify([r.to_dict() for r in rows]), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5003))
    app.run(host="0.0.0.0", port=port)
