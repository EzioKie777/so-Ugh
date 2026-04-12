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

import { initCommandMap, initReportMap } from './map.js';
import { loadSeverityDistribution, syncTrendsWithMongo } from './charts.js';

window.switchTab = switchTab;
window.populateBarangays = populateBarangays;
window.updateRadiusControl = updateRadiusControl;
window.updateRadiusDisplay = updateRadiusDisplay;
window.viewHazard = viewHazard;
window.verifyHazard = verifyHazard;
window.deleteHazard = deleteHazard;
window.closeModal = closeModal;
window.closeDeleteModal = closeDeleteModal;
window.acknowledgeFlaggedSite = acknowledgeFlaggedSite;
window.loadRiskMappingData = loadRiskMappingData;
window.syncTrendsWithMongo = syncTrendsWithMongo;

window.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);

    const initials = user.username?.slice(0, 2).toUpperCase() || '??';
    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('user-display-name').textContent = user.username;
    document.getElementById('user-display-role').textContent = user.role === 'Admin' ? 'Administrator' : 'GeoGuard Officer';

    document.getElementById('fDate').value = new Date().toISOString().split('T')[0];

    loadCenterStats();
    initCommandMap();
    loadSeverityDistribution();
    syncTrendsWithMongo();
    fetchReports();
    fetchHeritageSites();
    loadFlaggedSites();
    loadRiskMappingData();
    setInterval(refreshCurrentTabData, 30000);

    document.querySelector('.search-in')?.addEventListener('input', filterReports);
    document.querySelector('.filter-bar select')?.addEventListener('change', filterReports);

    document.getElementById('hazard-modal')?.addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });

    document.getElementById('delete-modal')?.addEventListener('click', function (e) {
        if (e.target === this) closeDeleteModal();
    });

    document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
        await confirmDeleteHazard();
    });

    setupFullReportForm(async () => {
        document.querySelector('.search-in')?.dispatchEvent(new Event('input'));
        switchTab('reports');
        await fetchReports();
        await loadRiskMappingData();
        await loadSeverityDistribution();
        await syncTrendsWithMongo();
    });
});
