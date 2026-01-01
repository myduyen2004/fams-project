# FAMS - Facial Attendance Management System

FAMS is a comprehensive system designed to manage user attendance and system monitoring using facial recognition and real-time dashboard updates.

## 🚀 Project Overview

The project consists of four main components:
- **Backend**: Spring Boot application (Java 21) handling business logic, security, and WebSocket broadcasting.
- **Frontend**: React application built with Vite and Tailwind CSS for a modern, responsive administrative dashboard.
- **AI Service**: Python-based service for facial recognition and processing.
- **Mobile**: Flutter/Mobile application for end-user interaction.

## 🛠 Tech Stack

- **Backend**: Java 21, Spring Boot 3, Spring Security (JWT), PostgreSQL, Redis, WebSocket (STOMP).
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion.
- **AI**: Python 3.10, OpenCV, MediaPipe, Face Recognition.
- **Infrastructure**: Docker, Docker Compose.

## ⚙️ Setup and Installation

### Prerequisites
- Docker and Docker Compose installed on your machine.

### Running the Application
To start all services simultaneously, run the following command in the root directory:

```bash
docker-compose up -d --build
```

The services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:5000

## 📋 Key Features

- **Real-time Dashboard**: Live updates for online users, access logs, alerts, and system notifications via WebSockets.
- **Security**: Stateless JWT-based authentication with fine-grained access control.
- **Monitoring**: Integrated system logging and alert management.
- **Interactive Map**: Real-time visualization of online users across provinces.

## 📂 Project Structure

```
fams-project/
├── backend/          # Spring Boot source code
├── frontend/         # React source code
├── ai-service/       # Python AI logic
├── mobile/           # Flutter application
└── docker-compose.yml # Infrastructure orchestration
```

## 🗄️ Database Management

### Automated Seeding
For teamwork convenience, the project uses **Spring Boot DataInitializer**. When the database is empty:
- A default admin is created: `admin` / `admin123`.
- Mock dashboard data (Alerts, Logs, Notifications) is automatically inserted.
- This ensures every team member has the same starting environment.

### Manual SQL Access
If you need to run custom SQL or check raw data, use:
```bash
docker exec -it fams-postgres psql -U postgres -d fams_db
```

## 🧪 Testing

### Running Unit Tests
Since the project requires Java 21, the most reliable way to run tests is via Docker to avoid local environment issues:

```bash
docker run --rm -v "${PWD}/backend:/app" -w /app maven:3.9-eclipse-temurin-21-alpine mvn test -Dtest=AuthServiceTest
```
*(Note: Replace `${PWD}` with `%CD%` if using Windows Command Prompt)*

## 🤝 Contributing

1. Clone the repository.
2. Create a feature branch from `develop`.
3. Submit a Pull Request.

---
Developed by **myduyen2004**
