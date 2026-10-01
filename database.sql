-- ============================================================
-- Ticket Reservation System Database Script
-- Database: ticket_reservation
-- Table: reservations
-- ============================================================

-- Step 1: Create Database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS ticket_reservation;

-- Step 2: Switch to ticket_reservation database
USE ticket_reservation;

-- Step 3: Create reservations table
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

-- Step 4: Insert sample initial data for testing and demo
INSERT INTO reservations (passenger_name, email, phone, journey_date, source, destination, number_of_tickets)
VALUES 
    ('Rahul Sharma', 'rahul.sharma@example.com', '9876543210', '2026-10-15', 'New Delhi', 'Mumbai', 2),
    ('Priya Patel', 'priya.patel@example.com', '9812345678', '2026-10-18', 'Bengaluru', 'Chennai', 1),
    ('Amit Kumar', 'amit.kumar@example.com', '9988776655', '2026-10-20', 'Kolkata', 'Hyderabad', 3),
    ('Sneha Gupta', 'sneha.gupta@example.com', '9765432109', '2026-10-25', 'Pune', 'Ahmedabad', 4);

-- Step 5: Verify inserted data
SELECT * FROM reservations;
