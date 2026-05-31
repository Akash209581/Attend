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
    max: 300, // limit each IP to 300 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/cseakash/', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 login attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
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
