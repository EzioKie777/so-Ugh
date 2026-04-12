export let commandMap = null;
export let reportMap = null;
export let reportPin = null;
export let radiusCircle = null;

export function drawRadiusCircle(radiusKm) {
    if (!reportMap || !reportPin) return;
    if (radiusCircle) {
        radiusCircle.remove();
        radiusCircle = null;
    }

    radiusCircle = L.circle(reportPin.getLatLng(), {
        radius: radiusKm * 1000,
        color: '#8b6b43',
        fillColor: '#8b6b43',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '6, 4'
    }).addTo(reportMap);
}

export function clearRadiusCircle() {
    if (!radiusCircle) return;
    radiusCircle.remove();
    radiusCircle = null;
}

export async function initCommandMap() {
    if (commandMap) {
        commandMap.remove();
        commandMap = null;
    }

    commandMap = L.map('command-map', { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
    }).addTo(commandMap);

    function makeIcon(color) {
        return L.divIcon({
            className: '',
            html: `<div class="map-marker" style="background:${color}; box-shadow:0 0 10px ${color}aa"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -12]
        });
    }

    const bounds = [];

    try {
        const res = await fetch('/tagbilaran-heritages.json');
        const sites = await res.json();
        sites.forEach(site => {
            if (!site.coordinates?.lat) return;
            const color = ['Excellent', 'Good'].includes(site.healthStatus) ? '#27ae60' : site.healthStatus === 'Fair' ? '#f39c12' : '#e74c3c';
            const marker = L.marker([site.coordinates.lat, site.coordinates.lng], { icon: makeIcon(color) });
            marker.bindPopup(`
                <div class="popup-card">
                    <strong>${site.name}</strong><br>
                    <span class="popup-meta">${site.location?.address || ''}</span>
                    <div class="popup-status-row">
                        <span>Health Status</span>
                        <span class="popup-status-pill" style="background:${color}22; color:${color};">${site.healthStatus || 'Unknown'}</span>
                    </div>
                    ${site.description ? `<p class="popup-description">${site.description.slice(0, 100)}...</p>` : ''}
                </div>`);
            marker.addTo(commandMap);
            bounds.push([site.coordinates.lat, site.coordinates.lng]);
        });
    } catch (err) {
        console.error('Failed to load heritage sites on map:', err);
    }

    try {
        const res = await fetch('/api/hazards');
        const hazards = await res.json();
        hazards.forEach(h => {
            if (!h.location?.lat || !h.location?.lng || !h.radius) return;
            const severityColor = h.severity === 'Critical' ? '#ef4444' : h.severity === 'Moderate' ? '#f39c12' : '#3b82f6';
            L.circle([h.location.lat, h.location.lng], {
                radius: h.radius * 1000,
                color: severityColor,
                fillColor: severityColor,
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '5, 4'
            }).addTo(commandMap);
        });

        hazards.forEach(h => {
            if (!h.location?.lat || !h.location?.lng || h.type === 'Flood') return;
            const icon = L.divIcon({
                className: '',
                html: '<div class="hazard-marker"></div>',
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            });
            L.marker([h.location.lat, h.location.lng], { icon })
                .bindPopup(`<strong>${h.title}</strong><br><small>${h.type} — ${h.severity}</small>`)
                .addTo(commandMap);
        });

        const barangayRes = await fetch('/bohol_barangays.json');
        const barangayGeo = await barangayRes.json();

        hazards.filter(h => h.type === 'Flood' && h.location?.address).forEach(h => {
            const parts = h.location.address.split(',');
            const barangayName = parts[0]?.trim().toLowerCase();
            const municipalityName = parts[1]?.trim().toLowerCase().replace(/\s+/g, '');

            const match = barangayGeo.features.find(f =>
                f.properties.barangay.toLowerCase() === barangayName &&
                f.properties.municipality.toLowerCase().replace(/\s+/g, '') === municipalityName
            );

            if (match) {
                const severityColor = h.severity === 'Critical' ? '#ef4444' : h.severity === 'Moderate' ? '#f39c12' : '#3b82f6';
                L.geoJSON(match, {
                    style: {
                        color: severityColor,
                        fillColor: severityColor,
                        fillOpacity: 0.25,
                        weight: 2,
                        dashArray: '4, 3'
                    }
                }).bindPopup(`<strong>${h.title}</strong><br><small>Flood — ${h.severity}</small>`).addTo(commandMap);
            }
        });
    } catch (err) {
        console.error('Failed to load hazards on map:', err);
    }

    if (bounds.length > 0) {
        commandMap.fitBounds(bounds, { padding: [40, 40] });
    } else {
        commandMap.setView([9.6439, 123.8547], 14);
    }
}

export function initReportMap() {
    if (reportMap) {
        reportMap.remove();
        reportMap = null;
        reportPin = null;
    }

    reportMap = L.map('report-map', { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
    }).addTo(reportMap);

    reportMap.setView([9.6439, 123.8547], 14);

    const info = L.control({ position: 'topright' });
    info.onAdd = () => {
        const div = L.DomUtil.create('div');
        div.className = 'map-info-box';
        div.textContent = '📍 Click anywhere to drop a pin';
        return div;
    };
    info.addTo(reportMap);

    reportMap.on('click', function (e) {
        const { lat, lng } = e.latlng;

        if (reportPin) {
            reportPin.setLatLng([lat, lng]);
        } else {
            reportPin = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: '',
                    html: '<div class="report-pin"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(reportMap);
        }

        document.getElementById('fLat').value = lat.toFixed(6);
        document.getElementById('fLng').value = lng.toFixed(6);
        document.getElementById('coord-display').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.getElementById('pin-coords').style.display = 'block';

        const type = document.getElementById('fType').value;
        const radius = type === 'Fire' ? 0.5 : (parseFloat(document.getElementById('fRadius').value) || 1);
        if (type !== 'Flood') drawRadiusCircle(radius);
    });
}
