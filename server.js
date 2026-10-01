const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper Validation Function
function validateReservationInput(data, isUpdate = false) {
    const errors = {};

    // Passenger Name
    if (!data.passenger_name || typeof data.passenger_name !== 'string' || !data.passenger_name.trim()) {
        errors.passenger_name = 'Passenger name is required.';
    } else if (data.passenger_name.trim().length < 2) {
        errors.passenger_name = 'Passenger name must be at least 2 characters.';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(data.passenger_name.trim())) {
        errors.passenger_name = 'Passenger name can only contain letters, spaces, and hyphen/period.';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !data.email.trim()) {
        errors.email = 'Email address is required.';
    } else if (!emailRegex.test(data.email.trim())) {
        errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // Phone
    const cleanPhone = (data.phone || '').toString().trim().replace(/[\s-]/g, '');
    if (!cleanPhone) {
        errors.phone = 'Phone number is required.';
    } else if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        errors.phone = 'Phone number must contain between 10 to 15 digits.';
    }

    // Journey Date
    if (!data.journey_date) {
        errors.journey_date = 'Journey date is required.';
    } else {
        const dateObj = new Date(data.journey_date);
        if (isNaN(dateObj.getTime())) {
            errors.journey_date = 'Invalid journey date format.';
        }
    }

    // Source
    if (!data.source || typeof data.source !== 'string' || !data.source.trim()) {
        errors.source = 'Source location is required.';
    } else if (data.source.trim().length < 2) {
        errors.source = 'Source location must be at least 2 characters.';
    }

    // Destination
    if (!data.destination || typeof data.destination !== 'string' || !data.destination.trim()) {
        errors.destination = 'Destination location is required.';
    } else if (data.destination.trim().length < 2) {
        errors.destination = 'Destination location must be at least 2 characters.';
    }

    // Source vs Destination Check
    if (data.source && data.destination && data.source.trim().toLowerCase() === data.destination.trim().toLowerCase()) {
        errors.destination = 'Destination cannot be the same as Source location.';
    }

    // Number of Tickets
    const numTickets = parseInt(data.number_of_tickets);
    if (isNaN(numTickets) || numTickets < 1) {
        errors.number_of_tickets = 'Number of tickets must be at least 1.';
    } else if (numTickets > 20) {
        errors.number_of_tickets = 'Maximum 20 tickets allowed per reservation.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// REST API Endpoints

// 1. Get DB Connection Health & Status
app.get('/api/status', (req, res) => {
    res.json(db.getStatus());
});

// 2. View All / Search Reservations
app.get('/api/reservations', async (req, res) => {
    try {
        const searchQuery = req.query.search || req.query.q || '';
        const reservations = await db.getAllReservations(searchQuery);
        res.json({
            success: true,
            count: reservations.length,
            data: reservations
        });
    } catch (err) {
        console.error('Error fetching reservations:', err);
        res.status(500).json({ success: false, message: 'Database error while fetching reservations.' });
    }
});

// 3. Search / Get Single Reservation by ID
app.get('/api/reservations/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Reservation ID.' });
        }
        const reservation = await db.getReservationById(id);
        if (!reservation) {
            return res.status(404).json({ success: false, message: `Reservation with ID #${id} not found.` });
        }
        res.json({ success: true, data: reservation });
    } catch (err) {
        console.error('Error fetching reservation by ID:', err);
        res.status(500).json({ success: false, message: 'Database error while searching reservation.' });
    }
});

// 4. Add New Reservation
app.post('/api/reservations', async (req, res) => {
    try {
        const validation = validateReservationInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Input validation failed. Please correct the highlighted errors.',
                errors: validation.errors
            });
        }

        const newReservation = await db.addReservation(req.body);
        res.status(201).json({
            success: true,
            message: `Reservation #${newReservation.reservation_id} created successfully!`,
            data: newReservation
        });
    } catch (err) {
        console.error('Error creating reservation:', err);
        res.status(500).json({ success: false, message: 'Database error while adding reservation.' });
    }
});

// 5. Update Reservation Details
app.put('/api/reservations/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Reservation ID.' });
        }

        const validation = validateReservationInput(req.body, true);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Input validation failed. Please correct the highlighted errors.',
                errors: validation.errors
            });
        }

        const updatedReservation = await db.updateReservation(id, req.body);
        if (!updatedReservation) {
            return res.status(404).json({ success: false, message: `Reservation #${id} not found to update.` });
        }

        res.json({
            success: true,
            message: `Reservation #${id} updated successfully!`,
            data: updatedReservation
        });
    } catch (err) {
        console.error('Error updating reservation:', err);
        res.status(500).json({ success: false, message: 'Database error while updating reservation.' });
    }
});

// 6. Delete Reservation
app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Reservation ID.' });
        }

        const deleted = await db.deleteReservation(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: `Reservation #${id} not found.` });
        }

        res.json({
            success: true,
            message: `Reservation #${id} deleted successfully.`
        });
    } catch (err) {
        console.error('Error deleting reservation:', err);
        res.status(500).json({ success: false, message: 'Database error while deleting reservation.' });
    }
});

// Start Server and Init Database
db.initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Ticket Reservation Server running at: http://localhost:${PORT}`);
    });
});
