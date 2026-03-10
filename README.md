# Patient Registration API

A **Node.js + Express REST API** for managing patient records.
This service provides endpoints for **creating, retrieving, updating, and soft-deleting patients**, along with strict validation and a PostgreSQL database backend.

The API was designed for systems such as **voice AI registration agents, telephony intake systems, or healthcare registration portals** where structured patient demographic information must be stored and queried.

The service is **deployed on Render** and connects to a **PostgreSQL database** using the `pg` library.

---

# Features

* Create patient records
* Query patients with filters
* Retrieve patient by ID
* Retrieve patient by phone number
* Partial updates (PUT / PATCH)
* Soft delete patients
* Input validation using `express-validator`
* Automatic database initialization
* Health check endpoint
* Secure PostgreSQL connection (SSL)

---

# Tech Stack

| Technology        | Purpose               |
| ----------------- | --------------------- |
| Node.js           | Backend runtime       |
| Express.js        | REST API framework    |
| PostgreSQL        | Database              |
| pg                | PostgreSQL client     |
| express-validator | Request validation    |
| Render            | Cloud hosting         |
| CORS              | Cross-origin requests |
| crypto.randomUUID | Unique patient IDs    |

---

# Project Structure

```
project-root
│
├── server.js
├── database.js
├── init-db.js
├── validators.js
├── package.json
└── README.md
```

---

# Environment Variables

The API requires a PostgreSQL connection string.

```
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
```

On **Render**, `DATABASE_URL` is automatically provided when linking a PostgreSQL service.

---

# Installation (Local Development)

### 1 Install dependencies

```
npm install
```

### 2 Configure environment variables

Create a `.env` file:

```
DATABASE_URL=your_postgres_connection_string
PORT=3000
```

### 3 Run the server

```
node server.js
```

Server will start on:

```
http://localhost:3000
```

---

# Deployment (Render)

The project is deployed on **Render** as a Node web service.

### Deployment Steps

1. Push the repository to GitHub
2. Create a new **Web Service** on Render
3. Connect the GitHub repository
4. Set the start command:

```
node server.js
```

5. Add environment variable:

```
DATABASE_URL
```

6. Deploy

Render automatically builds and runs the server.

---

# Database Initialization

When the server starts, it calls:

```
initDB()
```

This ensures the `patients` table exists.

### Table Schema

| Column                  | Type      | Description        |
| ----------------------- | --------- | ------------------ |
| patient_id              | UUID      | Unique identifier  |
| first_name              | TEXT      | Patient first name |
| last_name               | TEXT      | Patient last name  |
| date_of_birth           | TEXT      | Format MM/DD/YYYY  |
| sex                     | TEXT      | Gender             |
| phone_number            | TEXT      | 10-digit US number |
| email                   | TEXT      | Optional email     |
| address_line_1          | TEXT      | Primary address    |
| address_line_2          | TEXT      | Secondary address  |
| city                    | TEXT      | City               |
| state                   | TEXT      | 2-letter US state  |
| zip_code                | TEXT      | ZIP code           |
| insurance_provider      | TEXT      | Optional           |
| insurance_member_id     | TEXT      | Optional           |
| preferred_language      | TEXT      | Default English    |
| emergency_contact_name  | TEXT      | Optional           |
| emergency_contact_phone | TEXT      | Optional           |
| created_at              | TIMESTAMP | Record creation    |
| updated_at              | TIMESTAMP | Last update        |
| deleted_at              | TIMESTAMP | Soft delete marker |

---

# API Response Format

All endpoints return responses in a **consistent envelope format**:

```
{
  "data": ...,
  "error": null
}
```

Example error:

```
{
  "data": null,
  "error": "phone_number: Must be a valid 10-digit U.S. phone number"
}
```

---

# Phone Number Normalization

Phone numbers are normalized to **10-digit format**.

Examples:

```
+1 (415) 555-1234 → 4155551234
14155551234 → 4155551234
415-555-1234 → 4155551234
```

This ensures consistent storage and querying.

---

# API Endpoints

---

# Create Patient

```
POST /patients
```

Creates a new patient record.

### Example Request

```
POST /patients
Content-Type: application/json
```

```
{
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "03/15/1990",
  "sex": "Male",
  "phone_number": "4155551234",
  "email": "john@example.com",
  "address_line_1": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94107"
}
```

### Response

```
201 Created
```

```
{
  "data": { patient object },
  "error": null
}
```

---

# Query Patients

```
GET /patients
```

Optional filters:

| Query         | Description   |
| ------------- | ------------- |
| last_name     | Partial match |
| date_of_birth | Exact DOB     |
| phone_number  | Exact phone   |

Example:

```
GET /patients?last_name=smith
```

---

# Get Patient by ID

```
GET /patients/:id
```

Example:

```
GET /patients/uuid
```

Returns the specific patient record.

---

# Get Patient by Phone

```
GET /patients/by-phone/:phone
```

Returns the **first matching patient** with that phone number.

Example:

```
GET /patients/by-phone/4155551234
```

---

# Update Patient

```
PUT /patients/:id
PATCH /patients/:id
```

Supports **partial updates**.

Example:

```
PATCH /patients/{id}
```

```
{
  "phone_number": "6505558888",
  "city": "San Jose"
}
```

---

# Delete Patient (Soft Delete)

```
DELETE /patients/:id
```

Instead of removing the record permanently, the API sets:

```
deleted_at = CURRENT_TIMESTAMP
```

Deleted patients are automatically excluded from queries.

---

# Health Check

```
GET /health
```

Used by deployment platforms to verify service availability.

Example response:

```
{
  "status": "ok"
}
```

---

# Validation System

Validation is implemented using **express-validator**.

File:

```
validators.js
```

Key validation rules include:

### Identity

* first_name / last_name

  * 1–50 characters
  * alphabetic characters, hyphens, apostrophes

### Date of Birth

* Must follow:

```
MM/DD/YYYY
```

* Cannot be a **future date**

### Phone Numbers

Must be:

```
10-digit US format
```

### State

Must be a **2-letter uppercase state code**

Example:

```
CA
TX
NY
```

### ZIP Code

Supports:

```
94107
94107-1234
```

---

# Partial Update Validation

For updates:

```
PUT /patients/:id
PATCH /patients/:id
```

All validation rules are reused but **fields become optional**, allowing partial updates.

---

# Error Handling

Validation errors return:

```
422 Unprocessable Entity
```

Example:

```
{
  "data": null,
  "error": "first_name: Must be 1-50 characters | phone_number: Must be a valid 10-digit U.S. phone number"
}
```

Server errors return:

```
500 Internal Server Error
```

---

# Security and Data Integrity

The API uses several best practices:

* Parameterized SQL queries (prevents SQL injection)
* Strict input validation
* Soft deletes instead of permanent removal
* UUID identifiers
* Database SSL connections

---

# Use Cases

This API is designed for systems such as:

* Voice AI patient intake agents
* Telehealth platforms
* Clinic registration systems
* Appointment scheduling backends
* Healthcare CRM systems

---

# Future Improvements

Possible extensions:

* Authentication / API keys
* Pagination for patient queries
* Full-text search
* Audit logs
* Rate limiting
* HIPAA compliant logging
* Insurance verification integrations

---

If you want, I can also make a **much stronger “impressive recruiter-ready README”** (with architecture diagrams, request flow, and sequence diagrams) that makes the repo look like a **senior-level backend project**, which would help a lot for AI/voice engineering roles.
