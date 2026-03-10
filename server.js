const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const pool = require('./database');
const initDB = require('./init-db');
const {
  patientValidationRules,
  patientUpdateRules,
  validate
} = require('./validators');

const app = express();

app.use(cors());
app.use(express.json());

const formatResponse = (data = null, error = null) => ({ data, error });

const ALLOWED_UPDATE_FIELDS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'sex',
  'phone_number',
  'email',
  'address_line_1',
  'address_line_2',
  'city',
  'state',
  'zip_code',
  'insurance_provider',
  'insurance_member_id',
  'preferred_language',
  'emergency_contact_name',
  'emergency_contact_phone'
];

function normalizePhoneNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const digits = String(value).replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }

  return digits;
}

async function updatePatientHandler(req, res) {
  try {
    const requestEntries = Object.entries(req.body).filter(([key]) =>
      ALLOWED_UPDATE_FIELDS.includes(key)
    );

    if (requestEntries.length === 0) {
      return res.status(400).json(formatResponse(null, 'No fields to update'));
    }

    const updates = [];
    const params = [];

    requestEntries.forEach(([key, value], index) => {
      let finalValue = value;

      if (key === 'phone_number' && value !== null) {
        finalValue = normalizePhoneNumber(value);
      }

      updates.push(`${key} = $${index + 1}`);
      params.push(finalValue);
    });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    const sql = `
      UPDATE patients
      SET ${updates.join(', ')}
      WHERE patient_id = $${params.length}
        AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json(formatResponse(null, 'Patient not found'));
    }

    return res.status(200).json(formatResponse(result.rows[0], null));
  } catch (err) {
    return res.status(500).json(formatResponse(null, err.message));
  }
}

/**
 * POST /patients
 * Create a patient
 */
app.post('/patients', patientValidationRules(), validate, async (req, res) => {
  try {
    const patient_id = crypto.randomUUID();

    const {
      first_name,
      last_name,
      date_of_birth,
      sex,
      phone_number,
      email,
      address_line_1,
      address_line_2,
      city,
      state,
      zip_code,
      insurance_provider,
      insurance_member_id,
      preferred_language,
      emergency_contact_name,
      emergency_contact_phone
    } = req.body;

    const normalizedPhoneNumber = normalizePhoneNumber(phone_number);

    const sql = `
      INSERT INTO patients (
        patient_id,
        first_name,
        last_name,
        date_of_birth,
        sex,
        phone_number,
        email,
        address_line_1,
        address_line_2,
        city,
        state,
        zip_code,
        insurance_provider,
        insurance_member_id,
        preferred_language,
        emergency_contact_name,
        emergency_contact_phone
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *
    `;

    const params = [
      patient_id,
      first_name,
      last_name,
      date_of_birth,
      sex,
      normalizedPhoneNumber,
      email || null,
      address_line_1,
      address_line_2 || null,
      city,
      state,
      zip_code,
      insurance_provider || null,
      insurance_member_id || null,
      preferred_language || 'English',
      emergency_contact_name || null,
      emergency_contact_phone || null
    ];

    const result = await pool.query(sql, params);
    return res.status(201).json(formatResponse(result.rows[0], null));
  } catch (err) {
    return res.status(500).json(formatResponse(null, err.message));
  }
});

/**
 * GET /patients
 * Query patients by optional filters
 */
app.get('/patients', async (req, res) => {
  try {
    const { last_name, date_of_birth, phone_number } = req.query;

    let sql = `SELECT * FROM patients WHERE deleted_at IS NULL`;
    const params = [];

    if (last_name) {
      params.push(`%${last_name}%`);
      sql += ` AND last_name ILIKE $${params.length}`;
    }

    if (date_of_birth) {
      params.push(date_of_birth);
      sql += ` AND date_of_birth = $${params.length}`;
    }

    if (phone_number) {
      const normalizedPhoneNumber = normalizePhoneNumber(phone_number);
      params.push(normalizedPhoneNumber);
      sql += ` AND phone_number = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await pool.query(sql, params);
    return res.status(200).json(formatResponse(result.rows, null));
  } catch (err) {
    return res.status(500).json(formatResponse(null, err.message));
  }
});

/**
 * GET /patients/by-phone/:phone
 * Fetch the first non-deleted patient with the given phone number
 */
app.get('/patients/by-phone/:phone', async (req, res) => {
  try {
    const normalizedPhoneNumber = normalizePhoneNumber(req.params.phone);

    if (!normalizedPhoneNumber || normalizedPhoneNumber.length !== 10) {
      return res
        .status(400)
        .json(formatResponse(null, 'Phone number must be a valid 10-digit U.S. number'));
    }

    const result = await pool.query(
      `
      SELECT *
      FROM patients
      WHERE phone_number = $1
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [normalizedPhoneNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(formatResponse(null, 'Patient not found'));
    }

    return res.status(200).json(formatResponse(result.rows[0], null));
  } catch (err) {
    return res.status(500).json(formatResponse(null, err.message));
  }
});

/**
 * GET /patients/:id
 * Get one patient by ID
 */
app.get('/patients/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM patients WHERE patient_id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(formatResponse(null, 'Patient not found'));
    }

    return res.status(200).json(formatResponse(result.rows[0], null));
  } catch (err) {
    return res.status(500).json(formatResponse(null, err.message));
  }
});

/**
 * PUT /patients/:id
 * Partial update
 */
app.put('/patients/:id', patientUpdateRules(), validate, updatePatientHandler);

/**
 * PATCH /patients/:id
 * Partial update
 */
app.patch('/patients/:id', patientUpdateRules(), validate, updatePatientHandler);

/**
 * DELETE /patients/:id
 * Soft delete
 */
app.delete('/patients/:id', async (req, res) => {
  try {
    const sql = `
      UPDATE patients
      SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $1
        AND deleted_at IS NULL
      RETURNING patient_id
    `;

    const result = await pool.query(sql, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json(formatResponse(null, 'Patient not found'));
    }

    return res.status(200).json(
      formatResponse({ message: 'Patient soft-deleted successfully' }, null)
    );
  } catch (err) {
    return res.status(500).json(formatResponse(null, err.message));
  }
});

/**
 * Health check
 */
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();