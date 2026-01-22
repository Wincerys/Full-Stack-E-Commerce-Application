# Deployment Documentation

## Overview

This document provides instructions for deploying the RMIT COSC2299 SEPT Major Project application. The application consists of a Spring Boot backend with an embedded React frontend, using MySQL as the database.

## Prerequisites

- Java 17 or higher
- Apache Maven 3.6+
- Node.js 20+ (for frontend development)
- Docker and Docker Compose (for containerized deployment)
- Kubernetes cluster (for K8s deployment)

## Local Development

### Running the Application

1. Ensure Java 17 and Maven are installed.

2. Clone the repository:
   ```bash
   git clone https://github.com/cosc2299-2025/team-project-group-p03-08.git
   cd team-project-group-p03-08
   ```

3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

4. Open your browser to http://localhost:8080

The Maven build will automatically install Node.js, build the frontend, and start the server.

### Database

By default, the application uses H2 in-memory database for development. For production-like setup, configure MySQL.

## Docker Deployment

### Using Docker Compose

1. Ensure Docker and Docker Compose are installed.

2. Set environment variables (optional, defaults provided):
   ```bash
   export MYSQL_ROOT_PASSWORD=abc
   export MYSQL_DATABASE=eventsdb
   export MYSQL_USER=events
   export MYSQL_PASSWORD=abc
   export MYSQL_PORT=3306
   export APP_PORT=8080
   export ADMINER_PORT=8081
   ```

3. Run the application:
   ```bash
   cd docker
   docker-compose up --build
   ```

4. Access the application at http://localhost:8080

5. Access Adminer (database management) at http://localhost:8081

### Building Docker Image Manually

1. Build the image:
   ```bash
   docker build -t events-app .
   ```

2. Run with MySQL:
   ```bash
   docker run --name mysql -e MYSQL_ROOT_PASSWORD=abc -e MYSQL_DATABASE=eventsdb -e MYSQL_USER=events -e MYSQL_PASSWORD=abc -p 3306:3306 -d mysql:8.4
   docker run --name events-app -p 8080:8080 --link mysql:mysql -e SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/eventsdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC -e SPRING_DATASOURCE_USERNAME=events -e SPRING_DATASOURCE_PASSWORD=abc -d events-app
   ```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (e.g., Minikube, EKS, GKE)
- kubectl configured

### Deploying to Kubernetes

1. Build and push the Docker image:
   ```bash
   docker build -t your-registry/events-app:latest .
   docker push your-registry/events-app:latest
   ```

2. Update the image in k8s/app-deployment.yaml if necessary.

3. Apply the Kubernetes manifests:
   ```bash
   kubectl apply -f k8s/
   ```

4. Check deployment status:
   ```bash
   kubectl get pods
   kubectl get services
   kubectl get ingress
   ```

5. Access the application via the ingress host (events.local by default).

### Configuration

- ConfigMap: k8s/configmap.yaml
- MySQL Deployment: k8s/mysql-deployment.yaml
- App Deployment: k8s/app-deployment.yaml
- Ingress: k8s/ingress.yaml
- Persistent Volume Claim: k8s/mysql-pvc.yaml

## Production Considerations

- Configure proper database credentials
- Set up SSL/TLS
- Configure ingress with proper domain
- Set up monitoring and logging
- Use secrets for sensitive data
- Scale replicas as needed

## Troubleshooting

- Ensure ports are not in use
- Check logs: `docker logs <container>` or `kubectl logs <pod>`
- Verify database connectivity
- For K8s, ensure ingress controller is installed (e.g., NGINX Ingress)
