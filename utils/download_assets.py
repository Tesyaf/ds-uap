import os
import sys
import urllib.request
import urllib.error

def download_asset(repo, filepath, output_path, token=None):
    """Downloads a file from DagsHub Raw API (handles both Git and DVC files automatically)"""
    url = f"https://dagshub.com/api/v1/repos/{repo}/raw/main/{filepath}"
    print(f"Downloading asset from DagsHub: {url} -> {output_path}...")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
        
    try:
        with urllib.request.urlopen(req) as response, open(output_path, "wb") as out_file:
            out_file.write(response.read())
        print(f"✅ Success: Downloaded {filepath} to {output_path}")
        return True
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code} downloading {filepath}: {e.reason}")
        return False
    except Exception as e:
        print(f"❌ Error downloading {filepath}: {str(e)}")
        return False

def main():
    # Retrieve configuration from environment variables
    # These will be set in Railway's dashboard
    repo = os.environ.get("DAGSHUB_REPO") # e.g. "username/repo"
    token = os.environ.get("DAGSHUB_TOKEN") or os.environ.get("MLFLOW_TRACKING_PASSWORD")
    
    if not repo:
        print("⚠️ DAGSHUB_REPO env variable is not set. Skipping asset downloading.")
        print("Using local files if present in the build context.")
        return

    # Files to download (both are tracked via DVC on DagsHub)
    assets = [
        ("models/model_final.pkl", "models/model_final.pkl"),
        ("data/nj_transit_performance_dashboard.xlsx", "data/nj_transit_performance_dashboard.xlsx")
    ]
    
    success = True
    for remote_path, local_path in assets:
        # Check if file already exists locally (e.g. if copied from docker context)
        if os.path.exists(local_path) and os.path.getsize(local_path) > 1024:
            print(f"ℹ️ Asset {local_path} already exists locally and is not empty. Skipping download.")
            continue
            
        res = download_asset(repo, remote_path, local_path, token)
        if not res:
            success = False
            
    if not success:
        print("⚠️ Some assets failed to download. The app will start but features requiring the model or raw data may fail.")

if __name__ == "__main__":
    main()
