const { query } = require('./db');

/**
 * Initialize PostgreSQL schema — creates all tables if they don't exist.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
async function initDb() {
    await query(`
        CREATE TABLE IF NOT EXISTS students (
            id SERIAL PRIMARY KEY,
            roll_no VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            section VARCHAR(50),
            year INTEGER DEFAULT 3,
            email VARCHAR(255) DEFAULT '',
            password_hash VARCHAR(255) NOT NULL,
            total_percentage NUMERIC(5,2) DEFAULT 0,
            training VARCHAR(200) DEFAULT '-',
            counseling VARCHAR(200) DEFAULT '-',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS student_subjects (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
            subject VARCHAR(100),
            attended INTEGER,
            total INTEGER,
            percentage NUMERIC(5,2)
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS uploads (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255),
            section VARCHAR(50),
            year INTEGER DEFAULT 3,
            upload_date DATE NOT NULL,
            record_count INTEGER DEFAULT 0,
            uploaded_by VARCHAR(100) DEFAULT 'admin',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS attendance_records (
            id SERIAL PRIMARY KEY,
            roll_no VARCHAR(50) NOT NULL,
            name VARCHAR(255),
            section VARCHAR(50),
            year INTEGER DEFAULT 3,
            upload_date DATE NOT NULL,
            total_percentage NUMERIC(5,2) DEFAULT 0,
            training VARCHAR(200) DEFAULT '-',
            counseling VARCHAR(200) DEFAULT '-',
            upload_batch_id INTEGER REFERENCES uploads(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(roll_no, upload_date)
        );
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS attendance_subjects (
            id SERIAL PRIMARY KEY,
            attendance_id INTEGER REFERENCES attendance_records(id) ON DELETE CASCADE,
            subject VARCHAR(100),
            attended INTEGER,
            total INTEGER,
            percentage NUMERIC(5,2)
        );
    `);

    // Indexes for performance
    await query(`CREATE INDEX IF NOT EXISTS idx_students_roll_no ON students(roll_no);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_roll_date ON attendance_records(roll_no, upload_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(upload_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_year ON attendance_records(year);`);

    console.log('✅ Database schema initialized');
}

module.exports = initDb;
