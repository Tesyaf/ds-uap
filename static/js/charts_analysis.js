// static/js/charts_analysis.js
// Gunakan data statis dari describe() karena ini EDA yang sudah diketahui hasilnya

Chart.defaults.color       = '#7c82a3';
Chart.defaults.borderColor = '#2d3148';

function initAnalysisCharts() {

  // 1. Delay Minutes Histogram (approx dari distribusi data)
  const delayBins   = ['0–2','2–5','5–10','10–20','20–30','30–50','50–111'];
  const delayFreqs  = [138000, 52000, 28000, 16000, 5000, 2500, 1500];

  new Chart(document.getElementById('delayHistChart'), {
    type: 'bar',
    data: {
      labels: delayBins,
      datasets: [{
        data: delayFreqs,
        backgroundColor: delayFreqs.map((_, i) => i === 0 ? '#4f8ef7' : '#7c82a3'),
        borderRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { title: { display: true, text: 'Frekuensi' }, beginAtZero: true,
             ticks: { callback: v => v.toLocaleString() } },
        x: { title: { display: true, text: 'Delay (menit)' } }
      }
    }
  });

  // 2. Stop Sequence Histogram
  const stopBins  = ['1–3','4–6','7–9','10–12','13–15','16–20','21–26'];
  const stopFreqs = [55000, 63000, 58000, 44000, 15000, 5000, 3000];

  new Chart(document.getElementById('stopHistChart'), {
    type: 'bar',
    data: {
      labels: stopBins,
      datasets: [{
        data: stopFreqs,
        backgroundColor: '#7c82a3',
        borderRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() } },
        x: { title: { display: true, text: 'Stop Sequence' } }
      }
    }
  });

  // 3. Correlation "heatmap" sebagai tabel visual dengan warna
  renderCorrTable();
}

function renderCorrTable() {
  const features = ['stop_sequence', 'delay_minutes', 'month', 'dayofweek', 'hour'];
  const matrix = [
    [1.000,  0.079, null,  -0.013, 0.045],
    [0.079,  1.000, null,   0.054, 0.053],
    [null,   null,  1.000,  null,  null ],
    [-0.013, 0.054, null,   1.000, 0.032],
    [0.045,  0.053, null,   0.032, 1.000],
  ];

  const wrap = document.getElementById('corrTable');
  if (!wrap) return;

  let html = '<table class="stats-table corr-matrix"><thead><tr><th></th>';
  features.forEach(f => html += `<th>${f}</th>`);
  html += '</tr></thead><tbody>';

  matrix.forEach((row, i) => {
    html += `<tr><td style="color:var(--text);font-weight:600;font-family:var(--mono);font-size:11px">${features[i]}</td>`;
    row.forEach(val => {
      if (val === null) {
        html += `<td style="background:var(--surface-2);color:var(--text-muted)">—</td>`;
      } else {
        const abs  = Math.abs(val);
        const isPos = val >= 0;
        const alpha = (abs * 0.8 + 0.1).toFixed(2);
        const bg = val === 1
          ? 'rgba(79,142,247,0.7)'
          : isPos
            ? `rgba(79,142,247,${alpha})`
            : `rgba(224,82,82,${alpha})`;
        html += `<td style="background:${bg};text-align:center;font-family:var(--mono);font-size:12px;color:#fff">${val.toFixed(3)}</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initAnalysisCharts);
