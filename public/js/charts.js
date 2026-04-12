let severityChart = null;

export async function syncTrendsWithMongo() {
    const chart = document.getElementById('trends-chart');
    if (!chart) return;

    try {
        const response = await fetch('/api/analytics');
        const { trends } = await response.json();
        chart.innerHTML = '';

        if (!trends || trends.length === 0) {
            chart.innerHTML = '<p class="empty-state">No recent hazards detected.</p>';
            return;
        }

        const maxVal = Math.max(...trends.map(t => t.count));
        trends.forEach(item => {
            const col = document.createElement('div');
            col.className = 'trend-column';
            const bar = document.createElement('div');
            const heightPct = maxVal ? (item.count / maxVal) * 100 : 0;
            bar.className = 'trend-bar';
            bar.style.height = `${heightPct}%`;
            bar.title = `${item.count} reports on ${item._id}`;

            const label = document.createElement('span');
            label.className = 'trend-label';
            const date = new Date(item._id);
            label.innerText = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            col.appendChild(bar);
            col.appendChild(label);
            chart.appendChild(col);
        });
    } catch (error) {
        console.error('Chart Sync Error:', error);
        const chart = document.getElementById('trends-chart');
        if (chart) chart.innerHTML = '<p class="error-state">Offline</p>';
    }
}

export async function loadSeverityDistribution() {
    const canvas = document.getElementById('severity-pie-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
        const response = await fetch('/api/analytics');
        const { severityDist } = await response.json();

        const counts = { Low: 0, Moderate: 0, Critical: 0 };
        (severityDist || []).forEach(item => {
            if (counts[item._id] !== undefined) counts[item._id] = item.count;
        });

        const labels = ['Low', 'Moderate', 'Critical'];
        const data = labels.map(label => counts[label]);
        const backgroundColors = ['#10b981', '#f59e0b', '#ef4444'];

        if (data.every(value => value === 0)) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#64748b';
            ctx.fillText('No severity data available.', 10, 50);
            return;
        }

        if (severityChart) severityChart.destroy();
        severityChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{ data, backgroundColor: backgroundColors, borderWidth: 1 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${context.parsed} reports`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Severity Distribution Error:', error);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('Loading Data', 10, 50);
    }
}
