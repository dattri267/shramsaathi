ShramSaathi

AI-enabled labour cooperative service marketplace for fast, fair, and reliable access to verified workers.

ShramSaathi is a full-stack service marketplace designed around customers, workers, and cooperative administrators. Customers can discover and request local services, workers can create verified professional profiles and receive jobs, and administrators can verify workers and manage platform intelligence.

The platform combines a conventional service marketplace with emergency worker matching, geospatial services, Redis-based location handling, AI-assisted pricing, demand intelligence, and a PySpark analytics pipeline.

Table of Contents

Project Overview

Problem Statement

Solution

Key Features

System Architecture

Technology Stack

Repository Structure

Core Workflows

AI and Data Intelligence

Prerequisites

Environment Configuration

Database Setup

Backend Setup

Mobile Application Setup

AI Engine Setup

Spark Analytics Setup

Running the Complete System

API Overview

Security and Verification

Pricing and Revenue Model

Troubleshooting

Development Notes

Future Enhancements

Project Status

Project Overview

ShramSaathi is a digital platform for connecting customers with skilled and verified workers.

Supported service areas include:

Electrician

Plumber

Carpenter

Painter

Domestic Helper

Caregiver

Technician

Elder Care

Child Care

The application supports both normal bookings and emergency bookings.

High-level flow

Customer
   |
   v
Select Service
   |
   +---- Normal Booking
   |
   +---- Emergency Booking
              |
              v
       Nearby Worker Matching
              |
              v
        Worker Accepts
              |
              v
         Service Started
              |
              v
        Service Completed
              |
              v
            Payment
              |
              v
            Rating

The intelligence layer operates alongside the marketplace:

Demand Data
    |
    v
Apache Spark / PySpark
    |
    v
Demand Analytics
    |
    v
Machine Learning
    |
    +---- Demand Intelligence
    |
    +---- Fair Price Prediction

Problem Statement

Traditional local labour/service discovery can suffer from:

Difficulty finding reliable workers quickly

Lack of worker verification

Unclear or inconsistent pricing

Limited visibility into worker availability

Slow response during emergencies

Lack of structured worker profiles

Poor visibility of worker movement after assignment

Limited data-driven demand planning

Weak mechanisms for worker welfare and fair revenue distribution

ShramSaathi addresses these problems through a unified digital platform.

Solution

Customer

Customers can:

Create an account

Maintain a profile and service address

Select a required service

Request normal or emergency service

Receive an assigned worker

View the latest worker location for supported emergency jobs

Complete payment

Rate the worker

Raise disputes when required

Worker

Workers can:

Create an account

Build a professional profile

Select primary and additional skills

Add experience and availability

Provide service radius and service location

Upload verification documents

Receive booking requests

Accept or reject jobs

Start and complete services

Share location during an active emergency booking

View work and earning information

Administrator

Administrators can:

Review worker registrations

Verify submitted worker information

Approve or reject workers

Suspend workers when necessary

Review marketplace intelligence

Review demand and pricing analytics

Manage platform-level operational information

Key Features

Multi-role Authentication

The platform separates:

Customer

Worker

Administrator

Authentication uses JWT-based sessions and bcrypt password hashing.

Worker Verification

Worker onboarding captures:

Full name

Phone

Profile photo

Bio

Primary skill

Additional skills

Experience

Service radius

Hourly rate

Working days/hours

Service address

Coordinates

Verification documents

Worker statuses:

pending_verification
verified
suspended
rejected

Service Marketplace

Customers select database-backed services/skills and request workers according to their requirements.

Normal Booking

Customer -> Service -> Date/Time -> Booking
         -> Worker Assignment -> Accept
         -> Start -> Complete -> Payment -> Rating

Emergency Booking

Emergency service is a major differentiating feature:

Customer
   |
   v
Emergency Request
   |
   v
Eligible Nearby Workers
   |
   v
Offer / Assignment Attempts
   |
   v
Worker Accepts
   |
   v
Live Location
   |
   v
Service

Matching can consider worker verification, availability, service skill, and location.

Live Worker Location

Redis stores recent worker coordinates using keys such as:

worker:location:<workerId>

The worker app can obtain foreground GPS coordinates and send them to the backend. The customer app can request the latest location for an assigned emergency worker.

The MVP uses polling rather than a permanent WebSocket connection.

AI-assisted Pricing

The platform includes a Random Forest regression model for pricing/demand intelligence.

Model inputs include:

City

Service category

Date

Weather

Event context

Current/base price

The backend requests a prediction from the AI engine and uses the suggested price for emergency bookings.

Demand Intelligence

A PySpark pipeline processes demand data and produces:

Total jobs

Average daily jobs

City-wise demand

Category-wise demand

Peak day

Peak month

Allocation insights

The current demand dataset is synthetic and is intended for development/demo purposes.

Payments

The MVP contains payment status and distribution handling for:

Customer payment

Worker share

Welfare share

Platform share

A production payment provider can be integrated later.

Ratings and Disputes

Backend modules support worker ratings/reviews and dispute records.

Cloudinary

Cloudinary is used for media such as:

Avatar/profile images

Worker verification documents

System Architecture

                    +----------------------+
                    |   React Native +     |
                    |        Expo          |
                    | Customer / Worker UI |
                    +----------+-----------+
                               |
                               | REST API
                               v
                    +----------------------+
                    |   Node.js + Express  |
                    |        Port 8000      |
                    +----+--------+----+----+
                         |        |    |
              +----------+        |    +------------+
              v                   v                 v
      +---------------+   +-------------+   +---------------+
      | PostgreSQL    |   |    Redis    |   | FastAPI AI    |
      | + PostGIS     |   |             |   | Engine :8001  |
      |               |   | Location /  |   | Random Forest |
      | Users/Skills/ |   | Matching    |   | Inference     |
      | Bookings/etc. |   |             |   |               |
      +---------------+   +-------------+   +---------------+
              |
              v
      +---------------+
      |  Cloudinary   |
      | Images / Docs |
      +---------------+

Data Intelligence:

Demand Data -> PySpark -> Analytics -> ML Model -> Backend Pricing

Technology Stack

Layer

Technology

Purpose

Mobile

React Native

Cross-platform mobile app

Mobile Runtime

Expo SDK 57

Development/runtime

Language

TypeScript

Type-safe mobile development

Navigation

React Navigation

Screen navigation

Location

Expo Location

GPS services

Backend

Node.js

Server runtime

API

Express 5

REST API

ORM/DB Tooling

Prisma 7

Database access/tooling

Database

PostgreSQL

Relational data

Geospatial

PostGIS

Location queries/data

Cache

Redis

Worker location/matching

Authentication

JWT

API authentication

Password Security

bcrypt

Password hashing

Uploads

Multer

Multipart file handling

Media

Cloudinary

Image/document storage

AI API

FastAPI

ML inference API

ML

scikit-learn

Machine learning

Model

Random Forest Regressor

Price/demand prediction

Data

pandas / NumPy

Data processing

Data Engineering

Apache Spark / PySpark

Demand analytics

Model Serialization

joblib

Model persistence

Repository Structure

A representative structure is:

shramsaathi/
|
+-- MobileApp/
|   +-- src/
|   |   +-- api.ts
|   |   +-- app/
|   |   |   +-- auth/
|   |   |   +-- userdashboard/
|   |   |   +-- worker/
|   |   |   +-- workerdetails/
|   |   |   +-- ...
|   |   +-- components/
|   |   +-- ...
|   +-- app.json
|   +-- package.json
|   +-- ...
|
+-- backend/
|   +-- backend/
|       +-- src/
|       |   +-- controllers/
|       |   +-- routes/
|       |   +-- services/
|       |   +-- middleware/
|       |   +-- config/
|       |   +-- ...
|       +-- prisma/
|       +-- package.json
|       +-- ...
|
+-- admin/
    +-- ai-engine/
        +-- main.py
        +-- model/
        +-- data/
        +-- spark_pipeline.py
        +-- requirements.txt
        +-- spark-requirements.txt
        +-- ...

Core Workflows

Customer Registration

Create Account
      |
      v
Customer Profile
      |
      v
Address / Location
      |
      v
Customer Dashboard

Worker Registration

Create Worker Account
        |
        v
Worker Details
        |
        v
Skills + Experience
        |
        v
Availability + Service Radius
        |
        v
Address + Coordinates
        |
        v
Documents
        |
        v
Admin Verification

Normal Booking

Customer
   |
   v
Select Service
   |
   v
Select Date / Time
   |
   v
Create Booking
   |
   v
Worker Assignment
   |
   v
Worker Accepts
   |
   v
Start Job
   |
   v
Complete Job
   |
   v
Payment
   |
   v
Rating

Emergency Booking

Customer
   |
   v
Emergency Request
   |
   v
AI-assisted Price
   |
   v
Emergency Booking
   |
   v
Nearby Eligible Workers
   |
   v
Worker Accepts
   |
   v
Location Updates
   |
   v
Service Completed

AI and Data Intelligence

Machine Learning Pricing

The FastAPI AI engine provides inference for pricing/demand intelligence.

The backend sends values such as:

{
  "city": "Mumbai",
  "category": "Plumber",
  "date": "2026-09-15",
  "currentPrice": 650,
  "weather": "Clear",
  "events": "Normal day"
}

The model returns a suggested price and model information.

Current development model metadata:

Model: RandomForestRegressor
Model version: 1.0.0-rf
MAE: approximately 10.016
R²: approximately 0.687
Holdout fraction: 0.20

These are development metrics and should be regenerated when the training data or model changes.

Spark Demand Pipeline

The Spark pipeline aggregates demand data for marketplace intelligence.

Current development output has included:

Total jobs: 1,276,491
Average daily jobs: 106.37

Example city totals from the current synthetic dataset:

Mumbai      343,910
Delhi       327,323
Bengaluru   304,998
Hyderabad   300,260

These figures are synthetic development/demo data, not real ShramSaathi production statistics.

Prerequisites

Install:

Node.js

npm

Python 3.x

Java 17

PostgreSQL

PostGIS

Redis

Git

Expo-compatible Android/iOS environment

Recommended:

VS Code

Android Studio

Android emulator or physical Android device

Postman or Insomnia

Environment Configuration

Never commit secrets to Git.

Backend

Typical configuration:

PORT=8000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

JWT_SECRET=replace_with_a_strong_secret

REDIS_URL=redis://127.0.0.1:6379

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

AI_ENGINE_BASE_URL=http://127.0.0.1:8001

Use the exact variable names required by the current backend configuration.

Mobile API

For a physical Android phone, use the development PC's LAN address rather than localhost:

http://<YOUR-LAN-IP>:8000

The phone and PC must normally be connected to the same network.

AI Engine

Default development URL:

http://127.0.0.1:8001

Database Setup

1. Create PostgreSQL Database

Create a database for ShramSaathi.

Enable PostGIS:

CREATE EXTENSION IF NOT EXISTS postgis;

2. Configure DATABASE_URL

Example:

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/shramsaathi"

3. Prisma

From the backend directory:

npm install
npx prisma generate

If using existing migrations:

npx prisma migrate deploy

For a development database where schema synchronization is intended:

npx prisma db push

Use the command matching the repository's migration workflow.

4. Required Skills

The database should contain:

Electrician
Plumber
Carpenter
Painter
Domestic Helper
Caregiver
Technician
Elder Care
Child Care

Elder Care and Child Care require actual database skill records; frontend fallback labels alone are not sufficient for backend profile persistence.

Backend Setup

Open a terminal:

cd backendackend

Install dependencies:

npm install

Generate Prisma client:

npx prisma generate

Start development server:

npm run dev

Backend:

http://localhost:8000

Health check:

GET /health

If the project uses a different script:

npm run

Mobile Application Setup

Open another terminal:

cd MobileApp

Install dependencies:

npm install

Start Expo:

npx expo start

For a clean Metro cache:

npx expo start -c

Run using an Android emulator or physical device.

Physical Android Device

Verify:

Phone and PC are on the same network.

Backend is running.

Mobile API URL points to the PC LAN IP.

Windows Firewall permits port 8000.

Expo can reach the development machine.

AI Engine Setup

Navigate to:

cd admini-engine

Create a virtual environment:

python -m venv venv

Activate:

.env\Scripts\Activate.ps1

Install dependencies:

pip install -r requirements.txt

Start the FastAPI server:

uvicorn main:app --host 0.0.0.0 --port 8001

The AI engine should be available at:

http://127.0.0.1:8001

AI Endpoints

GET  /health
GET  /options
POST /predict

Spark Analytics Setup

The current development environment uses:

Python 3.13.x
Java 17
PySpark 4.0.x

Navigate to:

cd admini-engine

Activate the environment:

.env\Scripts\Activate.ps1

Install Spark requirements:

pip install -r spark-requirements.txt

Verify Java:

java -version

Run the pipeline:

python spark_pipeline.py

The pipeline generates analytics output such as:

data/spark_output.json

For the current development setup, running the Python script directly is preferred over spark-submit unless a standalone Spark distribution is separately configured.

Running the Complete System

Use separate terminals.

Terminal 1 — Redis

Start Redis using the installation appropriate to your operating system.

Terminal 2 — Backend

cd backendackend
npm install
npm run dev

Runs on:

http://localhost:8000

Terminal 3 — AI Engine

cd admini-engine
.env\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8001

Terminal 4 — Spark

cd admini-engine
.env\Scripts\Activate.ps1
python spark_pipeline.py

Terminal 5 — Mobile

cd MobileApp
npx expo start -c

Runtime

React Native / Expo
        |
        v
Node.js + Express :8000
        |
        +------ PostgreSQL + PostGIS
        |
        +------ Redis
        |
        +------ Cloudinary
        |
        +------ FastAPI AI Engine :8001
                         |
                         v
                   ML Model

API Overview

Major backend modules include:

/auth
/api/auth

/api/customer
/api/worker
/api/skills

/api/bookings
/api/emergency

/api/pricing
/api/payments
/api/invoices

/api/location
/api/avatar

/api/ratings
/api/disputes
/api/welfare

Location

Worker location update:

PATCH /api/worker/location

Worker location retrieval:

GET /api/worker/:workerId/location

Pricing

Standard pricing:

POST /api/pricing/calculate

AI-assisted pricing:

POST /api/pricing/predict

The backend remains authoritative for important business rules and emergency booking pricing.

Security and Verification

Authentication

Password
   |
   v
bcrypt
   |
   v
JWT
   |
   v
Authenticated API Request

Role-based access

Customer, worker, and administrator actions are protected according to role.

Worker verification

Worker documents are uploaded for review.

Worker states:

pending_verification
verified
suspended
rejected

The application should not treat an unverified worker as a fully trusted service provider.

Pricing and Revenue Model

The current cooperative-oriented MVP distribution is:

Customer Payment
       |
       +---- 80% -> Worker
       |
       +---- 10% -> Welfare Fund
       |
       +---- 10% -> Platform

Emergency prices can be generated using the AI pricing service.

The backend should remain authoritative rather than trusting a price supplied only by the mobile client.

Troubleshooting

Expo bundling error

Try:

npx expo start -c

Then inspect the exact file/line reported by Babel.

Mobile cannot connect to backend

Do not use localhost on a physical phone.

Use:

http://192.168.x.x:8000

Also check:

Same Wi-Fi/network

Backend is running

Firewall

Correct mobile API URL

AI pricing fails

Check:

http://127.0.0.1:8001/health

and:

AI_ENGINE_BASE_URL=http://127.0.0.1:8001

Live location unavailable

Check:

Redis is running.

Worker granted foreground location permission.

Worker dashboard is active.

Worker has an accepted/active emergency booking.

Backend location endpoint is reachable.

Worker profile ID is being used correctly.

Elder Care / Child Care registration fails

Verify that the database contains real skill rows for:

elder-care
child-care

The backend resolves worker skills against database records.

Prisma errors

Run:

npx prisma generate

Then verify DATABASE_URL, PostgreSQL availability, and database connectivity.

Spark errors

Verify:

python --version
java -version

Expected development configuration:

Python 3.13.x
Java 17
PySpark 4.0.x

Then:

python spark_pipeline.py

Development Notes

Source of Truth

Always use the current repository files as the source of truth. Avoid copying older versions of the same file from previous iterations.

Backend Authority

Business-critical decisions should be enforced on the backend, including:

Worker eligibility

Skill resolution

Booking creation

Emergency pricing

Booking state transitions

Authentication/authorization

Emergency Pricing

The mobile application may display a predicted emergency price before confirmation, but the backend re-evaluates the price when creating the emergency booking.

Location Privacy

Worker location is intended to be temporary operational data. The MVP uses Redis with expiry rather than permanent storage of live GPS coordinates.

Synthetic Data

The current Spark demand dataset is synthetic because the MVP does not have a production history of ShramSaathi bookings. It should be presented as demonstration/development data, not as real marketplace statistics.

Future Enhancements

Real-time Communication

Replace polling with:

WebSockets

Socket.IO

Server-Sent Events

for real-time booking and location updates.

Push Notifications

Add notifications for:

New booking

Emergency request

Worker acceptance

Worker arrival

Booking completion

Payment status

Verification status

Production Payments

Integrate a production payment gateway such as Razorpay.

Advanced Worker Matching

Future matching can combine:

PostGIS distance

Worker reliability

Historical acceptance rate

Current workload

ETA

Service radius

Availability

Demand density

Production ML

Replace synthetic data with anonymized production data and introduce:

Scheduled retraining

Model versioning

Drift monitoring

Feature monitoring

Performance tracking

Advanced Demand Forecasting

The intelligence layer can evolve toward:

Time-series forecasting

City-level forecasts

Service-level forecasts

Worker capacity planning

Staffing recommendations

Cooperative Features

Future releases can expand:

Welfare fund management

Worker benefits

Cooperative governance

Transparent earnings

Worker incentives

Dispute resolution

Project Status

Area

Status

React Native mobile application

Implemented

Customer registration/profile

Implemented

Worker registration/profile

Implemented

Skill management

Implemented

Worker verification workflow

Implemented

Node/Express backend

Implemented

PostgreSQL/PostGIS

Implemented

Redis integration

Implemented

Normal booking

Implemented

Emergency booking

Implemented

Worker accept/reject

Implemented

Worker location service

Implemented

Customer live-location UI

Implemented

AI pricing service

Implemented

Random Forest model

Implemented

Spark demand pipeline

Implemented

Cloudinary uploads

Implemented

Payment workflow

MVP implementation

Ratings

Backend capability

Disputes

Backend capability

Production payment gateway

Future

Production-scale deployment

Future

WebSocket live tracking

Future

Project Architecture at a Glance

Marketplace Layer

Customer
   |
   v
Service
   |
   v
Booking
   |
   v
Worker Matching
   |
   v
Worker
   |
   v
Service
   |
   v
Payment
   |
   v
Rating

Intelligence Layer

Demand Data
   |
   v
PySpark
   |
   v
Demand Analytics
   |
   v
Machine Learning
   |
   v
Price / Demand Intelligence
   |
   v
Marketplace Decisions

ShramSaathi therefore combines verified labour access, emergency response, geospatial matching, cooperative economics, and data-driven marketplace intelligence in a single full-stack platform.

License

Add the project's chosen license before public distribution.

For competition or institutional submissions, retain all required ownership, attribution, and submission-specific information.