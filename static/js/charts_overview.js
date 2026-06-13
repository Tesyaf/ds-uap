// static/js/charts_overview.js

Chart.defaults.color       = '#7c82a3';
Chart.defaults.borderColor = '#2d3148';

async function initOverviewCharts() {

  // 1. Delay Trend (line chart)
  try {
    const data = await apiFetch('/api/delay-trend');
    const labels = data.map(d => d.date);
    const delays = data.map(d => d.avg_delay);

    new Chart(document.getElementById('delayTrendChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: delays,
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79,142,247,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: { title: { display: true, text: 'Avg Delay (min)' } }
        },
        interaction: { intersect: false, mode: 'index' },
      }
    });
  } catch(e) { console.warn('Delay trend unavailable', e); }

  // 2. Status Distribution (horizontal bar — NO pie chart)
  try {
    const data = await apiFetch('/api/status-distribution');
    const statusColors = { departed: '#34c77b', estimated: '#f5a623', cancelled: '#e05252' };

    new Chart(document.getElementById('statusChart'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.status),
        datasets: [{
          data: data.map(d => d.total_trips),
          backgroundColor: data.map(d => statusColors[d.status] || '#4f8ef7'),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.raw.toLocaleString()} trips`
            }
          }
        },
        scales: {
          x: { ticks: { callback: v => v.toLocaleString() } },
          y: {}
        }
      }
    });
  } catch(e) { console.warn('Status chart unavailable', e); }

  // 3. Line Performance (top 15 lines by avg delay)
  try {
    const data = await apiFetch('/api/line-performance');
    const colors = data.map((_, i) => i === 0 ? '#e05252' : '#7c82a3');

    new Chart(document.getElementById('linePerformanceChart'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.line),
        datasets: [{
          label: 'Avg Delay (min)',
          data: data.map(d => +d.avg_delay.toFixed(2)),
          backgroundColor: colors,
          borderRadius: 4,
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw} min` } }
        },
        scales: {
          y: { title: { display: true, text: 'Avg Delay (min)' }, beginAtZero: true },
          x: { ticks: { maxRotation: 35, minRotation: 20 } }
        }
      }
    });
  } catch(e) { console.warn('Line perf chart unavailable', e); }
}

document.addEventListener('DOMContentLoaded', initOverviewCharts);
