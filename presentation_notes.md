# Edhir: Web Application Firewall (WAF) - Presentation Notes

This document provides a high-level technical overview of the Edhir ecosystem. Use these notes as a reference during your presentation to explain the architecture, the purpose of each component, and the technologies used.

---

## 1. High-Level Architecture
Edhir is a modern, ML-powered Web Application Firewall (WAF). It is designed to sit in front of a user's web application to intercept incoming HTTP traffic, analyze it for malicious payloads (like SQL Injection, XSS, or bot traffic), and block threats before they reach the vulnerable application.

**The Traffic Flow:**
1. A client sends a request.
2. The request hits the **Proxy Service** (Edhir WAF).
3. The Proxy Service checks the request against configured rules and consults the **ML Service** for AI-based threat detection.
4. If the request is malicious, it is blocked (or logged).
5. If the request is safe, the Proxy forwards it to the target application (the **Demo App**).

---

## 2. Technology Stack

> [!TIP]
> Emphasize that the stack is highly scalable, using microservices communicating over standard protocols and message brokers.

- **Frontend (Dashboard):** React.js, TypeScript, Vite. (Vanilla CSS for lightweight, premium styling without heavy frameworks).
- **Core Proxy (WAF):** Java (Spring Boot / Maven). Java provides high throughput and enterprise-grade reliability for inspecting high volumes of network traffic.
- **AI/ML Engine:** Python. Chosen for its rich ecosystem of data science and machine learning libraries.
- **Databases & Messaging:** 
  - **PostgreSQL:** Primary relational database for storing tenant configurations, rules, and traffic logs.
  - **Redis:** In-memory caching for lightning-fast rule lookups and rate limiting.
  - **RabbitMQ:** Message broker for asynchronous communication (e.g., streaming logs from the proxy to the database without slowing down HTTP requests).
- **Infrastructure & Monitoring:** Docker Compose, Prometheus (metrics scraping), and Grafana (visualizing metrics).

---

## 3. Codebase Structure & Folder Breakdown

Here is a breakdown of why the repository is structured the way it is:

### `/dashboard` (The Control Plane)
The React/TypeScript frontend where security administrators log in. 
- **Purpose:** Allows users to generate API keys (Tenant IDs), configure WAF rules, view real-time traffic logs, and monitor blocked attacks. 
- **Key Features:** Uses a modern split-layout authentication screen, communicates with backend APIs to fetch threat data, and uses a dark-mode ready design system.

### `/proxy-service` (The Enforcement Point)
The core Java-based reverse proxy.
- **Purpose:** This is the actual "Firewall." It acts as a sidecar or gateway. It terminates the incoming connection, inspects the headers and body, and decides whether to drop or forward the request.
- **Key Features:** Highly concurrent, communicates with Redis for fast rule checking, and sends asynchronous telemetry data to RabbitMQ.

### `/ml-service` (The Brain)
The Python machine learning backend.
- **Purpose:** Traditional WAFs rely on static regex rules which are easy to bypass. This service uses trained ML models to detect zero-day anomalies and sophisticated attacks that bypass standard rules.
- **Key Features:** Exposes a fast API for the Proxy Service to query when it encounters suspicious, unclassified traffic.

### `/demo-app` (The Target)
A simple backend application used for testing and demonstration.
- **Purpose:** Represents the "customer's application" that we are protecting. When presenting, this is the app you show getting attacked (e.g., via SQL injection) and subsequently protected when Edhir is enabled.

### `/edhir-java-sdk` (The Alternative Integration)
- **Purpose:** While Edhir can run as a standalone proxy (sidecar mode), this SDK allows developers to embed Edhir's protection directly into their own Java application code as a middleware library.

### `/infra` (The Deployment Engine)
Contains the infrastructure-as-code configurations.
- **Purpose:** Houses all the `docker-compose` files (`dev`, `prod`, `ci`) used to spin up the entire microservice ecosystem with a single command. It also contains configurations for Prometheus and Grafana for system health monitoring.
