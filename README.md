How to run locally

Prerequisites

Git

Java 21+

Node.js 18+

MySQL 8+

1. Clone

git clone https://github.com/karl2603/ppw-production-entry.git
cd ppw-production-entry

2. Database

Create the MySQL database:

CREATE DATABASE apexflow_production;

Update the local MySQL username and password in:

ppw-production-entry/src/main/resources/application.yml

3. Run backend

Windows:

cd ppw-production-entry
.\mvnw.cmd spring-boot:run

macOS/Linux:

cd ppw-production-entry
./mvnw spring-boot:run

Backend:

http://localhost:8080

4. Run frontend

Open a second terminal:

cd frontend
npm install
npm run dev

Frontend:

http://localhost:5173

Seeded login credentials

Role

Username

Password

Operator

operator1

Operator@123

Operator

operator2

Operator@123

Supervisor

supervisor1

Supervisor@123

Supervisor

supervisor2

Supervisor@123

Manager

manager1

Manager@123

Manager

manager2

Manager@123