const { Pool, types } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Return DATE columns as YYYY-MM-DD strings to prevent timezone shifts
types.setTypeParser(1082, (val) => val);

// Local PostgreSQL (Docker on same server) — no timeout issues
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Execute a SQL query with optional parameters.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for transactions.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
