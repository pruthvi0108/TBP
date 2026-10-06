import os
import joblib
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger("aquaculture.ml")

class MLService:
    def __init__(self):
        self.model = None
        self._is_loaded = False

    def load_model(self, model_path: str):
        """Loads the pre-trained ML regression model ONCE at application startup."""
        try:
            # Check multiple potential locations for model.pkl
            possible_paths = [
                model_path,
                os.path.join(os.getcwd(), model_path),
                os.path.join(os.path.dirname(__file__), "..", "..", model_path),
                os.path.join(os.path.dirname(__file__), "..", "..", "model.pkl"),
                os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ml", "dissolved_oxygen_model.pkl"),
            ]
            
            full_path = None
            for p in possible_paths:
                abs_p = os.path.abspath(p)
                if os.path.exists(abs_p):
                    full_path = abs_p
                    break

            if full_path and os.path.exists(full_path):
                self.model = joblib.load(full_path)
                self._is_loaded = True
                logger.info(f"[ML] Model loaded successfully from {full_path}")
            else:
                logger.warning(f"[ML] Model file not found at {model_path}. Using physical fallback ML formula.")
                self._is_loaded = False
        except Exception as e:
            logger.error(f"[ML] Error loading model file {model_path}: {e}. Falling back to physics formula.")
            self._is_loaded = False

    def predict_dissolved_oxygen(self, temperature: float, turbidity: float) -> float:
        """
        Takes water temperature (°C) and turbidity (NTU), returning predicted Dissolved Oxygen (mg/L).
        Constructs a pandas DataFrame as requested to feed into model.pkl.
        """
        if self._is_loaded and self.model is not None:
            try:
                # Construct pandas DataFrame supporting expected column name variations
                df = pd.DataFrame([{
                    "water_temperature": temperature,
                    "temperature": temperature,
                    "temperatur": temperature,
                    "turbidity": turbidity
                }])

                # Detect model's expected input columns if available
                feature_names = getattr(self.model, "feature_names_in_", None)
                if feature_names is not None:
                    # Filter/reorder DataFrame columns to match feature_names_in_ exactly
                    df_input = df[[col for col in feature_names if col in df.columns]]
                else:
                    df_input = df

                prediction = self.model.predict(df_input)[0]
                do_value = round(float(prediction), 2)
                logger.info(f"[ML] Predicted DO: {do_value} mg/L (Temp: {temperature}°C, Turbidity: {turbidity} NTU)")
                return do_value
            except Exception as e:
                logger.error(f"[ML] DataFrame model prediction error: {e}. Trying fallback numpy array.")
                try:
                    features = np.array([[temperature, turbidity]])
                    prediction = self.model.predict(features)[0]
                    return round(float(prediction), 2)
                except Exception as inner_e:
                    logger.error(f"[ML] Fallback array prediction error: {inner_e}")

        # Physical fallback formula
        base_do = 11.2 - 0.12 * temperature - 0.0005 * (temperature ** 2)
        turbidity_penalty = 0.015 * turbidity + 0.00012 * (turbidity ** 2)
        fallback_do = max(1.5, min(10.0, base_do - turbidity_penalty))
        do_value = round(float(fallback_do), 2)
        logger.info(f"[ML] (Fallback) Predicted DO: {do_value} mg/L")
        return do_value

ml_service = MLService()
