const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Suhati#1205',
    database: process.env.DB_NAME || 'ticket_reservation',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'reservations.json');

const initialSeedData = [
    {
        reservation_id: 1,
        passenger_name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '9876543210',
        journey_date: '2026-10-15',
        source: 'New Delhi',
        destination: 'Mumbai',
        number_of_tickets: 2,
        created_at: '2026-09-29T10:00:00.000Z'
    },
    {
        reservation_id: 2,
        passenger_name: 'Priya Patel',
        email: 'priya.patel@example.com',
        phone: '9812345678',
        journey_date: '2026-10-18',
        source: 'Bengaluru',
        destination: 'Chennai',
        number_of_tickets: 1,
        created_at: '2026-09-29T11:00:00.000Z'
    },
    {
        reservation_id: 3,
        passenger_name: 'Amit Kumar',
        email: 'amit.kumar@example.com',
        phone: '9988776655',
        journey_date: '2026-10-20',
        source: 'Kolkata',
        destination: 'Hyderabad',
        number_of_tickets: 3,
        created_at: '2026-09-29T12:00:00.000Z'
    }
];

// Helper functions for JSON file fallback
function loadFileStorage() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('Could not read reservations.json, resetting to seed data:', e.message);
    }
    saveFileStorage(initialSeedData);
    return [...initialSeedData];
}

function saveFileStorage(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save to reservations.json:', e.message);
    }
}

let inMemoryReservations = loadFileStorage();
let nextInMemoryId = inMemoryReservations.reduce((max, item) => Math.max(max, item.reservation_id || 0), 0) + 1;
let isUsingMySQL = false;
let pool = null;

async function initDB() {
    try {
        // First try to connect without database to ensure database exists
        const rootConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port,
            connectTimeout: 3000
        });

        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConnection.end();

        // Now connect to the database
        pool = mysql.createPool(dbConfig);
        
        // Ensure table exists
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS reservations (
                reservation_id INT AUTO_INCREMENT PRIMARY KEY,
                passenger_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(15) NOT NULL,
                journey_date DATE NOT NULL,
                source VARCHAR(100) NOT NULL,
                destination VARCHAR(100) NOT NULL,
                number_of_tickets INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableSQL);
        
        // Check if table is empty, seed initial data
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM reservations');
        if (rows[0].count === 0) {
            for (const r of initialSeedData) {
                await pool.query(
                    `INSERT INTO reservations (passenger_name, email, phone, journey_date, source, destination, number_of_tickets) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [r.passenger_name, r.email, r.phone, r.journey_date, r.source, r.destination, r.number_of_tickets]
                );
            }
            console.log('✅ Seeded initial reservation records into MySQL database!');
        }

        isUsingMySQL = true;
        console.log(`✅ Successfully connected to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    } catch (err) {
        isUsingMySQL = false;
        console.warn(`\n-------------------------------------------------------------`);
        console.warn(`⚠️ MySQL Connection Status: OFFLINE (${err.message})`);
        console.warn(`💡 Running in Local File Storage Mode (saving to reservations.json).`);
        console.warn(`👉 To connect to MySQL:`);
        console.warn(`   1. Start MySQL Server (e.g. via XAMPP Control Panel or MySQL Service).`);
        console.warn(`   2. Check credentials in .env (DB_HOST, DB_USER, DB_PASSWORD, DB_PORT).`);
        console.warn(`-------------------------------------------------------------\n`);
    }
}

// Data Access Object (DAO) methods matching required CRUD operations

async function getAllReservations(searchQuery = '') {
    if (isUsingMySQL && pool) {
        if (searchQuery) {
            const q = `%${searchQuery.trim()}%`;
            const searchId = parseInt(searchQuery.trim()) || 0;
            const [rows] = await pool.query(
                `SELECT reservation_id, passenger_name, email, phone, DATE_FORMAT(journey_date, '%Y-%m-%d') as journey_date, source, destination, number_of_tickets, created_at 
                 FROM reservations 
                 WHERE reservation_id = ? OR passenger_name LIKE ? OR email LIKE ? OR phone LIKE ? OR source LIKE ? OR destination LIKE ?
                 ORDER BY reservation_id DESC`,
                [searchId, q, q, q, q, q]
            );
            return rows;
        } else {
            const [rows] = await pool.query(
                `SELECT reservation_id, passenger_name, email, phone, DATE_FORMAT(journey_date, '%Y-%m-%d') as journey_date, source, destination, number_of_tickets, created_at 
                 FROM reservations 
                 ORDER BY reservation_id DESC`
            );
            return rows;
        }
    } else {
        let results = [...inMemoryReservations];
        if (searchQuery) {
            const term = searchQuery.trim().toLowerCase();
            results = results.filter(r => 
                r.reservation_id.toString() === term ||
                r.passenger_name.toLowerCase().includes(term) ||
                r.email.toLowerCase().includes(term) ||
                r.phone.includes(term) ||
                r.source.toLowerCase().includes(term) ||
                r.destination.toLowerCase().includes(term)
            );
        }
        results.sort((a, b) => b.reservation_id - a.reservation_id);
        return results;
    }
}

async function getReservationById(id) {
    const resId = parseInt(id);
    if (isUsingMySQL && pool) {
        const [rows] = await pool.query(
            `SELECT reservation_id, passenger_name, email, phone, DATE_FORMAT(journey_date, '%Y-%m-%d') as journey_date, source, destination, number_of_tickets, created_at 
             FROM reservations 
             WHERE reservation_id = ?`,
            [resId]
        );
        return rows[0] || null;
    } else {
        return inMemoryReservations.find(r => r.reservation_id === resId) || null;
    }
}

async function addReservation(data) {
    const { passenger_name, email, phone, journey_date, source, destination, number_of_tickets } = data;
    const tickets = parseInt(number_of_tickets);

    if (isUsingMySQL && pool) {
        const [result] = await pool.query(
            `INSERT INTO reservations (passenger_name, email, phone, journey_date, source, destination, number_of_tickets) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [passenger_name.trim(), email.trim(), phone.trim(), journey_date, source.trim(), destination.trim(), tickets]
        );
        return getReservationById(result.insertId);
    } else {
        const newRecord = {
            reservation_id: nextInMemoryId++,
            passenger_name: passenger_name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            journey_date: journey_date,
            source: source.trim(),
            destination: destination.trim(),
            number_of_tickets: tickets,
            created_at: new Date()
        };
        inMemoryReservations.push(newRecord);
        saveFileStorage(inMemoryReservations);
        return newRecord;
    }
}

async function updateReservation(id, data) {
    const resId = parseInt(id);
    const { passenger_name, email, phone, journey_date, source, destination, number_of_tickets } = data;
    const tickets = parseInt(number_of_tickets);

    if (isUsingMySQL && pool) {
        const [result] = await pool.query(
            `UPDATE reservations 
             SET passenger_name = ?, email = ?, phone = ?, journey_date = ?, source = ?, destination = ?, number_of_tickets = ? 
             WHERE reservation_id = ?`,
            [passenger_name.trim(), email.trim(), phone.trim(), journey_date, source.trim(), destination.trim(), tickets, resId]
        );
        if (result.affectedRows === 0) return null;
        return getReservationById(resId);
    } else {
        const index = inMemoryReservations.findIndex(r => r.reservation_id === resId);
        if (index === -1) return null;

        inMemoryReservations[index] = {
            ...inMemoryReservations[index],
            passenger_name: passenger_name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            journey_date: journey_date,
            source: source.trim(),
            destination: destination.trim(),
            number_of_tickets: tickets
        };
        saveFileStorage(inMemoryReservations);
        return inMemoryReservations[index];
    }
}

async function deleteReservation(id) {
    const resId = parseInt(id);

    if (isUsingMySQL && pool) {
        const [result] = await pool.query(
            `DELETE FROM reservations WHERE reservation_id = ?`,
            [resId]
        );
        return result.affectedRows > 0;
    } else {
        const initialLength = inMemoryReservations.length;
        inMemoryReservations = inMemoryReservations.filter(r => r.reservation_id !== resId);
        const deleted = inMemoryReservations.length < initialLength;
        if (deleted) {
            saveFileStorage(inMemoryReservations);
        }
        return deleted;
    }
}

function getStatus() {
    return {
        isUsingMySQL,
        dbConfig: {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            port: dbConfig.port
        }
    };
}

module.exports = {
    initDB,
    getAllReservations,
    getReservationById,
    addReservation,
    updateReservation,
    deleteReservation,
    getStatus
};
