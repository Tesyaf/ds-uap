// static/js/charts_dashboard.js

Chart.defaults.color       = '#7c82a3';
Chart.defaults.borderColor = '#2d3148';

const DAY_LABELS = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

async function initDashboardCharts() {
  let timeData = [];
  try { timeData = await apiFetch('/api/time-pattern'); }
  catch(e) { console.warn('Time pattern unavailable', e); return; }

  // 1. Delay per Hour
  const hourMap = {};
  timeData.forEach(d => {
    if (!hourMap[d.hour]) hourMap[d.hour] = { sum: 0, count: 0 };
    hourMap[d.hour].sum += d.avg_delay;
    hourMap[d.hour].count++;
  });
  const hours = Array.from({length:24}, (_,i) => i);
  const hourDelays = hours.map(h => hourMap[h] ? +(hourMap[h].sum / hourMap[h].count).toFixed(2) : 0);
  const peakColor = hourDelays.map((v, i) =>
    v === Math.max(...hourDelays) ? '#e05252' : '#7c82a3'
  );

  new Chart(document.getElementById('hourlyDelayChart'), {
    type: 'bar',
    data: {
      labels: hours.map(h => `${String(h).padStart(2,'0')}:00`),
      datasets: [{ data: hourDelays, backgroundColor: peakColor, borderRadius: 3 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { title: { display: true, text: 'Avg Delay (min)' }, beginAtZero: true },
        x: { ticks: { maxTicksLimit: 12 } }
      }
    }
  });

  // 2. Delay per Day of Week
  const dowMap = {};
  timeData.forEach(d => {
    if (!dowMap[d.dayofweek]) dowMap[d.dayofweek] = { sum: 0, count: 0 };
    dowMap[d.dayofweek].sum += d.avg_delay;
    dowMap[d.dayofweek].count++;
  });
  const dowDelays = DAY_LABELS.map((_, i) => dowMap[i] ? +(dowMap[i].sum / dowMap[i].count).toFixed(2) : 0);
  const maxDow = Math.max(...dowDelays);

  new Chart(document.getElementById('dowDelayChart'), {
    type: 'bar',
    data: {
      labels: DAY_LABELS,
      datasets: [{
        data: dowDelays,
        backgroundColor: dowDelays.map(v => v === maxDow ? '#e05252' : '#7c82a3'),
        borderRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // 3. Peak vs Off-Peak
  const peakMap = { 0: { sum: 0, count: 0 }, 1: { sum: 0, count: 0 } };
  timeData.forEach(d => {
    const k = d.is_peak_hour;
    peakMap[k].sum += d.avg_delay;
    peakMap[k].count++;
  });
  const peakAvg    = peakMap[1].count ? +(peakMap[1].sum / peakMap[1].count).toFixed(2) : 0;
  const offPeakAvg = peakMap[0].count ? +(peakMap[0].sum / peakMap[0].count).toFixed(2) : 0;

  new Chart(document.getElementById('peakChart'), {
    type: 'bar',
    data: {
      labels: ['Off-Peak', 'Peak Hour'],
      datasets: [{
        data: [offPeakAvg, peakAvg],
        backgroundColor: ['#7c82a3', '#f5a623'],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Avg Delay (min)' } } }
    }
  });

  // 4. Weekend vs Weekday
  const wkMap = { 0: { sum: 0, count: 0 }, 1: { sum: 0, count: 0 } };
  timeData.forEach(d => {
    wkMap[d.is_weekend].sum += d.avg_delay;
    wkMap[d.is_weekend].count++;
  });
  const wkdayAvg   = wkMap[0].count ? +(wkMap[0].sum / wkMap[0].count).toFixed(2) : 0;
  const wkendAvg   = wkMap[1].count ? +(wkMap[1].sum / wkMap[1].count).toFixed(2) : 0;

  new Chart(document.getElementById('weekendChart'), {
    type: 'bar',
    data: {
      labels: ['Weekday', 'Weekend'],
      datasets: [{
        data: [wkdayAvg, wkendAvg],
        backgroundColor: ['#4f8ef7', '#34c77b'],
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // 5. Stop Sequence chart — populated after line select
  await initStopSelect();
}

let stopChart = null;

async function initStopSelect() {
  try {
    const lineRes = await apiFetch('/api/line-performance');
    const sel = document.getElementById('stopLineFilter');
    lineRes.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.line;
      opt.textContent = d.line;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => loadStopChart(sel.value));
    if (lineRes.length > 0) {
      sel.value = lineRes[0].line;
      loadStopChart(lineRes[0].line);
    }
  } catch(e) { console.warn('Stop select init failed', e); }
}

async function loadStopChart(line) {
  try {
    const data = await apiFetch(`/api/stop-delay?line=${encodeURIComponent(line)}`);
    data.sort((a, b) => a.stop_sequence - b.stop_sequence);

    if (stopChart) stopChart.destroy();
    stopChart = new Chart(document.getElementById('stopDelayChart'), {
      type: 'line',
      data: {
        labels: data.map(d => `Stop ${d.stop_sequence}`),
        datasets: [{
          data: data.map(d => +d.avg_delay.toFixed(2)),
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79,142,247,0.07)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#4f8ef7',
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: 'Avg Delay (min)' }, beginAtZero: true },
        },
        interaction: { intersect: false, mode: 'index' },
      }
    });
  } catch(e) { console.warn('Stop chart load failed', e); }
}

document.addEventListener('DOMContentLoaded', initDashboardCharts);
