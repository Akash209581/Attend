const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

dotenv.config();

const { pool } = require('./db');
const initDb = require('./initDb');

const app = express();

// Trust nginx reverse proxy — required for express-rate-limit to correctly
// read the client IP from the X-Forwarded-For header set by nginx.
app.set('trust proxy', 1);

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. CORS configuration (Production-ready)
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// 3. Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased limit per key to be safe for multiple requests
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Limit based on Authorization header (JWT) if present, otherwise fall back to IP
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
        }
        return req.ip;
    },
    message: { message: 'Too many requests, please try again after 15 minutes.' }
});
app.use('/cseakash/', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 attempts per account/IP
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Limit based on student rollNo or admin username, otherwise fall back to IP
        const ident = req.body?.rollNo || req.body?.username || req.ip;
        return ident.toString().toLowerCase().trim();
    },
    message: { message: 'Too many login attempts on this account, please try again after 15 minutes.' }
});
app.use('/cseakash/auth/', authLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/cseakash/auth', require('./routes/auth'));
app.use('/cseakash/admin', require('./routes/admin'));
app.use('/cseakash/student', require('./routes/student'));

// Health check
app.get('/cseakash/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
        message: status === 500 && process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message || 'Internal Server Error'
    });
});

// Connect to PostgreSQL and start server
const PORT = process.env.PORT || 6000;

(async () => {
    try {
        // Test connection
        await pool.query('SELECT 1');
        console.log('✅ PostgreSQL (Neon) connected');

        // Initialize schema
        await initDb();

        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'attendanceSuperSecretKey2025') {
            console.warn('\n⚠️  SECURITY WARNING: JWT_SECRET is using a default or weak secret. Please configure a unique, secure JWT_SECRET in your production .env file!\n');
        }

        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        process.exit(1);
    }
})();
