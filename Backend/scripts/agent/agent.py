"""
The code below is a Flask-based agent that interacts with a scheduler to manage Docker container deployments.
It includes endpoints for starting deployments, checking logs, and canceling deployments. 
The agent also sends periodic heartbeat signals to the scheduler with its status and resource usage.
"""

import os
import time
import uuid
import threading
import docker
from dotenv import load_dotenv
import requests
import psutil
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv(dotenv_path="agent.env")

app = Flask(__name__)
CORS(app)
docker_client = docker.from_env()

AGENT_IP = os.getenv("AGENT_IP", "localhost:5001")
AGENT_PORT = os.getenv("AGENT_PORT", 5001)
AGENT_ID = str(uuid.uuid4())
SCHEDULER_URL = os.getenv("SCHEDULER_URL", "http://localhost:5000")

# Global state for the agent: "Free" or "Busy"
agent_state = "Free"

# Dictionary to track ongoing deployments.
# Keys: deployment_id
# Values: {
#               "container": <container_object>,
#               "logs": <str>,
#               "status": <running|completed|failed|cancelled>,
#               "mapped_ports": <dict>
#          }
deployment_tasks = {}

def send_heartbeat():
    """Send heartbeat info (CPU, memory, and agent state) to the scheduler."""
    while True:
        try:
            cpu_usage = psutil.cpu_percent(interval=1)
            memory_usage = psutil.virtual_memory().percent
            payload = {
                "agent_id": AGENT_ID,
                "ip": AGENT_IP,
                "cpu": cpu_usage,
                "memory": memory_usage,
                "state": agent_state
            }
            requests.post(f"{SCHEDULER_URL}/heartbeat", json=payload, timeout=5)
        except Exception as e:
            print(f"Heartbeat failed: {e}")
        time.sleep(2)

@app.route('/start_deployment', methods=['POST'])
def start_deployment():
    """Starts a new deployment by running a Docker container."""
    global agent_state
    # Only run deployments on a free agent.
    if agent_state == "Busy":
        return jsonify({"status": "error", "message": "Agent is busy"}), 400

    data = request.get_json()
    image = data.get("image")
    container_name = data.get("container_name", f"container_{uuid.uuid4()}")
    if not image:
        return jsonify({"status": "error", "message": "Image not specified"}), 400
    try:
        # Mark the agent as busy.
        agent_state = "Busy"
        # Run the container with dynamic port mapping.
        container = docker_client.containers.run(
            image,
            name=container_name,
            detach=True,
            stdout=True,
            stderr=True,
            publish_all_ports=True
        )
        deployment_id = str(uuid.uuid4())
        deployment_tasks[deployment_id] = {
            "container": container,
            "logs": "",
            "status": "running",
            "mapped_ports": None
        }
        # Reload container info to get port mapping.
        container.reload()
        ports = container.attrs['NetworkSettings']['Ports']
        deployment_tasks[deployment_id]["mapped_ports"] = ports
        # Start background thread to stream logs and monitor container status.
        threading.Thread(target=monitor_deployment, args=(deployment_id,), daemon=True).start()
        return jsonify({
            "status": "started", 
            "deployment_id": deployment_id, 
            "mapped_ports": ports
        }), 200
    except Exception as e:
        agent_state = "Free"  # Reset state on error.
        return jsonify({"status": "error", "message": str(e)}), 500

def monitor_deployment(deployment_id):
    """Monitor the deployment by streaming logs and checking status."""
    global agent_state
    container = deployment_tasks[deployment_id]["container"]
    try:
        for log in container.logs(stream=True):
            decoded_log = log.decode("utf-8")
            deployment_tasks[deployment_id]["logs"] += decoded_log
    except Exception as e:
        deployment_tasks[deployment_id]["logs"] += f"\nError during log streaming: {str(e)}"
    # Wait for the container to finish.
    result = container.wait()
    deployment_tasks[deployment_id]["status"] = "completed" if result["StatusCode"] == 0 else "failed"
    # Cleanup: remove the container and the image.
    try:
        container.remove()
        docker_client.images.remove(image=container.image.tags[0], force=True)
    except Exception as e:
        deployment_tasks[deployment_id]["logs"] += f"\nCleanup error: {str(e)}"
    # Mark the agent as free after deployment completes.
    agent_state = "Free"

@app.route('/deployment_logs', methods=['GET'])
def deployment_logs():
    """
    Returns the current logs, status, and port mapping for a given deployment.
    Expects query parameter 'deployment_id'.
    """
    deployment_id = request.args.get("deployment_id")
    if not deployment_id or deployment_id not in deployment_tasks:
        return jsonify({"status": "error", "message": "Invalid deployment id"}), 400
    return jsonify({
        "status": deployment_tasks[deployment_id]["status"],
        "logs": deployment_tasks[deployment_id]["logs"],
        "mapped_ports": deployment_tasks[deployment_id]["mapped_ports"]
    }), 200

@app.route('/cancel_deployment', methods=['POST'])
def cancel_deployment():
    global agent_state
    data = request.get_json()
    deployment_id = data.get("deployment_id")
    if not deployment_id or deployment_id not in deployment_tasks:
        return jsonify({"status": "error", "message": "Invalid deployment id"}), 400
    container = deployment_tasks[deployment_id]["container"]
    try:
        container.stop()
        deployment_tasks[deployment_id]["status"] = "cancelled"
        agent_state = "Free"
        return jsonify({"status": "cancelled", "deployment_id": deployment_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    threading.Thread(target=send_heartbeat, daemon=True).start()
    app.run(host='0.0.0.0', port=AGENT_PORT)
