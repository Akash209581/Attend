const { query, pool } = require('../db');
const bcrypt = require('bcryptjs');

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node add_admin.js <username> <password> [role=super_admin|restricted_admin]');
        process.exit(1);
    }

    const username = args[0].trim();
    const password = args[1].trim();
    const role = (args[2] || 'super_admin').trim().toLowerCase();

    if (role !== 'super_admin' && role !== 'restricted_admin') {
        console.error('Error: Role must be either "super_admin" or "restricted_admin"');
        process.exit(1);
    }

    try {
        // Check if username exists
        const check = await query('SELECT id FROM admins WHERE username = $1', [username]);
        if (check.rows.length > 0) {
            console.error(`Error: Admin user "${username}" already exists.`);
            process.exit(1);
        }

        const hash = await bcrypt.hash(password, 8);
        await query(
            'INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, $3)',
            [username, hash, role]
        );
        console.log(`\n✅ Admin user "${username}" successfully created with role "${role}".`);
    } catch (err) {
        console.error('Database error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
