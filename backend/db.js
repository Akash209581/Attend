const { Pool, neonConfig } = require('@neondatabase/serverless');
const { types } = require('pg');
const ws = require('ws');
const dotenv = require('dotenv');
dotenv.config();

// Return DATE columns as YYYY-MM-DD strings to prevent timezone shifts
types.setTypeParser(1082, (val) => val);

// Use WebSocket transport in Node.js — avoids TCP connection timeouts
// when the server is geographically far from Neon's US-East datacenter.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // No persistent TCP connections — each query opens/closes via WebSocket
    // so no idle timeout, keepAlive, or max-connection tuning needed.
    connectionTimeoutMillis: 15000,
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
