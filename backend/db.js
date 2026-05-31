const { Pool, types } = require('pg');
// Return DATE columns (OID 1082) as YYYY-MM-DD strings to prevent timezone shifts
types.setTypeParser(1082, (val) => val);
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,                        // Neon free tier: keep connections low
    min: 0,                        // Allow pool to go fully idle
    idleTimeoutMillis: 10000,      // Release idle connections after 10s (before Neon kills them)
    connectionTimeoutMillis: 10000, // 10s timeout for Neon cold starts
    keepAlive: true,               // Prevent silent connection drops
    keepAliveInitialDelayMillis: 10000,
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
