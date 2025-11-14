/**
 * Frontend JavaScript for Google Ads ChangeEvent Monitor MVP
 * Handles API calls, UI updates, filtering, and pagination
 */

// Configuration
const API_BASE_URL = window.location.origin;
const PAGE_SIZE = 50;

// State
let currentPage = 0;
let currentFilters = {};
let totalEvents = 0;
let allUsers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Google Ads ChangeEvent Monitor...');

    // Load initial data
    loadUsers();
    loadStats();
    loadEvents();

    // Setup event listeners
    setupEventListeners();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', handleRefresh);

    // Filter buttons
    document.getElementById('applyFiltersBtn').addEventListener('click', handleApplyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', handleClearFilters);

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    document.getElementById('prevPageMobile').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageMobile').addEventListener('click', () => changePage(1));

    // Modal close
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') {
            closeModal();
        }
    });

    // Search on Enter key
    document.getElementById('filterSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleApplyFilters();
        }
    });
}

/**
 * Load unique users for filter dropdown
 */
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            populateUserFilter(data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

/**
 * Populate user filter dropdown
 */
function populateUserFilter(users) {
    const select = document.getElementById('filterUser');

    // Clear existing options (except "All Users")
    select.innerHTML = '<option value="">All Users</option>';

    // Add user options
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        select.appendChild(option);
    });
}

/**
 * Load and display database statistics
 */
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        const data = await response.json();

        if (data.success && data.stats) {
            const stats = data.stats;

            // Update stat cards
            document.getElementById('statTotal').textContent = stats.total_events?.toLocaleString() || '-';
            document.getElementById('statUsers').textContent = stats.unique_users?.toLocaleString() || '-';

            // Format latest event time
            if (stats.latest_event) {
                const latestDate = new Date(stats.latest_event);
                document.getElementById('statLatest').textContent = formatDateTime(latestDate);
            } else {
                document.getElementById('statLatest').textContent = '-';
            }

            // Format date range
            if (stats.earliest_event && stats.latest_event) {
                const earliest = new Date(stats.earliest_event);
                const latest = new Date(stats.latest_event);
                document.getElementById('statRange').textContent =
                    `${formatDate(earliest)} - ${formatDate(latest)}`;
            } else {
                document.getElementById('statRange').textContent = '-';
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Load and display events with current filters and pagination
 */
async function loadEvents() {
    showLoading(true);
    hideEmpty();
    hideTable();

    try {
        // Build query parameters
        const params = new URLSearchParams({
            limit: PAGE_SIZE,
            offset: currentPage * PAGE_SIZE,
            ...currentFilters
        });

        const response = await fetch(`${API_BASE_URL}/api/changes?${params}`);
        const data = await response.json();

        if (data.success) {
            totalEvents = data.total;

            if (data.events.length === 0) {
                showEmpty();
            } else {
                displayEvents(data.events);
                updatePagination();
                showTable();
            }
        } else {
            showToast('Error loading events: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('Failed to load events', 'error');
        showEmpty();
    } finally {
        showLoading(false);
    }
}

/**
 * Display events in the table
 */
function displayEvents(events) {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';

    events.forEach(event => {
        const row = createEventRow(event);
        tbody.appendChild(row);
    });
}

/**
 * Create a table row for an event
 */
function createEventRow(event) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 cursor-pointer';
    row.onclick = () => showEventDetail(event);

    // Timestamp
    const timestampCell = document.createElement('td');
    timestampCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
    timestampCell.textContent = formatDateTime(new Date(event.timestamp));
    row.appendChild(timestampCell);

    // User
    const userCell = document.createElement('td');
    userCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-600';
    userCell.textContent = event.user_email;
    row.appendChild(userCell);

    // Resource Type
    const typeCell = document.createElement('td');
    typeCell.className = 'px-6 py-4 whitespace-nowrap';
    typeCell.innerHTML = `<span class="px-2 py-1 text-xs font-medium rounded-full ${getResourceTypeColor(event.resource_type)}">${formatResourceType(event.resource_type)}</span>`;
    row.appendChild(typeCell);

    // Operation
    const opCell = document.createElement('td');
    opCell.className = 'px-6 py-4 whitespace-nowrap';
    opCell.innerHTML = `<span class="px-2 py-1 text-xs font-medium rounded-full ${getOperationColor(event.operation_type)}">${event.operation_type}</span>`;
    row.appendChild(opCell);

    // Summary
    const summaryCell = document.createElement('td');
    summaryCell.className = 'px-6 py-4 text-sm text-gray-900';
    summaryCell.textContent = event.summary;
    row.appendChild(summaryCell);

    // Details button
    const detailCell = document.createElement('td');
    detailCell.className = 'px-6 py-4 whitespace-nowrap text-sm';
    detailCell.innerHTML = '<button class="text-blue-600 hover:text-blue-800 font-medium">View →</button>';
    row.appendChild(detailCell);

    return row;
}

/**
 * Show event detail in modal
 */
function showEventDetail(event) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('modalContent');

    // Build detail HTML
    let html = `
        <div class="space-y-4">
            <div>
                <h4 class="text-sm font-medium text-gray-500">Timestamp</h4>
                <p class="mt-1 text-sm text-gray-900">${formatDateTime(new Date(event.timestamp))}</p>
            </div>

            <div>
                <h4 class="text-sm font-medium text-gray-500">User</h4>
                <p class="mt-1 text-sm text-gray-900">${event.user_email}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Resource Type</h4>
                    <p class="mt-1 text-sm text-gray-900">${formatResourceType(event.resource_type)}</p>
                </div>
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Operation</h4>
                    <p class="mt-1 text-sm text-gray-900">${event.operation_type}</p>
                </div>
            </div>

            <div>
                <h4 class="text-sm font-medium text-gray-500">Resource Name</h4>
                <p class="mt-1 text-xs text-gray-600 font-mono break-all">${event.resource_name}</p>
            </div>

            <div>
                <h4 class="text-sm font-medium text-gray-500">Summary</h4>
                <p class="mt-1 text-sm text-gray-900">${event.summary}</p>
            </div>
    `;

    // Add field changes if available
    if (event.field_changes && Object.keys(event.field_changes).length > 0) {
        html += `
            <div>
                <h4 class="text-sm font-medium text-gray-500 mb-2">Field Changes</h4>
                <div class="bg-gray-50 rounded-lg p-4 space-y-2">
        `;

        for (const [field, change] of Object.entries(event.field_changes)) {
            html += `
                <div class="flex justify-between items-center text-sm">
                    <span class="font-medium text-gray-700">${field}:</span>
                    <span class="text-gray-600">
                        <span class="text-red-600">${change.old}</span>
                        <span class="mx-2">→</span>
                        <span class="text-green-600">${change.new}</span>
                    </span>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    }

    // Add campaign/ad group info if available
    if (event.campaign || event.ad_group) {
        html += `<div class="grid grid-cols-2 gap-4">`;
        if (event.campaign) {
            html += `
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Campaign</h4>
                    <p class="mt-1 text-xs text-gray-600 font-mono break-all">${event.campaign}</p>
                </div>
            `;
        }
        if (event.ad_group) {
            html += `
                <div>
                    <h4 class="text-sm font-medium text-gray-500">Ad Group</h4>
                    <p class="mt-1 text-xs text-gray-600 font-mono break-all">${event.ad_group}</p>
                </div>
            `;
        }
        html += `</div>`;
    }

    html += `</div>`;

    content.innerHTML = html;
    modal.classList.remove('hidden');
}

/**
 * Close detail modal
 */
function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

/**
 * Handle refresh button click
 */
async function handleRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><circle class="opacity-75" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-dasharray="32" stroke-dashoffset="32"></circle></svg><span>Refreshing...</span>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                days: 7
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast(`Fetched ${data.fetched} events, ${data.inserted} new`, 'success');

            // Reload data
            await loadUsers();
            await loadStats();
            await loadEvents();
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Failed to refresh data', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Refresh Data</span>';
    }
}

/**
 * Handle apply filters button
 */
function handleApplyFilters() {
    // Collect filter values
    const filters = {};

    const userEmail = document.getElementById('filterUser').value;
    if (userEmail) filters.user_email = userEmail;

    const resourceType = document.getElementById('filterResourceType').value;
    if (resourceType) filters.resource_type = resourceType;

    const operation = document.getElementById('filterOperation').value;
    if (operation) filters.operation_type = operation;

    const search = document.getElementById('filterSearch').value;
    if (search) filters.search = search;

    // Update state and reload
    currentFilters = filters;
    currentPage = 0;
    loadEvents();
}

/**
 * Handle clear filters button
 */
function handleClearFilters() {
    // Reset filter inputs
    document.getElementById('filterUser').value = '';
    document.getElementById('filterResourceType').value = '';
    document.getElementById('filterOperation').value = '';
    document.getElementById('filterSearch').value = '';

    // Clear state and reload
    currentFilters = {};
    currentPage = 0;
    loadEvents();
}

/**
 * Change page
 */
function changePage(direction) {
    const newPage = currentPage + direction;
    const maxPage = Math.ceil(totalEvents / PAGE_SIZE) - 1;

    if (newPage >= 0 && newPage <= maxPage) {
        currentPage = newPage;
        loadEvents();
    }
}

/**
 * Update pagination UI
 */
function updatePagination() {
    const start = currentPage * PAGE_SIZE + 1;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, totalEvents);

    document.getElementById('pageStart').textContent = start;
    document.getElementById('pageEnd').textContent = end;
    document.getElementById('pageTotal').textContent = totalEvents;

    // Disable/enable pagination buttons
    const prevButtons = [document.getElementById('prevPage'), document.getElementById('prevPageMobile')];
    const nextButtons = [document.getElementById('nextPage'), document.getElementById('nextPageMobile')];

    prevButtons.forEach(btn => {
        btn.disabled = currentPage === 0;
        btn.classList.toggle('opacity-50', currentPage === 0);
        btn.classList.toggle('cursor-not-allowed', currentPage === 0);
    });

    const maxPage = Math.ceil(totalEvents / PAGE_SIZE) - 1;
    nextButtons.forEach(btn => {
        btn.disabled = currentPage >= maxPage;
        btn.classList.toggle('opacity-50', currentPage >= maxPage);
        btn.classList.toggle('cursor-not-allowed', currentPage >= maxPage);
    });
}

// UI Helper Functions

function showLoading(show) {
    document.getElementById('loadingState').classList.toggle('hidden', !show);
}

function showEmpty() {
    document.getElementById('emptyState').classList.remove('hidden');
}

function hideEmpty() {
    document.getElementById('emptyState').classList.add('hidden');
}

function showTable() {
    document.getElementById('eventsTable').classList.remove('hidden');
}

function hideTable() {
    document.getElementById('eventsTable').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const messageEl = document.getElementById('toastMessage');

    messageEl.textContent = message;

    // Set icon based on type
    if (type === 'success') {
        icon.innerHTML = '<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    } else if (type === 'error') {
        icon.innerHTML = '<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
    } else {
        icon.innerHTML = '<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    }

    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// Formatting Functions

function formatDateTime(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatResourceType(type) {
    return type.replace(/_/g, ' ').split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

function getResourceTypeColor(type) {
    const colors = {
        'CAMPAIGN_BUDGET': 'bg-purple-100 text-purple-800',
        'CAMPAIGN': 'bg-blue-100 text-blue-800',
        'AD_GROUP': 'bg-green-100 text-green-800',
        'AD_GROUP_AD': 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
}

function getOperationColor(operation) {
    const colors = {
        'CREATE': 'bg-green-100 text-green-800',
        'UPDATE': 'bg-blue-100 text-blue-800',
        'REMOVE': 'bg-red-100 text-red-800'
    };
    return colors[operation] || 'bg-gray-100 text-gray-800';
}
