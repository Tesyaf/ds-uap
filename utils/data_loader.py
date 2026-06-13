"""
utils/data_loader.py
Memuat semua sheet dari file XLSX ke dalam dict summary_data.

Struktur XLSX yang diharapkan (5 sheet):
  - Raw_Clean_Data       → key: "raw"
  - Summary_Line_Month   → key: "line_month"
  - Summary_Time_Pattern → key: "time_pattern"
  - Summary_Stop_Sequence→ key: "stop_sequence"
  - Summary_Daily_Trend  → key: "daily"
"""

import os
import pandas as pd


# Nama file XLSX default yang dicari di folder data/
XLSX_FILENAME = "nj_transit_performance_dashboard.xlsx"

# Mapping sheet name di xlsx → key internal
SHEET_MAP = {
    "Raw_Clean_Data":        "raw",
    "Summary_Line_Month":    "line_month",
    "Summary_Time_Pattern":  "time_pattern",
    "Summary_Stop_Sequence": "stop_sequence",
    "Summary_Daily_Trend":   "daily",
}


def load_summary_data(data_dir: str) -> dict:
    """
    Baca semua sheet dari file XLSX di data_dir.
    Fallback ke CSV individual jika XLSX tidak ditemukan.
    Kembalikan dict berisi DataFrame + KPI dict.
    """
    result = {}

    xlsx_path = os.path.join(data_dir, XLSX_FILENAME)

    if os.path.exists(xlsx_path):
        result = _load_from_xlsx(xlsx_path)
    else:
        # Fallback: baca CSV per file (backward compat)
        result = _load_from_csv(data_dir)

    result["kpi"]   = _compute_kpi(result)
    result["lines"] = _get_lines(result)

    return result


def _load_from_xlsx(xlsx_path: str) -> dict:
    """Baca semua sheet sekaligus dengan pd.read_excel."""
    result = {v: None for v in SHEET_MAP.values()}

    try:
        all_sheets = pd.read_excel(xlsx_path, sheet_name=None, engine="openpyxl")
    except Exception as e:
        print(f"[data_loader] Gagal baca XLSX: {e}")
        return result

    for sheet_name, key in SHEET_MAP.items():
        if sheet_name in all_sheets:
            df = all_sheets[sheet_name]
            df = _clean_df(df, key)
            result[key] = df
        else:
            print(f"[data_loader] Sheet '{sheet_name}' tidak ditemukan di XLSX.")

    return result


def _load_from_csv(data_dir: str) -> dict:
    """Fallback: baca file CSV satu per satu."""
    file_map = {
        "line_month":    "summary_line_month.csv",
        "time_pattern":  "summary_time_pattern.csv",
        "stop_sequence": "summary_stop_sequence.csv",
        "daily":         "summary_daily.csv",
        "raw":           "nj_transit_clean.csv",
    }
    result = {}
    for key, filename in file_map.items():
        path = os.path.join(data_dir, filename)
        if os.path.exists(path):
            df = pd.read_csv(path)
            df = _clean_df(df, key)
            result[key] = df
        else:
            result[key] = None
    return result


def _clean_df(df: pd.DataFrame, key: str) -> pd.DataFrame:
    """Normalisasi kolom umum setelah load."""
    # Kolom 'date' di Raw_Clean_Data adalah serial Excel (angka int)
    # di Summary_Daily_Trend sudah string YYYY-MM-DD
    if "date" in df.columns:
        try:
            # Coba parse sebagai tanggal biasa dulu
            parsed = pd.to_datetime(df["date"], errors="coerce")
            # Jika banyak NaT, kemungkinan serial Excel — konversi manual
            if parsed.isna().mean() > 0.5:
                df["date"] = pd.to_datetime(
                    df["date"].astype(float) - 25569,
                    unit="D",
                    origin="unix"
                ).dt.strftime("%Y-%m-%d")
            else:
                df["date"] = parsed.dt.strftime("%Y-%m-%d")
        except Exception:
            pass  # Biarkan apa adanya kalau gagal

    # Pastikan tipe numerik untuk kolom kunci
    numeric_cols = ["avg_delay", "cancellation_rate", "on_time_rate",
                    "total_trips", "total", "avg_delay", "cancellation_count"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def _compute_kpi(data: dict) -> dict:
    daily = data.get("daily")
    line_month = data.get("line_month")

    kpi = {
        "total_trips": "N/A",
        "on_time_rate": "N/A",
        "avg_delay": "N/A",
        "cancellation_rate": "N/A",
        "total_lines": "N/A",
        "worst_line": "N/A",
    }

    if daily is not None:
        kpi["total_trips"] = f"{int(daily['total'].sum()):,}"
        kpi["on_time_rate"] = f"{daily['on_time_rate'].mean():.1f}%"
        kpi["avg_delay"] = f"{daily['avg_delay'].mean():.2f} min"

    if line_month is not None:
        kpi["total_lines"] = str(line_month["line"].nunique())
        kpi["cancellation_rate"] = f"{line_month['cancellation_rate'].mean():.2f}%"
        worst = (
            line_month.groupby("line")["avg_delay"]
            .mean()
            .idxmax()
        )
        kpi["worst_line"] = worst

    return kpi


def _get_lines(data: dict) -> list:
    line_month = data.get("line_month")
    if line_month is not None and "line" in line_month.columns:
        return sorted(line_month["line"].dropna().unique().tolist())
    return []
