const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;

    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key) process.env[key] = value;
    }
}

loadEnv();

const dbName = process.env.DB_DATABASE || 'kechita_portal';
const client = new Client({
    user: process.env.DB_USERNAME || process.env.USER,
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD || undefined,
    port: Number(process.env.DB_PORT || 5432),
});

async function init() {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
        console.log(`Database '${dbName}' not found. Creating...`);
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log("Database created successfully.");
    } else {
        console.log(`Database '${dbName}' already exists.`);
    }
    await client.end();
}

init().catch(err => {
    console.error("Error creating database:", err);
    process.exit(1);
});
