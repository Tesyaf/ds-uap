// static/js/main.js — shared utilities, Chart.js global configurations, and widget interactions

const COLORS = {
  accent:   '#2563eb',
  green:    '#10b981',
  yellow:   '#f59e0b',
  red:      '#ef4444',
  muted:    '#64748b',
  border:   '#e2e8f0',
  bgLight:  '#f8fafc',
};

// Default Chart.js global styles (updated for light theme)
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = COLORS.muted;
  Chart.defaults.borderColor = COLORS.border;
  Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.display = false;
  
  // Custom scale grid defaults
  Chart.defaults.scales.linear = Chart.defaults.scales.linear || {};
  if (Chart.defaults.scales.linear.grid) {
    Chart.defaults.scales.linear.grid.color = '#f1f5f9';
  }
}

// Fetch helper wrapper
async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function resetFilters() {
  document.querySelectorAll('select[id^="filter"]').forEach(s => s.value = 'all');
  window.dispatchEvent(new Event('filtersReset'));
}

// Initialize Interactive Widget Logic
document.addEventListener('DOMContentLoaded', () => {
  initWidgetTabs();
  initWidgetPredictor();
  initDepartureTimeDefault();
});

function initDepartureTimeDefault() {
  const timeInput = document.getElementById('departure-time');
  if (timeInput) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
  }
}

// 1. Tab Switching & Tab Data Loading
function initWidgetTabs() {
  const tabs = document.querySelectorAll('.widget-tab');
  const panes = document.querySelectorAll('.tab-pane');
  
  if (!tabs.length) return;
  
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const targetPaneId = tab.dataset.tab;
      
      // Update tab state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update pane visibility
      panes.forEach(pane => {
        if (pane.id === targetPaneId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
      
      // Lazy load data based on active tab
      if (targetPaneId === 'tab-line-analytics') {
        await loadLineAnalyticsTab();
      } else if (targetPaneId === 'tab-api-status') {
        await loadApiStatusTab();
      }
    });
  });
}

// Lazy Load Line Analytics Tab
async function loadLineAnalyticsTab() {
  const container = document.getElementById('line-analytics-list');
  if (!container || container.dataset.loaded === 'true') return;
  
  container.innerHTML = '<div style="color: var(--text-secondary);">Memuat performa jalur...</div>';
  
  try {
    const data = await apiFetch('/api/line-performance');
    container.innerHTML = '';
    
    // Select top 3 and bottom 3 lines to show as a summary list
    const topLines = data.slice(0, 3);
    const lowestLines = [...data].reverse().slice(0, 3);
    
    let html = '<div class="line-performance-list">';
    
    topLines.forEach(item => {
      html += `
        <div class="line-performance-item">
          <div class="line-perf-left">
            <span class="line-perf-name">${item.line}</span>
            <span class="line-perf-type">Tingkat Delay Tinggi</span>
          </div>
          <span class="line-perf-delay">${item.avg_delay.toFixed(2)} min</span>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    container.dataset.loaded = 'true';
  } catch(e) {
    console.error('Failed to load line analytics for widget', e);
    container.innerHTML = '<div style="color: var(--red);">Gagal memuat performa jalur. Silakan muat ulang.</div>';
  }
}

// Lazy Load API Status Tab
async function loadApiStatusTab() {
  const container = document.getElementById('api-status-list');
  if (!container || container.dataset.loaded === 'true') return;
  
  container.innerHTML = '<div style="color: var(--text-secondary);">Memeriksa endpoint API...</div>';
  
  const endpoints = [
    { name: 'KPI Overview', path: '/api/kpi' },
    { name: 'Delay Trend', path: '/api/delay-trend' },
    { name: 'Status Distribution', path: '/api/status-distribution' },
    { name: 'Line Performance', path: '/api/line-performance' },
    { name: 'Time Pattern', path: '/api/time-pattern' },
  ];
  
  container.innerHTML = '';
  endpoints.forEach(ep => {
    const item = document.createElement('div');
    item.className = 'api-status-item';
    item.innerHTML = `
      <div class="api-status-left">
        <div class="api-status-dot"></div>
        <div>
          <div class="api-status-path">${ep.path}</div>
          <div class="api-status-name">${ep.name}</div>
        </div>
      </div>
      <span class="api-status-badge">Online</span>
    `;
    container.appendChild(item);
  });
  
  container.dataset.loaded = 'true';
}

// 2. AJAX Predictor Form Submission
function initWidgetPredictor() {
  const forms = document.querySelectorAll('.predict-inline-form');
  
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('.btn-predict');
      const textBtn = submitBtn.querySelector('.btn-text');
      const spinner = submitBtn.querySelector('.spinner');
      const resultWrapper = document.getElementById('widget-result-container');
      
      // Setup loading UI
      submitBtn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
      if (textBtn) textBtn.textContent = 'Memproses...';
      
      // Gather inputs
      const line = form.querySelector('[name="line"]').value;
      const type = form.querySelector('[name="type"]').value;
      const stop_sequence = form.querySelector('[name="stop_sequence"]').value;
      const is_weekend = form.querySelector('[name="is_weekend"]').value;
      const from_id = form.querySelector('[name="from_id"]').value;
      const to_id = form.querySelector('[name="to_id"]').value;
      const departure_time = form.querySelector('[name="departure_time"]').value;
      
      try {
        const res = await fetch('/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ line, type, stop_sequence, is_weekend, from_id, to_id, departure_time })
        });
        
        const data = await res.json();
        
        if (data.success && data.result) {
          renderPredictionResult(data.result);
          if (resultWrapper) {
            resultWrapper.style.display = 'block';
            // Smooth scroll to results
            resultWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          showPredictionError(data.error || 'Terjadi kesalahan sistem.');
        }
      } catch (err) {
        console.error('Prediction failed', err);
        showPredictionError('Gagal menghubungkan ke server prediksi.');
      } finally {
        // Reset button loading UI
        submitBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (textBtn) textBtn.textContent = 'Prediksi Sekarang';
      }
    });
  });
}

// Helper to render AJAX predictions
function renderPredictionResult(result) {
  const container = document.getElementById('widget-result-container');
  if (!container) return;
  
  const label = result.label;
  const confidence = result.confidence;
  const probabilities = result.probabilities;
  
  let interpretationText = '';
  if (label === 'departed') {
    interpretationText = 'Kereta kemungkinan besar akan berangkat tepat waktu sesuai jadwal.';
  } else if (label === 'estimated') {
    interpretationText = 'Kereta berpotensi mengalami keterlambatan operasional.';
  } else {
    interpretationText = 'Kereta berpotensi dibatalkan. Mohon periksa papan jadwal stasiun terdekat.';
  }
  
  let probaHtml = '';
  for (const [cls, pct] of Object.entries(probabilities)) {
    probaHtml += `
      <div class="proba-row">
        <div class="proba-label">${cls}</div>
        <div class="proba-bar-wrap">
          <div class="proba-bar proba-bar--${cls}" style="width: ${pct}%"></div>
        </div>
        <div class="proba-pct">${pct}%</div>
      </div>
    `;
  }
  
  container.innerHTML = `
    <div class="result-card result-card--${label}">
      <div class="result-grid-layout">
        <div class="result-primary-info">
          <div class="result-badge">Prediksi Hasil</div>
          <div class="result-status">${label}</div>
          <div class="result-confidence">Tingkat Keyakinan (Confidence): ${confidence}%</div>
          <div class="result-interpret">${interpretationText}</div>
        </div>
        <div class="result-probabilities">
          <div class="result-proba-title">Probabilitas per Kelas</div>
          <div class="proba-bars">
            ${probaHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper to show prediction errors in widget
function showPredictionError(msg) {
  const container = document.getElementById('widget-result-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="result-error" style="background: rgba(239, 68, 68, 0.08); border: 1px solid var(--red); border-radius: var(--radius); padding: 20px; text-align: center; color: var(--red);">
      <div style="font-size: 13.5px; font-weight: 600;">${msg}</div>
    </div>
  `;
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
