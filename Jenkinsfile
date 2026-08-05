pipeline {
    agent any

    environment {
        REGISTRY = "YOUR_REGISTRY"   // e.g. docker.io/yourusername
        SERVICES = "game-service player-service match-service stats-service"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                script {
                    for (svc in env.SERVICES.split(' ')) {
                        sh """
                            cd services/${svc}
                            python3 -m venv .venv
                            . .venv/bin/activate
                            pip install -r requirements.txt
                            python -m pytest tests/
                        """
                    }
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                withSonarQubeEnv('MySonarQube') {
                    sh "sonar-scanner -Dsonar.projectKey=tictactoe-microservices -Dsonar.sources=services,frontend/src"
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    for (svc in env.SERVICES.split(' ')) {
                        sh """
                            docker build -t ${REGISTRY}/tictactoe-${svc}:latest services/${svc}
                            docker push ${REGISTRY}/tictactoe-${svc}:latest
                        """
                    }
                    sh """
                        docker build -t ${REGISTRY}/tictactoe-frontend:latest frontend
                        docker push ${REGISTRY}/tictactoe-frontend:latest
                    """
                }
            }
        }
    }
}