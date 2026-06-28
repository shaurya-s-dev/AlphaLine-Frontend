import numpy as np
import pandas as pd
import joblib
import os
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'alphaline_model.pkl')


def generate_training_data(n_samples: int = 8000):
    np.random.seed(42)
    rows = []

    for _ in range(n_samples):
        rsi = np.random.uniform(20, 80)
        volume_delta = np.random.exponential(0.3) + 0.7
        momentum = np.random.normal(0, 0.02)
        price_position = np.random.uniform(0, 1)
        macd_signal = np.random.normal(0, 1)
        bb_position = np.random.uniform(0, 1)
        atr_pct = np.random.uniform(0.01, 0.04)

        bullish = (
            max(0, (50 - rsi) / 30) * 0.30 +
            min(1, max(0, volume_delta - 1)) * 0.25 +
            min(1, max(0, momentum * 20)) * 0.20 +
            max(0, 0.5 - price_position) * 0.15 +
            min(1, max(0, -macd_signal * 0.3)) * 0.05 +
            max(0, 0.5 - bb_position) * 0.05
        )

        noise = np.random.normal(0, 0.05)
        score = bullish + noise

        if score > 0.18:
            label = 1   # BUY
        elif score < -0.05:
            label = 2   # SELL
        else:
            label = 0   # HOLD

        rows.append([rsi, volume_delta, momentum,
                     price_position, macd_signal,
                     bb_position, atr_pct, label])

    cols = ['rsi', 'volume_delta', 'momentum',
            'price_position', 'macd_signal',
            'bb_position', 'atr_pct', 'label']
    return pd.DataFrame(rows, columns=cols)


def train_and_save():
    print("[ML] Training XGBoost model on 8000 samples...")
    df = generate_training_data(8000)
    X = df.drop('label', axis=1)
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    base = XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        random_state=42,
        eval_metric='mlogloss',
        verbosity=0,
    )

    model = CalibratedClassifierCV(base, cv=3, method='isotonic')
    model.fit(X_train, y_train)

    acc = model.score(X_test, y_test)
    print(f"[ML] Accuracy: {acc:.2%}")

    joblib.dump(model, MODEL_PATH)
    print(f"[ML] Model saved to {MODEL_PATH}")
    return model


if __name__ == '__main__':
    train_and_save()
