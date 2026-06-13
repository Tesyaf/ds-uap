from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
import os
from utils.data_loader import load_summary_data
from utils.charts import build_status_chart, build_delay_trend, build_line_performance

app = Flask(__name__)

# ── Feature columns (must match training order exactly) ────────────────────────
LINE_NAMES = [
    "ACELA EXPRESS", "Amtrak", "CAROLINIAN", "Gladstone Branch",
    "KEYSTONE", "Morristown Line", "No Jersey Coast",
    "Princeton Shuttle", "REGIONAL",
]
TYPE_NAMES = ["Amtrak", "NJ Transit"]

# ── Station ID → Name mapping (from GTFS stops.txt) ───────────────────────────
STATION_NAMES = {
    1: "30th St. Philadelphia", 2: "Absecon", 3: "Allendale", 4: "Allenhurst",
    5: "Anderson Street", 6: "Annandale", 8: "Asbury Park", 9: "Atco",
    10: "Atlantic City", 11: "Avenel", 12: "Basking Ridge", 13: "Bay Head",
    14: "Bay Street", 15: "Belmar", 17: "Berkeley Heights", 18: "Bernardsville",
    19: "Bloomfield", 20: "Boonton", 21: "Bound Brook", 22: "Bradley Beach",
    23: "Brick Church", 24: "Bridgewater", 25: "Broadway", 26: "Campbell Hall",
    27: "Chatham", 28: "Cherry Hill", 29: "Clifton", 30: "Convent",
    31: "Roselle Park", 32: "Cranford", 33: "Delawanna", 34: "Denville",
    35: "Dover", 36: "Dunellen", 37: "East Orange", 38: "Edison Station",
    39: "Egg Harbor", 40: "Elberon", 41: "Elizabeth", 42: "Emerson",
    43: "Essex Street", 44: "Fanwood", 45: "Far Hills", 46: "Garfield",
    47: "Garwood", 48: "Gillette", 49: "Gladstone", 50: "Glen Ridge",
    51: "Glen Rock Boro Hall", 52: "Glen Rock Main Line", 54: "Hackettstown",
    55: "Hammonton", 57: "Harriman", 58: "Hawthorne", 59: "Hazlet",
    60: "High Bridge", 61: "Highland Avenue", 62: "Hillsdale", 63: "Hoboken",
    64: "Ho-Ho-Kus", 66: "Kingsland", 67: "Lake Hopatcong", 68: "Lebanon",
    69: "Lincoln Park", 70: "Linden", 71: "Lindenwold", 72: "Little Falls",
    73: "Little Silver", 74: "Long Branch", 75: "Lyndhurst", 76: "Lyons",
    77: "Madison", 78: "Mahwah", 79: "Manasquan", 81: "Maplewood",
    83: "Metropark", 84: "Metuchen", 85: "Middletown NJ", 86: "Middletown NY",
    87: "Millburn", 88: "Millington", 89: "Montclair Heights", 90: "Montvale",
    91: "Morris Plains", 92: "Morristown", 93: "Mount Olive", 94: "Mount Tabor",
    95: "Mountain Avenue", 96: "Mountain Lakes", 97: "Mountain Station",
    98: "Mountain View", 99: "Murray Hill", 100: "Nanuet", 101: "Netcong",
    102: "Netherwood", 103: "New Brunswick", 104: "New Providence",
    105: "New York Penn Station", 106: "Newark Broad St", 107: "Newark Penn Station",
    108: "North Branch", 109: "North Elizabeth", 110: "New Bridge Landing",
    111: "Oradell", 112: "Orange", 113: "Otisville", 114: "Park Ridge",
    115: "Passaic", 116: "Paterson", 117: "Peapack", 118: "Pearl River",
    119: "Perth Amboy", 120: "Plainfield", 121: "Plauderville",
    122: "Point Pleasant", 123: "Port Jervis", 124: "Princeton",
    125: "Princeton Junction", 126: "Radburn", 127: "Rahway", 128: "Ramsey",
    129: "Raritan", 130: "Red Bank", 131: "Ridgewood", 132: "River Edge",
    134: "Rutherford", 135: "Salisbury Mills-Cornwall", 136: "Short Hills",
    137: "Sloatsburg", 138: "Somerville", 139: "South Amboy", 140: "South Orange",
    141: "Spring Lake", 142: "Spring Valley", 143: "Stirling", 144: "Suffern",
    145: "Summit", 146: "Teterboro", 147: "Towaco", 148: "Trenton Transit Center",
    149: "Tuxedo", 150: "Upper Montclair", 151: "Waldwick", 152: "Walnut Street",
    153: "Watchung Avenue", 154: "Watsessing Avenue", 155: "Westfield",
    156: "Westwood", 157: "White House", 158: "Woodbridge", 159: "Woodcliff Lake",
    160: "Wood-Ridge",
    # Amtrak / newer stations
    32905: "Hamilton", 32906: "Jersey Ave.",
    37169: "Aberdeen-Matawan", 37953: "Newark Airport",
    38081: "MSU", 38105: "Union",
    38174: "Secaucus Lower Lvl", 38187: "Secaucus Upper Lvl",
    38417: "Ramsey Route 17", 39472: "Mount Arlington",
    39635: "Wayne/Route 23", 43298: "Pennsauken Transit Center",
    43599: "Wesmont",
}

# ── Load data sekali saat startup ──────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model_final.pkl")

summary_data = load_summary_data(DATA_DIR)
model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Landing page — ringkasan eksekutif."""
    kpi = summary_data.get("kpi", {})
    lines = LINE_NAMES
    stations_sorted = sorted(STATION_NAMES.items(), key=lambda x: x[1])
    return render_template(
        "index.html", kpi=kpi, active="home",
        lines=lines, type_names=TYPE_NAMES,
        stations=stations_sorted
    )


@app.route("/dashboard")
def dashboard():
    """Halaman dashboard utama dengan chart interaktif."""
    return render_template("dashboard.html", active="dashboard")


@app.route("/predict", methods=["GET", "POST"])
def predict():
    """Halaman prediksi status kereta."""
    result = None
    error = None

    if request.method == "POST":
        try:
            # Mendukung input JSON (untuk AJAX) atau form submission
            data = request.json if request.is_json else request.form
            features = _extract_features(data)
            if model is not None:
                proba = model.predict_proba([features])[0]
                classes = ["cancelled", "departed", "estimated"]
                result = {
                    "label": classes[int(np.argmax(proba))],
                    "confidence": round(float(np.max(proba)) * 100, 1),
                    "probabilities": {c: round(float(p) * 100, 1) for c, p in zip(classes, proba)},
                    "features": dict(data),
                }
                # Jika request adalah AJAX / minta JSON, return JSON
                if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.headers.get("Accept") == "application/json":
                    return jsonify({"success": True, "result": result})
            else:
                error = "Model belum dimuat. Jalankan training terlebih dahulu."
                if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.headers.get("Accept") == "application/json":
                    return jsonify({"success": False, "error": error}), 500
        except Exception as e:
            error = f"Error saat prediksi: {str(e)}"
            if request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.headers.get("Accept") == "application/json":
                return jsonify({"success": False, "error": error}), 500

    from flask import redirect, url_for
    return redirect(url_for("index"))


@app.route("/analysis")
def analysis():
    """Halaman analisis EDA interaktif."""
    return render_template("analysis.html", active="analysis")


@app.route("/about")
def about():
    """Tentang proyek dan dataset."""
    return render_template("about.html", active="about")


# ── API Endpoints (dipanggil oleh JS untuk chart dinamis) ──────────────────────

@app.route("/api/status-distribution")
def api_status():
    df = summary_data.get("line_month")
    if df is None:
        return jsonify({"error": "Data tidak ditemukan"}), 404
    
    # Hitung data status distribution dari Summary_Line_Month
    total = int(df["total_trips"].sum())
    on_time = int(df["on_time"].sum())
    cancelled = int(df["cancelled"].sum())
    estimated = total - on_time - cancelled
    
    data = [
        {"status": "departed", "total_trips": on_time},
        {"status": "estimated", "total_trips": estimated},
        {"status": "cancelled", "total_trips": cancelled}
    ]
    return jsonify(data)


@app.route("/api/delay-trend")
def api_delay_trend():
    df = summary_data.get("daily")
    if df is None:
        return jsonify({"error": "Data tidak ditemukan"}), 404
    data = df[["date", "avg_delay", "on_time_rate"]].to_dict(orient="records")
    return jsonify(data)


@app.route("/api/line-performance")
def api_line_performance():
    df = summary_data.get("line_month")
    if df is None:
        return jsonify({"error": "Data tidak ditemukan"}), 404
    grouped = (
        df.groupby("line")
        .agg(avg_delay=("avg_delay", "mean"), cancellation_rate=("cancellation_rate", "mean"))
        .reset_index()
        .sort_values("avg_delay", ascending=False)
        .head(15)
    )
    return jsonify(grouped.to_dict(orient="records"))


@app.route("/api/time-pattern")
def api_time_pattern():
    df = summary_data.get("time_pattern")
    if df is None:
        return jsonify({"error": "Data tidak ditemukan"}), 404
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/stop-delay")
def api_stop_delay():
    df = summary_data.get("stop_sequence")
    if df is None:
        return jsonify({"error": "Data tidak ditemukan"}), 404
    line = request.args.get("line", None)
    if line:
        df = df[df["line"] == line]
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/kpi")
def api_kpi():
    return jsonify(summary_data.get("kpi", {}))


# ── Helper ─────────────────────────────────────────────────────────────────────

def _extract_features(form):
    """Konversi form input ke array fitur sesuai urutan training (15 features).

    Feature order:
      stop_sequence, from_id, to_id, is_weekend,
      line_ACELA EXPRESS, line_Amtrak, ..., line_REGIONAL,
      type_Amtrak, type_NJ Transit
    """
    def _safe_float(val, default):
        if val is None or val == "":
            return float(default)
        try:
            return float(val)
        except (ValueError, TypeError):
            return float(default)

    def _safe_int(val, default):
        if val is None or val == "":
            return int(default)
        try:
            return int(val)
        except (ValueError, TypeError):
            return int(default)

    feats = [
        _safe_float(form.get("stop_sequence"), 5),
        _safe_float(form.get("from_id"), 105),
        _safe_float(form.get("to_id"), 38187),
        _safe_int(form.get("is_weekend"), 0),
    ]

    # One-hot encode line
    selected_line = form.get("line", "")
    for ln in LINE_NAMES:
        feats.append(1 if ln == selected_line else 0)

    # One-hot encode type
    selected_type = form.get("type", "")
    for tp in TYPE_NAMES:
        feats.append(1 if tp == selected_type else 0)

    return feats


# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
