export let currentTab      = 'center';
export let currentUser     = null;
export let allReports      = [];
export let pendingDeleteId = null;

export function setCurrentUser(user) { currentUser = user; }

export function switchTab(viewId, el) {
    if (el) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
    }
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('view-' + viewId);
    if (target) target.classList.add('active');
    currentTab = viewId;

    if (viewId === 'center')     { import('./map.js').then(m => m.initCommandMap()); loadFlaggedSites(); loadCenterStats(); }
    if (viewId === 'reports')    fetchReports();
    if (viewId === 'heritage')   fetchHeritageSites();
    if (viewId === 'risk')       { loadRiskMappingData(); import('./charts.js').then(m => { m.loadSeverityDistribution(); m.syncTrendsWithMongo(); }); }
    if (viewId === 'profile')    loadUserProfileStats();
    if (viewId === 'new-report') setTimeout(() => import('./map.js').then(m => m.initReportMap()), 100);
}

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className   = `toast ${type} show`;
    window.setTimeout(() => toast.classList.remove('show'), 3000);
}

export function renderReports(reports) {
    const tbody = document.getElementById('rt-body');
    if (!tbody) return;
    if (!reports.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No active hazards reported.</td></tr>';
        return;
    }
    tbody.innerHTML = reports.map(h => {
        const flaggedMsg  = h.flaggedSites?.length ? `<br><span class="report-warning">⚠️ ${h.flaggedSites.length} heritage site${h.flaggedSites.length > 1 ? 's' : ''} at risk</span>` : '';
        const statusClass = h.status === 'Verified' ? 'badge-low' : h.status === 'Rejected' ? 'badge-critical' : 'badge-moderate';
        const verifyBtn   = currentUser?.role === 'Admin' && h.status === 'Pending'
            ? `<button onclick="verifyHazard('${h._id}')" class="action-button action-verify">Verify</button>` : '';
        const deleteBtn   = currentUser?.role === 'Admin'
            ? `<button onclick="deleteHazard('${h._id}')" class="action-button action-delete">Delete</button>` : '';
        return `<tr>
            <td><strong>${h.title||'Untitled'}</strong><br><small class="report-address">${h.location?.address||'—'}</small>${flaggedMsg}</td>
            <td>${h.type||'Other'}</td>
            <td><span class="badge badge-${(h.severity||'moderate').toLowerCase()}">${h.severity||'Moderate'}</span></td>
            <td><span class="badge ${statusClass}">${h.status||'Pending'}</span></td>
            <td>${new Date(h.incidentDate).toLocaleDateString()}</td>
            <td class="report-actions">
                <button onclick="viewHazard('${h._id}')" class="action-button action-view">View Details</button>
                ${verifyBtn}${deleteBtn}
            </td></tr>`;
    }).join('');
}

export async function fetchReports() {
    try {
        const data = await (await fetch('/api/hazards')).json();
        allReports = data;
        const el = document.getElementById('stat-active');
        if (el) el.innerText = data.length;
        renderReports(allReports);
    } catch {
        const tbody = document.getElementById('rt-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="error-state">Failed to load reports.</td></tr>';
    }
}

export function filterReports() {
    const search = document.querySelector('.search-in')?.value.toLowerCase() || '';
    const type   = document.querySelector('.filter-bar select')?.value || 'All Types';
    let filtered = allReports;
    if (type !== 'All Types') filtered = filtered.filter(h => h.type === type);
    if (search) filtered = filtered.filter(h =>
        (h.title||'').toLowerCase().includes(search) || (h.location?.address||'').toLowerCase().includes(search)
    );
    renderReports(filtered);
}

// Merges static heritage JSON with live health scores from the API
export async function fetchHeritageSites() {
    try {
        const [sitesRes, healthRes] = await Promise.all([
            fetch('/tagbilaran-heritages.json'),
            window.authFetch('/api/heritage-health')
        ]);
        const sites     = await sitesRes.json();
        const healthMap = await healthRes.json();
        const grid      = document.getElementById('heritage-grid');
        if (!grid) return;

        if (!Array.isArray(sites) || !sites.length) {
            grid.innerHTML = '<p class="empty-state">No heritage sites available.</p>';
            return;
        }

        grid.innerHTML = sites.map(site => {
            // Live health overrides the static JSON value; default to Excellent
            const health      = healthMap[site.name] || { status: 'Excellent', score: 0, color: '#27ae60' };
            const statusClass = health.status === 'Excellent' || health.status === 'Good'
                ? 'badge-low' : health.status === 'Fair' ? 'badge-moderate' : 'badge-critical';

            const hazardSummary = health.activeHazards?.length
                ? `<div class="heritage-hazard-summary">
                     ${health.activeHazards.map(h =>
                         `<span class="badge badge-${h.severity.toLowerCase()}" style="margin-right:4px;">${h.severity}</span>`
                     ).join('')}
                     <span style="font-size:11px;color:var(--text-grey);">${health.activeHazards.length} active hazard${health.activeHazards.length>1?'s':''}</span>
                   </div>`
                : '';

            return `
                <div class="form-card card-no-margin card-heritage">
                    <div class="heritage-image">${site.image ? `<img src="${site.image}" class="heritage-cover">` : '🏛️'}</div>
                    <div class="heritage-details">
                        <h3 class="heritage-title">${site.name}</h3>
                        <p class="heritage-meta">${site.location?.address||'Address not available'}</p>
                        <p class="heritage-description">${site.description||''}</p>
                        ${hazardSummary}
                        <div class="heritage-footer">
                            <span class="badge ${statusClass}">${health.status}</span>
                            ${health.score > 0 ? `<span style="font-size:11px;color:var(--text-grey);">Risk score: ${health.score}</span>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Error fetching heritage sites:', err);
    }
}

export async function loadFlaggedSites() {
    try {
        const flagged    = await (await window.authFetch('/api/flagged-sites')).json();
        const panel      = document.getElementById('flagged-sites-panel');
        const countBadge = document.getElementById('flagged-count');
        if (!panel || !countBadge) return;

        countBadge.textContent = flagged.length ? `${flagged.length} Unreviewed` : 'All Clear';
        countBadge.className   = `status-pill ${flagged.length ? 'status-warning' : 'status-success'}`;

        if (!flagged.length) {
            panel.innerHTML = '<p class="success-text">✅ No heritage sites currently at risk.</p>';
            return;
        }
        panel.innerHTML = flagged.map(f => `
            <div class="flagged-site-row">
                <div>
                    <div class="flagged-site-name">🏛️ ${f.siteName}</div>
                    <div class="flagged-site-meta">${f.siteAddress}</div>
                    <div class="flagged-site-summary">
                        <span class="badge badge-${(f.hazardSeverity||'moderate').toLowerCase()}">${f.hazardSeverity}</span>
                        <span>${f.hazardType} — ${f.distance}m from hazard origin</span>
                        <span>· ${f.hazardTitle}</span>
                    </div>
                </div>
                ${currentUser?.role === 'Admin' ? `
                <div class="flagged-site-actions">
                    <button onclick="acknowledgeFlaggedSite('${f.hazardId}','${encodeURIComponent(f.siteName)}','Acknowledged')" class="action-pill action-success">Acknowledge</button>
                    <button onclick="acknowledgeFlaggedSite('${f.hazardId}','${encodeURIComponent(f.siteName)}','Cleared')" class="action-pill action-secondary">Clear</button>
                </div>` : ''}
            </div>`).join('');
    } catch {
        const panel = document.getElementById('flagged-sites-panel');
        if (panel) panel.innerHTML = '<p class="error-text">Failed to load flagged sites.</p>';
    }
}

export async function acknowledgeFlaggedSite(hazardId, siteName, status) {
    try {
        const res = await window.authFetch(`/api/hazards/${hazardId}/flagged-sites/${siteName}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, acknowledgedBy: currentUser?.username })
        });
        if (res.ok) {
            loadFlaggedSites();
            // Refresh map pins to reflect improved health score
            import('./map.js').then(m => m.initCommandMap());
        } else showToast('Failed to update site status.', 'error');
    } catch { showToast('Failed to update site status.', 'error'); }
}

export async function loadRiskMappingData() {
    try {
        const flaggedSites = await (await window.authFetch('/api/flagged-sites')).json();
        const listEl       = document.getElementById('vulnerable-sites-list');
        if (!listEl) return;
        if (!flaggedSites?.length) {
            listEl.innerHTML = '<p class="empty-state">No heritage sites currently flagged.</p>';
            return;
        }
        const agg = {};
        flaggedSites.forEach(f => {
            if (!agg[f.siteName]) agg[f.siteName] = { siteName: f.siteName, siteAddress: f.siteAddress, count: 0, highestSeverity: 'Low' };
            agg[f.siteName].count++;
            const sevs = ['Low','Moderate','Critical'];
            if (sevs.indexOf(f.hazardSeverity) > sevs.indexOf(agg[f.siteName].highestSeverity))
                agg[f.siteName].highestSeverity = f.hazardSeverity;
        });
        const topSites = Object.values(agg).sort((a,b) => b.count - a.count);
        listEl.innerHTML = topSites.map((site, i) => {
            const color = site.count > 5 ? '#ef4444' : site.count > 2 ? '#f59e0b' : '#10b981';
            const label = site.count > 5 ? 'CRITICAL' : site.count > 2 ? 'HIGH' : 'MEDIUM';
            return `<div class="vulnerable-row">
                <div>
                    <div class="vulnerable-name">#${i+1} ${site.siteName}</div>
                    <div class="vulnerable-meta">${site.siteAddress}</div>
                    <div class="vulnerable-meta" style="color:var(--accent);margin-top:4px;font-weight:600;">${site.count} hazard report${site.count!==1?'s':''} flagging this site</div>
                </div>
                <div class="risk-pill" style="background:${color};">${label}</div>
            </div>`;
        }).join('');
    } catch { document.getElementById('vulnerable-sites-list').innerHTML = '<p class="error-text">Failed to load data.</p>'; }
}

export async function verifyHazard(hazardId) {
    if (currentUser?.role !== 'Admin') { showToast('Only admins can verify reports.', 'error'); return; }
    try {
        const res = await window.authFetch(`/api/hazards/${hazardId}/verify`, { method: 'PUT', body: JSON.stringify({ verifiedBy: currentUser.username }) });
        if (res.ok) { showToast('Report verified!', 'success'); fetchReports(); }
        else { const e = await res.json(); showToast('Error: ' + e.message, 'error'); }
    } catch { showToast('Server connection failed.', 'error'); }
}

export async function viewHazard(id) {
    try {
        const h = await (await fetch(`/api/hazards/${id}`)).json();
        const modal = document.getElementById('hazard-modal');
        if (!modal) return;
        document.getElementById('modal-title').textContent    = h.title || 'Untitled';
        document.getElementById('modal-type').textContent     = h.type  || '—';
        document.getElementById('modal-severity').innerHTML   = `<span class="badge badge-${(h.severity||'moderate').toLowerCase()}">${h.severity||'—'}</span>`;
        document.getElementById('modal-status').innerHTML     = `<span class="badge ${h.status==='Verified'?'badge-low':h.status==='Rejected'?'badge-critical':'badge-moderate'}">${h.status||'Pending'}</span>`;
        document.getElementById('modal-date').textContent     = h.incidentDate ? new Date(h.incidentDate).toLocaleDateString() : '—';
        document.getElementById('modal-address').textContent  = h.location?.address || '—';
        const flagged = h.flaggedSites?.filter(s => s.status !== 'Cleared') || [];
        document.getElementById('modal-heritage').textContent = flagged.length ? flagged.map(s => s.name).join(', ') : 'None within hazard radius';
        document.getElementById('modal-desc').textContent     = h.description || 'No assessment provided.';
        document.getElementById('modal-submitted').textContent= h.timestamp ? new Date(h.timestamp).toLocaleString() : '—';
        modal.classList.add('open');
    } catch { showToast('Could not load report details.', 'error'); }
}

export function closeModal()       { document.getElementById('hazard-modal')?.classList.remove('open'); }
export function closeDeleteModal() { pendingDeleteId = null; document.getElementById('delete-modal')?.classList.remove('open'); }

export async function loadUserProfileStats() {
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    const totalEl = document.getElementById('profile-total-reported');
    const verifiedEl = document.getElementById('profile-verified-reported');
    const adminSection = document.getElementById('profile-admin-settings');
    const adminMessage = document.getElementById('admin-promo-message');

    if (nameEl) nameEl.textContent = currentUser?.username || 'Unknown';
    if (roleEl) roleEl.textContent = currentUser?.role === 'Admin' ? 'Administrator' : 'GeoGuard Officer';
    if (adminSection) adminSection.style.display = currentUser?.role === 'Admin' ? 'block' : 'none';
    if (adminMessage) adminMessage.textContent = '';
    if (!currentUser) return;

    try {
        const hazards = await (await fetch('/api/hazards')).json();
        const owned = hazards.filter(h => h.reporter?.name === currentUser.username);
        if (totalEl) totalEl.textContent = String(owned.length);
        if (verifiedEl) verifiedEl.textContent = String(owned.filter(h => h.status === 'Verified').length);
    } catch (err) {
        console.error('Error loading profile stats:', err);
        if (totalEl) totalEl.textContent = '—';
        if (verifiedEl) verifiedEl.textContent = '—';
    }
}

export async function promoteUserToAdmin() {
    const input = document.getElementById('admin-account-name');
    const message = document.getElementById('admin-promo-message');
    if (!input || !message) return;

    const username = input.value.trim();
    if (!username) {
        message.textContent = 'Please enter a username to promote.';
        message.style.color = 'var(--danger)';
        return;
    }

    try {
        const res = await window.authFetch('/api/admin/promote', {
            method: 'PATCH',
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!res.ok) {
            message.textContent = data.message || 'Failed to promote account.';
            message.style.color = 'var(--danger)';
            return;
        }
        message.textContent = data.message || `Account ${username} has been promoted.`;
        message.style.color = 'var(--success)';
        input.value = '';
    } catch (err) {
        console.error('Admin promotion error:', err);
        message.textContent = 'Server error while promoting account.';
        message.style.color = 'var(--danger)';
    }
}

export async function confirmDeleteHazard() {
    if (!pendingDeleteId) return;
    try {
        const res = await window.authFetch(`/api/hazards/${pendingDeleteId}`, { method: 'DELETE' });
        if (res.ok) { closeDeleteModal(); fetchReports(); loadCenterStats(); }
        else { const e = await res.json(); showToast('Error: ' + e.message, 'error'); }
    } catch { showToast('Server connection failed.', 'error'); }
}

export async function loadCenterStats() {
    try {
        const sites = await (await fetch('/tagbilaran-heritages.json')).json();
        const el    = document.getElementById('stat-sites');
        if (el) el.textContent = Array.isArray(sites) ? sites.length : '—';
    } catch { const el = document.getElementById('stat-sites'); if (el) el.textContent = '—'; }

    try {
        const hazards  = await (await fetch('/api/hazards')).json();
        const oneDayAgo = new Date(Date.now() - 86400000);
        const resolved  = hazards.filter(h => h.status === 'Verified' && new Date(h.verifiedAt) >= oneDayAgo).length;
        const elRes = document.getElementById('stat-resolved'), elAct = document.getElementById('stat-active');
        if (elRes) elRes.textContent = resolved;
        if (elAct) elAct.textContent = hazards.length;
    } catch {
        const elRes = document.getElementById('stat-resolved'), elAct = document.getElementById('stat-active');
        if (elRes) elRes.textContent = '—';
        if (elAct) elAct.textContent = '—';
    }
}

export function deleteHazard(id) {
    if (currentUser?.role !== 'Admin') { showToast('Only admins can delete reports.', 'error'); return; }
    pendingDeleteId = id;
    document.getElementById('delete-modal')?.classList.add('open');
}

export function refreshCurrentTabData() {
    if (currentTab === 'reports')  fetchReports();
    else if (currentTab === 'heritage') fetchHeritageSites();
    else if (currentTab === 'risk')    { loadRiskMappingData(); import('./charts.js').then(m => { m.loadSeverityDistribution(); m.syncTrendsWithMongo(); }); }
    else if (currentTab === 'profile') { loadUserProfileStats(); }
    else if (currentTab === 'center')  { loadCenterStats(); loadFlaggedSites(); }
}