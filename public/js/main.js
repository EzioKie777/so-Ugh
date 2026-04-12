// ============================================================
//  js/main.js  —  Tagbi GeoGuard (Fixed)
//  Adds authFetch helper that sends X-User header on every
//  authenticated request so the backend can verify the user.
// ============================================================

import {
    switchTab,
    fetchReports,
    filterReports,
    fetchHeritageSites,
    loadCenterStats,
    loadFlaggedSites,
    showToast,
    viewHazard,
    verifyHazard,
    deleteHazard,
    closeModal,
    closeDeleteModal,
    acknowledgeFlaggedSite,
    setCurrentUser,
    refreshCurrentTabData,
    confirmDeleteHazard,
    loadRiskMappingData
} from './dashboard.js';

import {
    setupFullReportForm,
    populateBarangays,
    updateRadiusControl,
    updateRadiusDisplay
} from './forms.js';

import { initCommandMap } from './map.js';
import { loadSeverityDistribution, syncTrendsWithMongo } from './charts.js';

// ── Global auth-aware fetch ───────────────────────────────
// Attach this to window so all modules can use it instead of
// plain fetch() when calling protected API endpoints.
window.authFetch = function (url, options = {}) {
    const userData = localStorage.getItem('user');
    const headers  = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (userData) headers['X-User'] = userData;   // send user info for server-side auth
    return fetch(url, { ...options, headers });
};

// ── Expose functions to inline HTML handlers ─────────────
window.switchTab              = switchTab;
window.populateBarangays      = populateBarangays;
window.updateRadiusControl    = updateRadiusControl;
window.updateRadiusDisplay    = updateRadiusDisplay;
window.viewHazard             = viewHazard;
window.verifyHazard           = verifyHazard;
window.deleteHazard           = deleteHazard;
window.closeModal             = closeModal;
window.closeDeleteModal       = closeDeleteModal;
window.acknowledgeFlaggedSite = acknowledgeFlaggedSite;
window.loadRiskMappingData    = loadRiskMappingData;
window.syncTrendsWithMongo    = syncTrendsWithMongo;

// ── Bootstrap ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    // Header UI
    const initials = user.username?.slice(0, 2).toUpperCase() || '??';
    document.getElementById('user-avatar').textContent        = initials;
    document.getElementById('user-display-name').textContent  = user.username;
    document.getElementById('user-display-role').textContent  =
        user.role === 'Admin' ? 'Administrator' : 'GeoGuard Officer';

    // Set today's date as default for the incident date field
    document.getElementById('fDate').value = new Date().toISOString().split('T')[0];

    // Initial data load — only load what's needed for the default (center) view
    loadCenterStats();
    initCommandMap();
    loadFlaggedSites();

    // Lazy-load other tab data only when needed (see switchTab in dashboard.js)
    // Still pre-fetch reports so the table is ready if the user switches quickly
    fetchReports();

    // Auto-refresh every 30 seconds
    setInterval(refreshCurrentTabData, 30000);

    // Filter listeners
    document.querySelector('.search-in')?.addEventListener('input', filterReports);
    document.querySelector('.filter-bar select')?.addEventListener('change', filterReports);

    // Close modals on overlay click
    document.getElementById('hazard-modal')?.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('delete-modal')?.addEventListener('click', function (e) {
        if (e.target === this) closeDeleteModal();
    });

    // Confirm delete button
    document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
        await confirmDeleteHazard();
    });

    // Form submission
    setupFullReportForm(async () => {
        switchTab('reports');
        await fetchReports();
        await loadRiskMappingData();
        await loadSeverityDistribution();
        await syncTrendsWithMongo();
    });
});