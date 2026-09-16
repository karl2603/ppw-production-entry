# PPW Production Entry System

A production entry management system built with Spring Boot, React, and MySQL.

## How to Run Locally

### Prerequisites

Make sure the following are installed on your system:

* Git
* Java 21+
* Node.js 18+
* MySQL 8+

---

## 1. Clone the Repository

```bash
git clone https://github.com/karl2603/ppw-production-entry.git
cd ppw-production-entry
```

---

## 2. Database Setup

Create the MySQL database:

```sql
CREATE DATABASE apexflow_production;
```

Update your local MySQL username and password in:

```text
src/main/resources/application.yml
```

Example:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/apexflow_production
    username: your_username
    password: your_password
```

---

## 3. Run the Backend

### Windows

```bash
.\mvnw.cmd spring-boot:run
```

### macOS / Linux

```bash
./mvnw spring-boot:run
```

The backend will be available at:

```text
http://localhost:8080
```

---

## 4. Run the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

## Seeded Login Credentials

| Role       | Username      | Password         |
| ---------- | ------------- | ---------------- |
| Operator   | `operator1`   | `Operator@123`   |
| Operator   | `operator2`   | `Operator@123`   |
| Supervisor | `supervisor1` | `Supervisor@123` |
| Supervisor | `supervisor2` | `Supervisor@123` |
| Manager    | `manager1`    | `Manager@123`    |
| Manager    | `manager2`    | `Manager@123`    |

>
