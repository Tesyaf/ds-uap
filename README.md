# 🚆 NJ Transit Rail Analytics Dashboard

Flask web app untuk visualisasi dan prediksi performa kereta NJ Transit & Amtrak (Maret 2018).

## Struktur Proyek

```
nj_transit_dashboard/
├── app.py                    ← Flask routes utama
├── requirements.txt
├── Procfile                  ← Railway deploy
├── utils/
│   ├── data_loader.py        ← Load CSV ke dict
│   └── charts.py             ← (placeholder server-side charts)
├── models/
│   └── model_final.pkl       ← ← LETAKKAN FILE MODEL DI SINI
├── data/
│   ├── nj_transit_clean.csv          ← Export dari notebook
│   ├── summary_line_month.csv        ← Export dari notebook
│   ├── summary_time_pattern.csv      ← Export dari notebook
│   ├── summary_stop_sequence.csv     ← Export dari notebook
│   └── summary_daily.csv             ← Export dari notebook
├── templates/
│   ├── base.html
│   ├── index.html            ← Executive Overview
│   ├── dashboard.html        ← Operational Charts
│   ├── analysis.html         ← EDA Page
│   ├── predict.html          ← Prediksi ML
│   └── about.html            ← Info Proyek
└── static/
    ├── css/main.css
    └── js/
        ├── main.js
        ├── charts_overview.js
        ├── charts_dashboard.js
        └── charts_analysis.js
```

## Setup Lokal

```bash
# 1. Clone / download project ini
cd ds_uap

# 2. Buat virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Letakkan file XLSX ke folder data/
#    → data/nj_transit_performance_dashboard.xlsx
#    (lihat bagian "Export dari Notebook" di bawah)

# 5. Letakkan model ke folder models/
#    joblib.dump(model_final, 'models/model_final.pkl')

# 6. Jalankan
python app.py
# Buka http://localhost:5000
```

## Export dari Notebook

Tambahkan cell ini di akhir notebook, hasilnya **satu file XLSX** dengan 5 sheet:

```python
import os
import pandas as pd
import joblib

os.makedirs('data', exist_ok=True)
os.makedirs('models', exist_ok=True)

# ── Sheet 1: Raw_Clean_Data ───────────────────────────────────
cols_export = ['date','train_id','line','type','stop_sequence',
               'from_id','to_id','delay_minutes','status',
               'month','dayofweek','hour','is_weekend','is_peak_hour']
df_raw = df[cols_export].copy()
df_raw['date'] = pd.to_datetime(df_raw['date']).dt.strftime('%Y-%m-%d')

# ── Sheet 2: Summary_Line_Month ───────────────────────────────
df_line_month = df.groupby(['line','type','month']).agg(
    total_trips=('train_id','count'),
    avg_delay=('delay_minutes','mean'),
    cancelled=('status', lambda x: (x=='cancelled').sum()),
    on_time=('status', lambda x: (x=='departed').sum()),
).reset_index()
df_line_month['cancellation_rate'] = (df_line_month['cancelled'] / df_line_month['total_trips'] * 100).round(2)
df_line_month['on_time_rate']      = (df_line_month['on_time']   / df_line_month['total_trips'] * 100).round(2)

# ── Sheet 3: Summary_Time_Pattern ────────────────────────────
df_time = df.groupby(['hour','dayofweek','is_weekend','is_peak_hour']).agg(
    total_trips=('train_id','count'),
    avg_delay=('delay_minutes','mean'),
    cancellation_count=('status', lambda x: (x=='cancelled').sum()),
).reset_index()

# ── Sheet 4: Summary_Stop_Sequence ───────────────────────────
df_stop = df.groupby(['stop_sequence','line']).agg(
    avg_delay=('delay_minutes','mean'),
    total=('train_id','count'),
).reset_index()

# ── Sheet 5: Summary_Daily_Trend ─────────────────────────────
df['date'] = pd.to_datetime(df['date'])
df_daily = df.groupby('date').agg(
    total=('train_id','count'),
    on_time=('status', lambda x: (x=='departed').sum()),
    avg_delay=('delay_minutes','mean'),
    cancelled=('status', lambda x: (x=='cancelled').sum()),
).reset_index()
df_daily['on_time_rate'] = (df_daily['on_time'] / df_daily['total'] * 100).round(2)
df_daily['date'] = df_daily['date'].dt.strftime('%Y-%m-%d')

# ── Tulis ke satu file XLSX ───────────────────────────────────
xlsx_path = 'data/nj_transit_performance_dashboard.xlsx'
with pd.ExcelWriter(xlsx_path, engine='openpyxl') as writer:
    df_raw.to_excel(writer,        sheet_name='Raw_Clean_Data',        index=False)
    df_line_month.to_excel(writer, sheet_name='Summary_Line_Month',    index=False)
    df_time.to_excel(writer,       sheet_name='Summary_Time_Pattern',  index=False)
    df_stop.to_excel(writer,       sheet_name='Summary_Stop_Sequence', index=False)
    df_daily.to_excel(writer,      sheet_name='Summary_Daily_Trend',   index=False)

print(f"✅ XLSX tersimpan di: {xlsx_path}")

# ── Save model ────────────────────────────────────────────────
joblib.dump(model_final, 'models/model_final.pkl')
print("✅ Model tersimpan di: models/model_final.pkl")
```

> **Catatan:** `data_loader.py` secara otomatis mendeteksi file XLSX dan membaca semua sheet sekaligus. Kalau file XLSX tidak ada, ia akan fallback ke CSV individual (backward compatible).

## Deploy ke Railway

```bash
# Pastikan sudah ada Procfile dan requirements.txt
# Push ke GitHub, lalu connect repo ke Railway
# Set environment variable PORT (Railway auto-set)
```

## Pages

| URL | Deskripsi |
|-----|-----------|
| `/` | Executive Overview — KPI + chart ringkasan |
| `/dashboard` | Operational Dashboard — chart interaktif per jam/hari/stop |
| `/analysis` | EDA Analysis — distribusi, korelasi, insight |
| `/predict` | Prediksi status kereta dengan Random Forest |
| `/about` | Info dataset, model metrics, tech stack |

## API Endpoints

| Endpoint | Data |
|----------|------|
| `GET /api/status-distribution` | Status count |
| `GET /api/delay-trend` | Daily avg delay |
| `GET /api/line-performance` | Top 15 lines by delay |
| `GET /api/time-pattern` | Hour/day pattern |
| `GET /api/stop-delay?line=X` | Delay per stop (filter by line) |
| `GET /api/kpi` | KPI summary |
