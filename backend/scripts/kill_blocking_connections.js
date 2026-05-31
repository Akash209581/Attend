const { pool } = require('../db');

async function killBlocking() {
    try {
        console.log('Finding PIDs to terminate...');
        // Find PIDs in 'idle in transaction' or holding locks
        const res = await pool.query(`
            SELECT pid, state, query 
            FROM pg_stat_activity 
            WHERE (state = 'idle in transaction' OR state = 'active') 
              AND query NOT LIKE '%pg_terminate_backend%'
              AND pid != pg_backend_pid();
        `);

        for (const row of res.rows) {
            console.log(`Terminating PID ${row.pid} (State: ${row.state}, Query: ${row.query.substring(0, 100).replace(/\n/g, ' ')})`);
            await pool.query('SELECT pg_terminate_backend($1)', [row.pid]);
        }
        console.log('✅ All blocking backends terminated');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

killBlocking();
