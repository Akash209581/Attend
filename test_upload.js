const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

async function testUpload() {
    // Step 1: Login
    const loginData = JSON.stringify({ username: 'admin', password: 'Naidu@akash867' });
    const loginRes = await makeRequest('POST', 'http://localhost:6000/cseakash/auth/akashisadmin', loginData, { 'Content-Type': 'application/json' });
    const { token } = JSON.parse(loginRes);
    console.log('✅ Admin login successful');

    // Step 2: Upload 3rd year Excel
    const file3rdPath = path.join(__dirname, 'CRT Day wise.xlsx');
    if (!fs.existsSync(file3rdPath)) {
        console.log('❌ 3rd year file not found:', file3rdPath);
        return;
    }

    const boundary = 'FormBoundary' + Math.random().toString(36).substr(2);
    const fileBytes = fs.readFileSync(file3rdPath);
    const fileName = 'CRT Day wise.xlsx';

    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="year"\r\n\r\n3\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="uploadDate"\r\n\r\n2026-05-22\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="section"\r\n\r\nCRT-3RD\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`);

    const header = Buffer.from(parts.join(''));
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileBytes, footer]);

    const uploadRes = await makeRequest('POST', 'http://localhost:6000/cseakash/akashisadmin/upload', body, {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
    });

    const uploadResult = JSON.parse(uploadRes);
    console.log('✅ 3rd Year Upload Result:', uploadResult);

    // Step 3: Upload 4th year Excel
    const file4thPath = path.join(__dirname, '4year.xlsx');
    if (fs.existsSync(file4thPath)) {
        const fileBytes4 = fs.readFileSync(file4thPath);
        const parts4 = [];
        parts4.push(`--${boundary}\r\nContent-Disposition: form-data; name="year"\r\n\r\n4\r\n`);
        parts4.push(`--${boundary}\r\nContent-Disposition: form-data; name="uploadDate"\r\n\r\n2026-05-22\r\n`);
        parts4.push(`--${boundary}\r\nContent-Disposition: form-data; name="section"\r\n\r\nCRT-4TH\r\n`);
        parts4.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="4year.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`);

        const header4 = Buffer.from(parts4.join(''));
        const body4 = Buffer.concat([header4, fileBytes4, footer]);

        const uploadRes4 = await makeRequest('POST', 'http://localhost:6000/cseakash/akashisadmin/upload', body4, {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body4.length,
        });
        const uploadResult4 = JSON.parse(uploadRes4);
        console.log('✅ 4th Year Upload Result:', uploadResult4);
    }

    // Step 4: Get stats
    const statsRes = await makeRequest('GET', 'http://localhost:6000/cseakash/akashisadmin/stats', null, {
        'Authorization': `Bearer ${token}`
    });
    const stats = JSON.parse(statsRes);
    console.log('\n📊 Stats after upload:');
    console.log('  Total students:', stats.totalStudents);
    console.log('  Year stats:', JSON.stringify(stats.yearStats));
    console.log('  Present (≥75%):', stats.present);
    console.log('  Needs attention:', stats.absent);
}

function makeRequest(method, url, body, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname,
            method,
            headers: headers || {},
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    console.error('❌ HTTP Error', res.statusCode, data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                } else {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

testUpload().catch(err => console.error('Test failed:', err.message));
