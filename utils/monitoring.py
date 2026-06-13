import os
import threading
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("model_monitoring")

_mlflow_available = False
try:
    import mlflow
    import dagshub
    _mlflow_available = True
except ImportError:
    logger.warning("MLflow or DagsHub library not installed. Prediction monitoring will fallback to local stdout logging.")

def log_prediction_async(input_data, prediction_result):
    """
    Logs prediction inputs and predicted output details to MLflow asynchronously.
    Runs in a background daemon thread to avoid blocking the main Flask thread.
    """
    if not _mlflow_available:
        logger.info(f"[Local Monitor Log] Input: {dict(input_data)} | Prediction: {prediction_result['label']} (conf: {prediction_result['confidence']}%)")
        return

    # Check for credentials in environment variables
    # Railway passes these when set in the dashboard
    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI")
    username = os.environ.get("MLFLOW_TRACKING_USERNAME")
    password = os.environ.get("MLFLOW_TRACKING_PASSWORD")

    # If URI isn't set, check if we can initialize via DagsHub repository env variable
    # e.g., DAGSHUB_REPO="username/repo-name"
    repo = os.environ.get("DAGSHUB_REPO")
    if not tracking_uri and repo:
        tracking_uri = f"https://dagshub.com/{repo}.mlflow"
        os.environ["MLFLOW_TRACKING_URI"] = tracking_uri

    if not tracking_uri:
        logger.info(f"[Local Monitor Log - No Remote Env] Input: {dict(input_data)} | Prediction: {prediction_result['label']} (conf: {prediction_result['confidence']}%)")
        return

    def _log_task():
        try:
            # Set credentials in environment for MLflow client
            if username:
                os.environ["MLFLOW_TRACKING_USERNAME"] = username
            if password:
                os.environ["MLFLOW_TRACKING_PASSWORD"] = password

            # Initialize MLflow tracking connection
            mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment("Production Monitoring")

            # Log prediction run
            with mlflow.start_run(run_name="live_prediction"):
                # Log inputs as parameters
                for key, val in input_data.items():
                    mlflow.log_param(f"input_{key}", val)

                # Log prediction outcomes
                mlflow.log_param("predicted_status", prediction_result["label"])
                mlflow.log_metric("confidence", prediction_result["confidence"])

                # Log class probabilities
                for cls, prob in prediction_result["probabilities"].items():
                    mlflow.log_metric(f"prob_{cls}", prob)

            logger.info("Successfully sent prediction logs to DagsHub MLflow server.")
        except Exception as e:
            logger.error(f"Failed to log prediction to MLflow: {str(e)}")

    # Start logging task in a daemon thread so it doesn't hold up Flask shutdown
    logging_thread = threading.Thread(target=_log_task)
    logging_thread.daemon = True
    logging_thread.start()
