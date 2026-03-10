const pool = require("./database");

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      patient_id UUID PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      sex TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      address_line_1 TEXT NOT NULL,
      address_line_2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      insurance_provider TEXT,
      insurance_member_id TEXT,
      preferred_language TEXT DEFAULT 'English',
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `);

  console.log("Database initialized");
}

module.exports = initDB;