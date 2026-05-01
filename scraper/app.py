"""
Flask scraper microservice.
Exposes two endpoints consumed only by Django (protected by X-Internal-Key):
  POST /scrape           — enqueue a Celery task, return task_id
  GET  /scrape/status/<id> — return Celery task state + result
"""

import os

from decouple import config
from flask import Flask, jsonify, request

from tasks import celery_app, scrape_source

app = Flask(__name__)

INTERNAL_API_KEY = config("INTERNAL_API_KEY", default="dev-internal-key")


def _check_key():
    key = request.headers.get("X-Internal-Key", "")
    return key == INTERNAL_API_KEY


@app.route("/scrape", methods=["POST"])
def trigger_scrape():
    if not _check_key():
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True)
    source_id = data.get("source_id")
    source_type = data.get("source_type", "scrape")
    url = data.get("url", "")
    selector_config = data.get("selector_config", {})

    task = scrape_source.delay(source_id, source_type, url, selector_config)
    return jsonify({"task_id": task.id}), 202


@app.route("/scrape/status/<task_id>", methods=["GET"])
def scrape_status(task_id):
    if not _check_key():
        return jsonify({"error": "Forbidden"}), 403

    result = celery_app.AsyncResult(task_id)
    return jsonify(
        {
            "task_id": task_id,
            "state": result.state,
            "result": result.result if result.ready() else None,
        }
    )


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
