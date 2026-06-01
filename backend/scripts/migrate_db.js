const { Pool, types } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Return DATE columns as YYYY-MM-DD strings to prevent timezone shifts
types.setTypeParser(1082, (val) => val);

const SOURCE_URL = process.env.DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL) {
    console.error('❌ Error: DATABASE_URL (source) is not set in environment or .env file');
    process.exit(1);
}

if (!TARGET_URL) {
    console.error('❌ Error: TARGET_DATABASE_URL (target) environment variable is not set');
    console.error('Usage: TARGET_DATABASE_URL="postgresql://user:pass@host:port/dbname" node scripts/migrate_db.js');
    process.exit(1);
}

if (SOURCE_URL.trim() === TARGET_URL.trim()) {
    console.error('❌ Error: Source and Target database URLs are identical! Migration aborted to prevent data corruption.');
    process.exit(1);
}

const sourcePool = new Pool({
    connectionString: SOURCE_URL,
    max: 2,
    idleTimeoutMillis: 30000,
});

const targetPool = new Pool({
    connectionString: TARGET_URL,
    max: 2,
    idleTimeoutMillis: 30000,
});

// Helper for dynamic batch inserting
async function batchInsert(targetClient, tableName, columns, rows, batchSize = 500) {
    if (rows.length === 0) return;
    
    console.log(`  └─ Inserting ${rows.length} rows into ${tableName}...`);
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];
        let paramIndex = 1;

        for (const row of batch) {
            const rowPlaceholders = [];
            for (const col of columns) {
                rowPlaceholders.push(`$${paramIndex++}`);
                values.push(row[col]);
            }
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const queryText = `INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders.join(', ')}`;
        await targetClient.query(queryText, values);
    }
}

async function migrate() {
    console.log('🚀 Starting One-Shot Database Migration...');
    console.log(`Source: ${SOURCE_URL.split('@')[1] || SOURCE_URL}`);
    console.log(`Target: ${TARGET_URL.split('@')[1] || TARGET_URL}`);

    // 1. Connect and test
    let sourceClient, targetClient;
    try {
        sourceClient = await sourcePool.connect();
        console.log('✅ Connected to Source Database (Neon)');
    } catch (err) {
        console.error('❌ Failed to connect to Source Database:');
        console.error(err);
        process.exit(1);
    }

    try {
        targetClient = await targetPool.connect();
        console.log('✅ Connected to Target Database (Server)');
    } catch (err) {
        console.error('❌ Failed to connect to Target Database:');
        console.error(err);
        if (sourceClient) sourceClient.release();
        process.exit(1);
    }

    try {
        // 2. Initialize schema on target
        console.log('🛠️  Initializing schema on Target Database...');
        
        await targetClient.query(`
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

        await targetClient.query(`
            CREATE TABLE IF NOT EXISTS student_subjects (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                subject VARCHAR(100),
                attended INTEGER,
                total INTEGER,
                percentage NUMERIC(5,2)
            );
        `);

        await targetClient.query(`
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

        await targetClient.query(`
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

        await targetClient.query(`
            CREATE TABLE IF NOT EXISTS attendance_subjects (
                id SERIAL PRIMARY KEY,
                attendance_id INTEGER REFERENCES attendance_records(id) ON DELETE CASCADE,
                subject VARCHAR(100),
                attended INTEGER,
                total INTEGER,
                percentage NUMERIC(5,2)
            );
        `);

        // Create indexes on target
        await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_students_roll_no ON students(roll_no);`);
        await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);`);
        await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_attendance_roll_date ON attendance_records(roll_no, upload_date);`);
        await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(upload_date);`);
        await targetClient.query(`CREATE INDEX IF NOT EXISTS idx_attendance_year ON attendance_records(year);`);
        console.log('✅ Target Database schema and indexes ready');

        // 3. Clear existing data on target (Safe restart)
        console.log('🧹 Clearing target database tables...');
        await targetClient.query(`
            TRUNCATE TABLE 
                attendance_subjects, 
                attendance_records, 
                student_subjects, 
                students, 
                uploads 
            RESTART IDENTITY CASCADE
        `);
        console.log('✅ Target tables truncated and sequences reset');

        // 4. Migrate data table-by-table
        const tables = [
            'uploads',
            'students',
            'student_subjects',
            'attendance_records',
            'attendance_subjects'
        ];

        for (const table of tables) {
            console.log(`📦 Migrating table: ${table}...`);
            
            // Fetch all rows ordered by id to maintain consistency
            const sourceRes = await sourceClient.query(`SELECT * FROM ${table} ORDER BY id ASC`);
            const rows = sourceRes.rows;

            if (rows.length === 0) {
                console.log(`  ⚠️ No data found in source table: ${table}`);
                continue;
            }

            const columns = Object.keys(rows[0]);
            await batchInsert(targetClient, table, columns, rows, 500);
            console.log(`  ✅ Successfully migrated ${rows.length} rows`);
        }

        // 5. Reset primary key sequences on target
        console.log('⚙️  Resetting database primary key sequences...');
        for (const table of tables) {
            await targetClient.query(`
                SELECT setval(
                    pg_get_serial_sequence('${table}', 'id'),
                    coalesce((SELECT max(id) FROM ${table}), 1),
                    coalesce((SELECT max(id) IS NOT NULL FROM ${table}), false)
                )
            `);
        }
        console.log('✅ All auto-increment sequences synchronized');
        console.log('🎉 One-Shot Migration completed successfully!');

    } catch (err) {
        console.error('❌ Fatal error during migration:', err.message);
        console.error(err.stack);
    } finally {
        if (sourceClient) sourceClient.release();
        if (targetClient) targetClient.release();
        await sourcePool.end();
        await targetPool.end();
    }
}

migrate();
