// ============================================================
// Ticket Reservation System - Frontend Client Application
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const reservationForm = document.getElementById('reservationForm');
    const inputId = document.getElementById('reservation_id');
    const inputName = document.getElementById('passenger_name');
    const inputEmail = document.getElementById('email');
    const inputPhone = document.getElementById('phone');
    const inputJourneyDate = document.getElementById('journey_date');
    const inputSource = document.getElementById('source');
    const inputDestination = document.getElementById('destination');
    const inputTickets = document.getElementById('number_of_tickets');

    // Display & Badge Elements
    const formTitle = document.getElementById('formTitle');
    const formModeBadge = document.getElementById('formModeBadge');
    const editIdDisplay = document.getElementById('editIdDisplay');
    const editingIdTag = document.getElementById('editingIdTag');
    const globalErrorBox = document.getElementById('globalErrorBox');
    const globalErrorText = document.getElementById('globalErrorText');
    const dbStatusBadge = document.getElementById('dbStatusBadge');
    const dbStatusText = document.getElementById('dbStatusText');

    // Metrics Elements
    const statTotalReservations = document.getElementById('statTotalReservations');
    const statTotalTickets = document.getElementById('statTotalTickets');
    const statActiveRoutes = document.getElementById('statActiveRoutes');
    const recordCountBadge = document.getElementById('recordCountBadge');

    // Action Buttons
    const btnAdd = document.getElementById('btnAdd');
    const btnSearch = document.getElementById('btnSearch');
    const btnUpdate = document.getElementById('btnUpdate');
    const btnDelete = document.getElementById('btnDelete');
    const btnReset = document.getElementById('btnReset');
    const btnEmptyReset = document.getElementById('btnEmptyReset');

    // Table & Search Elements
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const reservationTable = document.getElementById('reservationTable');

    // Modal Elements
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalId = document.getElementById('deleteModalId');
    const deleteModalName = document.getElementById('deleteModalName');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');

    // Toast Notification Element
    const toast = document.getElementById('toastNotification');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    // Application State Variables
    let currentReservations = [];
    let selectedReservationId = null;
    let pendingDeleteId = null;

    // Set Default Minimum Journey Date to Today
    const todayISO = new Date().toISOString().split('T')[0];
    inputJourneyDate.setAttribute('min', todayISO);

    // Initial Setup
    checkDbStatus();
    loadReservations();

    // ============================================================
    // API & Data Fetching Operations
    // ============================================================

    async function checkDbStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            const statusDot = dbStatusBadge.querySelector('.status-dot');

            if (data.isUsingMySQL) {
                statusDot.classList.add('connected');
                statusDot.classList.remove('pulsing');
                dbStatusText.textContent = `MySQL Connected (${data.dbConfig.database})`;
            } else {
                statusDot.classList.remove('connected');
                statusDot.classList.add('pulsing');
                dbStatusText.textContent = 'Demo Mode (In-Memory DB)';
            }
        } catch (err) {
            dbStatusText.textContent = 'Offline';
        }
    }

    async function loadReservations(searchQuery = '') {
        try {
            const url = searchQuery ? `/api/reservations?search=${encodeURIComponent(searchQuery)}` : '/api/reservations';
            const res = await fetch(url);
            const result = await res.json();

            if (result.success) {
                currentReservations = result.data;
                renderTable(currentReservations);
                updateStats(currentReservations);
            } else {
                showToast(result.message || 'Failed to load reservations.', 'error');
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            showToast('Unable to connect to backend server.', 'error');
        }
    }

    // ============================================================
    // Table Rendering & Metrics
    // ============================================================

    function renderTable(data) {
        tableBody.innerHTML = '';

        if (!data || data.length === 0) {
            reservationTable.classList.add('hidden');
            emptyState.classList.remove('hidden');
            recordCountBadge.textContent = '0 Records';
            return;
        }

        reservationTable.classList.remove('hidden');
        emptyState.classList.add('hidden');
        recordCountBadge.textContent = `${data.length} Record${data.length === 1 ? '' : 's'}`;

        data.forEach(item => {
            const tr = document.createElement('tr');
            if (selectedReservationId === item.reservation_id) {
                tr.classList.add('selected-row');
            }

            const formattedDate = formatDate(item.journey_date);

            tr.innerHTML = `
                <td class="id-cell">#${item.reservation_id}</td>
                <td class="passenger-cell">
                    <strong>${escapeHTML(item.passenger_name)}</strong>
                </td>
                <td>
                    <div class="contact-info">
                        <span>✉️ ${escapeHTML(item.email)}</span>
                        <span>📞 ${escapeHTML(item.phone)}</span>
                    </div>
                </td>
                <td>📅 ${formattedDate}</td>
                <td>
                    <span class="route-badge">
                        ${escapeHTML(item.source)} ➔ ${escapeHTML(item.destination)}
                    </span>
                </td>
                <td>
                    <span class="ticket-pill">${item.number_of_tickets} ticket${item.number_of_tickets > 1 ? 's' : ''}</span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-warning btn-sm btn-edit" data-id="${item.reservation_id}">✏️ Edit</button>
                        <button class="btn btn-danger btn-sm btn-delete-row" data-id="${item.reservation_id}" data-name="${escapeHTML(item.passenger_name)}">🗑️ Delete</button>
                    </div>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        // Attach Row Event Listeners
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                selectReservationForEdit(id);
            });
        });

        document.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const name = e.currentTarget.getAttribute('data-name');
                openDeleteModal(id, name);
            });
        });
    }

    function updateStats(data) {
        const totalReservations = data.length;
        const totalTickets = data.reduce((acc, curr) => acc + (parseInt(curr.number_of_tickets) || 0), 0);
        const uniqueRoutes = new Set(data.map(item => `${item.source.toLowerCase()}-${item.destination.toLowerCase()}`)).size;

        statTotalReservations.textContent = totalReservations;
        statTotalTickets.textContent = totalTickets;
        statActiveRoutes.textContent = uniqueRoutes;
    }

    // ============================================================
    // Input Validation Logic
    // ============================================================

    function clearValidationErrors() {
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
        document.querySelectorAll('.input-wrapper input').forEach(el => el.classList.remove('input-invalid'));
        globalErrorBox.classList.add('hidden');
    }

    function showFieldErrors(errors) {
        clearValidationErrors();
        let firstInvalidField = null;

        for (const [field, message] of Object.entries(errors)) {
            const errorSpan = document.getElementById(`err_${field}`);
            const inputEl = document.getElementById(field);

            if (errorSpan) errorSpan.textContent = message;
            if (inputEl) {
                inputEl.classList.add('input-invalid');
                if (!firstInvalidField) firstInvalidField = inputEl;
            }
        }

        if (Object.keys(errors).length > 0) {
            globalErrorText.textContent = 'Please fix the highlighted errors before submitting.';
            globalErrorBox.classList.remove('hidden');
            if (firstInvalidField) firstInvalidField.focus();
        }
    }

    function getFormData() {
        return {
            reservation_id: inputId.value ? parseInt(inputId.value) : null,
            passenger_name: inputName.value.trim(),
            email: inputEmail.value.trim(),
            phone: inputPhone.value.trim(),
            journey_date: inputJourneyDate.value,
            source: inputSource.value.trim(),
            destination: inputDestination.value.trim(),
            number_of_tickets: parseInt(inputTickets.value) || 0
        };
    }

    function validateClientSide(data) {
        const errors = {};

        // Name
        if (!data.passenger_name) {
            errors.passenger_name = 'Passenger name is required.';
        } else if (data.passenger_name.length < 2) {
            errors.passenger_name = 'Name must be at least 2 characters.';
        } else if (!/^[a-zA-Z\s.'-]+$/.test(data.passenger_name)) {
            errors.passenger_name = 'Name can only contain letters and spaces.';
        }

        // Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email) {
            errors.email = 'Email address is required.';
        } else if (!emailRegex.test(data.email)) {
            errors.email = 'Please enter a valid email address.';
        }

        // Phone
        const cleanPhone = data.phone.replace(/[\s-]/g, '');
        if (!cleanPhone) {
            errors.phone = 'Phone number is required.';
        } else if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
            errors.phone = 'Phone number must be 10-15 numeric digits.';
        }

        // Journey Date
        if (!data.journey_date) {
            errors.journey_date = 'Journey date is required.';
        }

        // Source
        if (!data.source) {
            errors.source = 'Source location is required.';
        } else if (data.source.length < 2) {
            errors.source = 'Source location must be at least 2 characters.';
        }

        // Destination
        if (!data.destination) {
            errors.destination = 'Destination location is required.';
        } else if (data.destination.length < 2) {
            errors.destination = 'Destination location must be at least 2 characters.';
        }

        // Same city check
        if (data.source && data.destination && data.source.toLowerCase() === data.destination.toLowerCase()) {
            errors.destination = 'Destination cannot be the same as Source.';
        }

        // Tickets
        if (!data.number_of_tickets || data.number_of_tickets < 1) {
            errors.number_of_tickets = 'Minimum 1 ticket required.';
        } else if (data.number_of_tickets > 20) {
            errors.number_of_tickets = 'Maximum 20 tickets allowed per booking.';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // ============================================================
    // Button Operations: Add, Search, Update, Delete, Reset
    // ============================================================

    // 1. ADD RESERVATION (➕)
    btnAdd.addEventListener('click', async () => {
        const formData = getFormData();
        const clientVal = validateClientSide(formData);

        if (!clientVal.isValid) {
            showFieldErrors(clientVal.errors);
            return;
        }

        clearValidationErrors();

        try {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();

            if (result.success) {
                showToast(result.message, 'success');
                resetForm();
                loadReservations();
            } else {
                if (result.errors) {
                    showFieldErrors(result.errors);
                } else {
                    showToast(result.message || 'Error adding reservation.', 'error');
                }
            }
        } catch (err) {
            console.error('Error adding reservation:', err);
            showToast('Server connection error.', 'error');
        }
    });

    // 2. SEARCH RESERVATION (🔍)
    btnSearch.addEventListener('click', async () => {
        const formData = getFormData();
        const searchTerms = [];

        if (formData.reservation_id) searchTerms.push(formData.reservation_id.toString());
        if (formData.passenger_name) searchTerms.push(formData.passenger_name);
        if (formData.email) searchTerms.push(formData.email);
        if (formData.phone) searchTerms.push(formData.phone);
        if (formData.source) searchTerms.push(formData.source);
        if (formData.destination) searchTerms.push(formData.destination);

        const globalSearchQuery = searchInput.value.trim();
        const finalQuery = globalSearchQuery || searchTerms.join(' ');

        if (!finalQuery) {
            showToast('Please enter search terms in the form or search bar.', 'info');
            return;
        }

        clearValidationErrors();
        showToast(`Searching for "${finalQuery}"...`, 'info');
        loadReservations(finalQuery);
    });

    // 3. UPDATE RESERVATION (✏️)
    btnUpdate.addEventListener('click', async () => {
        if (!selectedReservationId) {
            showToast('Please select a reservation from the table to update.', 'warning');
            return;
        }

        const formData = getFormData();
        const clientVal = validateClientSide(formData);

        if (!clientVal.isValid) {
            showFieldErrors(clientVal.errors);
            return;
        }

        clearValidationErrors();

        try {
            const res = await fetch(`/api/reservations/${selectedReservationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await res.json();

            if (result.success) {
                showToast(result.message, 'success');
                resetForm();
                loadReservations();
            } else {
                if (result.errors) {
                    showFieldErrors(result.errors);
                } else {
                    showToast(result.message || 'Error updating reservation.', 'error');
                }
            }
        } catch (err) {
            console.error('Error updating reservation:', err);
            showToast('Server connection error.', 'error');
        }
    });

    // 4. DELETE RESERVATION (🗑️)
    btnDelete.addEventListener('click', () => {
        if (!selectedReservationId) {
            showToast('Please select a reservation to delete.', 'warning');
            return;
        }
        openDeleteModal(selectedReservationId, inputName.value || 'Selected Passenger');
    });

    // 5. RESET FORM (🔄)
    btnReset.addEventListener('click', () => {
        resetForm();
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        loadReservations();
        showToast('Form reset to default state.', 'info');
    });

    if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', () => {
            resetForm();
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            loadReservations();
        });
    }

    // Live Table Filter Input
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        loadReservations(query);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        loadReservations();
    });

    // ============================================================
    // Edit & Select Helpers
    // ============================================================

    function selectReservationForEdit(id) {
        const reservation = currentReservations.find(r => r.reservation_id === id);
        if (!reservation) return;

        selectedReservationId = id;
        inputId.value = reservation.reservation_id;
        inputName.value = reservation.passenger_name;
        inputEmail.value = reservation.email;
        inputPhone.value = reservation.phone;
        inputJourneyDate.value = reservation.journey_date;
        inputSource.value = reservation.source;
        inputDestination.value = reservation.destination;
        inputTickets.value = reservation.number_of_tickets;

        // Update UI State
        formTitle.textContent = `Update Reservation #${id}`;
        formModeBadge.textContent = 'Mode: Edit';
        formModeBadge.classList.add('editing');
        editingIdTag.textContent = `#${id}`;
        editIdDisplay.classList.remove('hidden');

        // Toggle Buttons
        btnAdd.disabled = true;
        btnUpdate.disabled = false;
        btnDelete.disabled = false;

        clearValidationErrors();
        renderTable(currentReservations);
        showToast(`Editing Reservation #${id}`, 'info');

        // Scroll to form on smaller screens
        if (window.innerWidth < 1100) {
            reservationForm.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function resetForm() {
        reservationForm.reset();
        inputId.value = '';
        selectedReservationId = null;

        formTitle.textContent = 'Add New Ticket Reservation';
        formModeBadge.textContent = 'Mode: Create';
        formModeBadge.classList.remove('editing');
        editIdDisplay.classList.add('hidden');

        btnAdd.disabled = false;
        btnUpdate.disabled = true;
        btnDelete.disabled = true;

        clearValidationErrors();
        renderTable(currentReservations);
    }

    // ============================================================
    // Delete Confirmation Modal
    // ============================================================

    function openDeleteModal(id, name) {
        pendingDeleteId = id;
        deleteModalId.textContent = `#${id}`;
        deleteModalName.textContent = name;
        deleteModal.classList.remove('hidden');
    }

    function closeDeleteModal() {
        pendingDeleteId = null;
        deleteModal.classList.add('hidden');
    }

    btnCancelDelete.addEventListener('click', closeDeleteModal);

    btnConfirmDelete.addEventListener('click', async () => {
        if (!pendingDeleteId) return;

        const idToDelete = pendingDeleteId;
        closeDeleteModal();

        try {
            const res = await fetch(`/api/reservations/${idToDelete}`, {
                method: 'DELETE'
            });

            const result = await res.json();

            if (result.success) {
                showToast(result.message, 'success');
                if (selectedReservationId === idToDelete) {
                    resetForm();
                }
                loadReservations();
            } else {
                showToast(result.message || 'Failed to delete reservation.', 'error');
            }
        } catch (err) {
            console.error('Error deleting reservation:', err);
            showToast('Server connection error.', 'error');
        }
    });

    // ============================================================
    // Toast Notification Helper
    // ============================================================

    let toastTimeout;
    function showToast(message, type = 'info') {
        clearTimeout(toastTimeout);

        toastMessage.textContent = message;
        toast.className = 'toast toast-' + type;

        switch (type) {
            case 'success': toastIcon.textContent = '✅'; break;
            case 'error': toastIcon.textContent = '❌'; break;
            case 'warning': toastIcon.textContent = '⚠️'; break;
            default: toastIcon.textContent = 'ℹ️'; break;
        }

        toast.classList.remove('hidden');

        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
