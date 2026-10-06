import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

def generate_aquaculture_data(n_samples: int = 2500, random_seed: int = 42):
    """
    Generate realistic aquaculture dataset based on physical water chemistry:
    - DO solubility vs Temperature
    - Biochemical Oxygen Demand (BOD) & photosynthesis inhibition vs Turbidity
    """
    np.random.seed(random_seed)
    
    # Temperature: 20°C to 36°C
    temperature = np.random.uniform(20.0, 36.0, n_samples)
    
    # Turbidity: 5 NTU to 120 NTU
    turbidity = np.random.uniform(5.0, 120.0, n_samples)
    
    # Base DO solubility curve (approximate oxygen saturation in fresh/brackish water)
    # At 20°C -> ~8.8 mg/L, 25°C -> ~8.1 mg/L, 30°C -> ~7.4 mg/L, 35°C -> ~6.8 mg/L
    base_do = 11.2 - 0.12 * temperature - 0.0005 * (temperature ** 2)
    
    # Turbidity penalty:
    # 5-30 NTU: minimal drop (0.0 to 0.4 mg/L)
    # 30-70 NTU: moderate drop (0.4 to 1.8 mg/L)
    # >70 NTU: severe BOD drop (1.8 to 3.5 mg/L)
    turbidity_penalty = 0.015 * turbidity + 0.00012 * (turbidity ** 2)
    
    # Combined DO calculation
    do = base_do - turbidity_penalty
    
    # Add random operational noise (+- 0.15 mg/L)
    noise = np.random.normal(0, 0.12, n_samples)
    predicted_do = np.clip(do + noise, 1.5, 10.0)
    
    X = np.column_stack((temperature, turbidity))
    y = predicted_do
    return X, y

def train_and_export():
    print("[ML TRAIN] Generating synthetic aquaculture water quality dataset...")
    X, y = generate_aquaculture_data(3000)
    
    # Train Random Forest Regressor
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X, y)
    
    # Evaluate
    y_pred = model.predict(X)
    mse = mean_squared_error(y, y_pred)
    r2 = r2_score(y, y_pred)
    print(f"[ML TRAIN] Model trained successfully! MSE: {mse:.4f}, R2 Score: {r2:.4f}")
    
    output_path = os.path.join(os.path.dirname(__file__), "dissolved_oxygen_model.pkl")
    joblib.dump(model, output_path)
    print(f"[ML TRAIN] Saved trained model to {output_path}")

if __name__ == "__main__":
    train_and_export()
