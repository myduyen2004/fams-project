#!/usr/bin/env python3
"""
Train a lightweight Logistic Regression model for internal assignment plagiarism checks.

Input CSV columns:
- text_score
- file_name_score
- image_score
- metadata_score
- label

Example:
python3 backend/scripts/train_assignment_plagiarism_model.py \
  --input backend/scripts/assignment_plagiarism_training_template.csv \
  --output backend/src/main/resources/ml/assignment-plagiarism-model.json
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import List


FEATURE_COLUMNS = [
    "text_score",
    "file_name_score",
    "image_score",
    "metadata_score",
]


@dataclass
class TrainingRow:
    text_score: float
    file_name_score: float
    image_score: float
    metadata_score: float
    label: int

    def feature_vector(self) -> List[float]:
        return [
            self.text_score,
            self.file_name_score,
            self.image_score,
            self.metadata_score,
        ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train assignment plagiarism logistic regression model")
    parser.add_argument(
        "--input",
        default="backend/scripts/assignment_plagiarism_training_template.csv",
        help="Path to labeled training CSV",
    )
    parser.add_argument(
        "--output",
        default="backend/src/main/resources/ml/assignment-plagiarism-model.json",
        help="Path to exported model JSON",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.5,
        help="Decision threshold for plagiarized=true",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=2500,
        help="Training epochs for fallback trainer if sklearn is unavailable",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=0.1,
        help="Learning rate for fallback trainer if sklearn is unavailable",
    )
    return parser.parse_args()


def load_rows(path: Path) -> List[TrainingRow]:
    rows: List[TrainingRow] = []
    with path.open("r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for raw in reader:
            rows.append(
                TrainingRow(
                    text_score=float(raw["text_score"]),
                    file_name_score=float(raw["file_name_score"]),
                    image_score=float(raw["image_score"]),
                    metadata_score=float(raw["metadata_score"]),
                    label=int(raw["label"]),
                )
            )
    if not rows:
        raise ValueError("Training CSV is empty")
    labels = {row.label for row in rows}
    if labels != {0, 1}:
        raise ValueError("Training CSV must contain both label 0 and 1")
    return rows


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + pow(2.718281828459045, -value))


def train_with_sklearn(rows: List[TrainingRow]):
    from sklearn.linear_model import LogisticRegression

    x = [row.feature_vector() for row in rows]
    y = [row.label for row in rows]
    model = LogisticRegression(max_iter=2000, class_weight="balanced")
    model.fit(x, y)

    predictions = model.predict_proba(x)
    probs = [float(item[1]) for item in predictions]
    return {
        "bias": float(model.intercept_[0]),
        "weights": {
            "textScore": float(model.coef_[0][0]),
            "fileNameScore": float(model.coef_[0][1]),
            "imageScore": float(model.coef_[0][2]),
            "metadataScore": float(model.coef_[0][3]),
        },
        "training_accuracy": mean(
            1.0 if ((prob >= 0.5) == bool(label)) else 0.0
            for prob, label in zip(probs, y)
        ),
        "training_prob_mean": mean(probs),
        "trainer": "sklearn",
    }


def train_with_gradient_descent(rows: List[TrainingRow], epochs: int, lr: float):
    weights = [0.0, 0.0, 0.0, 0.0]
    bias = 0.0
    x = [row.feature_vector() for row in rows]
    y = [row.label for row in rows]

    for _ in range(epochs):
        grad_w = [0.0, 0.0, 0.0, 0.0]
        grad_b = 0.0
        for features, label in zip(x, y):
            linear = bias + sum(w * f for w, f in zip(weights, features))
            prediction = sigmoid(linear)
            error = prediction - label
            for index, feature in enumerate(features):
                grad_w[index] += error * feature
            grad_b += error

        size = float(len(rows))
        for index in range(len(weights)):
            weights[index] -= lr * (grad_w[index] / size)
        bias -= lr * (grad_b / size)

    probs = [sigmoid(bias + sum(w * f for w, f in zip(weights, features))) for features in x]
    return {
        "bias": bias,
        "weights": {
            "textScore": weights[0],
            "fileNameScore": weights[1],
            "imageScore": weights[2],
            "metadataScore": weights[3],
        },
        "training_accuracy": mean(
            1.0 if ((prob >= 0.5) == bool(label)) else 0.0
            for prob, label in zip(probs, y)
        ),
        "training_prob_mean": mean(probs),
        "trainer": "gradient-descent-fallback",
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    rows = load_rows(input_path)

    try:
        result = train_with_sklearn(rows)
    except Exception as exc:
        print(f"sklearn unavailable or failed ({exc}); falling back to manual gradient descent")
        result = train_with_gradient_descent(rows, epochs=args.epochs, lr=args.lr)

    payload = {
        "modelName": "logistic-regression-v1-trained",
        "threshold": args.threshold,
        "bias": round(result["bias"], 8),
        "weights": {key: round(value, 8) for key, value in result["weights"].items()},
        "featureOrder": [
            "textScore",
            "fileNameScore",
            "imageScore",
            "metadataScore",
        ],
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(input_path),
        "trainer": result["trainer"],
        "metrics": {
            "trainingAccuracy": round(float(result["training_accuracy"]), 6),
            "trainingProbabilityMean": round(float(result["training_prob_mean"]), 6),
            "trainingRows": len(rows),
            "positiveRows": sum(row.label for row in rows),
            "negativeRows": len(rows) - sum(row.label for row in rows),
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Model written to {output_path}")
    print(json.dumps(payload["metrics"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
