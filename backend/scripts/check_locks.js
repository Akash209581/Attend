const { pool } = require('../db');

async function checkLocks() {
    try {
        console.log('--- Active Queries ---');
        const resQueries = await pool.query(`
            SELECT pid, query, state, wait_event_type, wait_event, query_start
            FROM pg_stat_activity 
            WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';
        `);
        resQueries.rows.forEach(r => {
            console.log(`PID: ${r.pid}, State: ${r.state}, WaitType: ${r.wait_event_type}, WaitEvent: ${r.wait_event}, Query: ${r.query.substring(0, 150).replace(/\n/g, ' ')}`);
        });

        console.log('--- Lock Status ---');
        const resLocks = await pool.query(`
            SELECT 
                blocked_locks.pid     AS blocked_pid,
                blocked_activity.query    AS blocked_statement,
                blocking_locks.pid    AS blocking_pid,
                blocking_activity.query   AS blocking_statement
            FROM  pg_catalog.pg_locks         blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks         blocking_locks 
                ON blocking_locks.locktype = blocked_locks.locktype
                AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
                AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted;
        `);
        resLocks.rows.forEach(r => {
            console.log(`Blocked PID: ${r.blocked_pid}, Blocked Statement: ${r.blocked_statement.substring(0, 80).replace(/\n/g, ' ')}`);
            console.log(`Blocking PID: ${r.blocking_pid}, Blocking Statement: ${r.blocking_statement.substring(0, 80).replace(/\n/g, ' ')}`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkLocks();
