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
- **Academic Staff Portal**: Dedicated dashboard and profile management for academic staff.
- **Security**: Stateless JWT-based authentication with fine-grained access control.
- **Robust Logging**: Comprehensive logging for login/logout events across all roles.
- **Optimized Deployment**: Multi-stage Docker builds and resource-tuned configurations for efficient performance.
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

## 🤝 Contributing

1. Clone the repository.
2. Create a feature branch from `develop`.
3. Submit a Pull Request.

---
Developed by **myduyen2004**
