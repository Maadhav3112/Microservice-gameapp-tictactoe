# Tic-Tac-Toe Online — Microservices Demo

A multiplayer Tic-Tac-Toe game built as four independent Python
microservices, a React + Tailwind frontend, Docker + Kubernetes
deployment configs, and a Jenkins CI/CD pipeline.

## Architecture

```
                        ┌─────────────────┐
                        │    Frontend     │  React + Tailwind
                        │  (Nginx :80)    │  served by Nginx, which also
                        └────────┬────────┘  proxies /api/* to services
                                 │
        ┌────────────┬──────────┼───────────┬────────────┐
        │            │          │           │            │
   /api/player  /api/match  /api/game   /api/stats        │
        │            │          │           │            │
        ▼            ▼          ▼           ▼            │
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│Player Service│ │  Match   │ │  Game    │ │ Stats Service│
│  (Flask)     │ │ Service  │ │ Service  │ │  (Flask)     │
│  :5002       │ │ (Flask)  │ │ (Flask)  │ │  :5003       │
│ in-memory    │ │  :5000   │ │  :5001   │ │      │       │
└──────────────┘ └────┬─────┘ └──────────┘ └──────┼───────┘
                       │ creates games via              │
                       └──────────► Game Service         ▼
                                                    ┌──────────┐
                                                    │  MySQL   │
                                                    └──────────┘
```

| Service | Responsibility | Port | Storage |
|---|---|---|---|
| `player-service` | Create/lookup usernames & profiles | 5002 | in-memory (swap for a DB later) |
| `match-service` | Queue + pair players, ask Game Service to start games | 5000 | in-memory |
| `game-service` | Board state, move validation, win/draw detection | 5001 | in-memory |
| `stats-service` | Win/loss/draw history + leaderboard | 5003 | **MySQL** |

Each service is a small, independent Flask app with a `/health`
endpoint, its own `requirements.txt`, `Dockerfile`, and `tests/`
folder — so you can build, test, and deploy them separately.

## Repo layout

```
services/
  game-service/    (app.py, requirements.txt, Dockerfile, tests/)
  player-service/  (same layout)
  match-service/   (same layout)
  stats-service/   (same layout, MySQL via SQLAlchemy)
frontend/          (React + Vite + Tailwind, served by Nginx)
k8s/               (Kubernetes manifests, apply in numeric order)
docker-compose.yml (local dev, spins up everything + MySQL)
Jenkinsfile        (CI/CD: checkout -> pytest -> SonarQube -> build & push)
```

## Run it locally with Docker Compose

This is the fastest way to try the whole thing:

```bash
docker compose up --build
```

Then open **http://localhost:3000**. Open it in a second browser tab
(or incognito window) to simulate a second player and get matched.

Individual services are also reachable directly while developing:
- Player service: http://localhost:5002/health
- Match service: http://localhost:5000/health
- Game service: http://localhost:5001/health
- Stats service: http://localhost:5003/health
- MySQL: localhost:3306 (user `ttt_user` / password `ttt_password` / db `ttt_stats`)

## Run a single service without Docker

Every service follows the same pattern:

```bash
cd services/game-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py          # starts on the port in requirements/app.py
```

Run its tests the same way:

```bash
python -m pytest tests/ -v
```

## Frontend development

```bash
cd frontend
npm install
npm run dev
```

This starts Vite's dev server on **http://localhost:5173** and proxies
`/api/*` calls to services running on `localhost` (see
`vite.config.js`). Start the four backend services first (or via
`docker compose up player-service match-service game-service
stats-service`).

## Deploying to Kubernetes

1. Build and push images (or let the Jenkins pipeline do it):
   ```bash
   docker build -t YOUR_REGISTRY/tictactoe-game-service:latest services/game-service
   docker push YOUR_REGISTRY/tictactoe-game-service:latest
   # ...repeat for player-service, match-service, stats-service, frontend
   ```
2. Edit every `image: YOUR_REGISTRY/...` line in `k8s/*.yaml` to point
   at your real registry.
3. Apply the manifests in order:
   ```bash
   kubectl apply -f k8s/00-namespace.yaml
   kubectl apply -f k8s/01-mysql-secret.yaml
   kubectl apply -f k8s/02-mysql.yaml
   kubectl apply -f k8s/10-game-service.yaml
   kubectl apply -f k8s/11-player-service.yaml
   kubectl apply -f k8s/12-match-service.yaml
   kubectl apply -f k8s/13-stats-service.yaml
   kubectl apply -f k8s/20-frontend.yaml
   ```
4. Check everything is healthy:
   ```bash
   kubectl -n tictactoe get pods
   kubectl -n tictactoe get svc
   ```
5. If you have an Ingress controller (e.g. `ingress-nginx`) installed,
   point your `/etc/hosts` (or real DNS) at your cluster's ingress IP
   for the `tictactoe.local` host in `k8s/20-frontend.yaml`, or change
   it to your real domain.

> ⚠️ The `k8s/01-mysql-secret.yaml` file contains example base64
> "secrets" for demo purposes only. In a real deployment, create
> secrets out-of-band (`kubectl create secret ...`) rather than
> committing them to source control.

## CI/CD with Jenkins

The included `Jenkinsfile` defines four stages:

1. **Checkout** — pulls the repo.
2. **Run Tests (pytest)** — creates a virtualenv per service and runs
   its test suite.
3. **SonarQube Scan** — static analysis via `sonar-scanner`, followed
   by a Quality Gate check.
4. **Docker Build & Push** — builds and pushes an image per service
   (plus the frontend) to your registry, tagged with the Jenkins build
   number and `latest`.

Before running the pipeline, configure in Jenkins:
- Credentials: `docker-registry-creds` (username/password) and a
  SonarQube server named `MySonarQube` with a token.
- The `SERVICES` and `REGISTRY` environment variables at the top of
  the `Jenkinsfile` (edit `REGISTRY` to your own registry path).

## How a game flows end-to-end

1. Frontend calls `player-service` to create/fetch a player by
   username.
2. Frontend asks `match-service` to join the matchmaking queue.
3. Once two players are queued, `match-service` calls `game-service`
   to create a new game, and returns a `match` object (with a
   `game_id`) to both players.
4. The frontend polls `game-service` for board state and posts moves
   to it.
5. When a game finishes (win or draw), the frontend calls
   `stats-service` to record the result, and the leaderboard refreshes.

## Extending this for real production use

This project is intentionally simple and beginner-friendly. Before
running it for real users, consider:
- Persisting `player-service`, `match-service`, and `game-service`
  state to a real database or Redis (currently in-memory, so state is
  lost on pod restart and won't work correctly with >1 replica per
  service without shared storage).
- Adding authentication (players can currently claim any username).
- Replacing HTTP polling with WebSockets for real-time moves.
- Adding resource-based autoscaling (`HorizontalPodAutoscaler`) in
  Kubernetes.
- Rotating the MySQL secret via a proper secrets manager.
