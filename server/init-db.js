const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default DB to create new one
    password: 'postgres',
    port: 5432,
});

async function init() {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'kechita_portal'");
    if (res.rowCount === 0) {
        console.log("Database 'kechita_portal' not found. Creating...");
        await client.query('CREATE DATABASE kechita_portal');
        console.log("Database created successfully.");
    } else {
        console.log("Database 'kechita_portal' already exists.");
    }
    await client.end();
}

init().catch(err => {
    console.error("Error creating database:", err);
    process.exit(1);
});
