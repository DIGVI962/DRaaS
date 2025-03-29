import os
from dotenv import load_dotenv
import time
import uuid
import threading
import tempfile
import zipfile
from flask import Flask, request, jsonify, Response, render_template
from flask_cors import CORS
import requests
import docker

load_dotenv(dotenv_path="scheduler.env")

app = Flask(__name__)
CORS(app)

# In-memory registry of active agents.
# Each agent record now includes a "state" field (Free or Busy)
agents = {}
HEARTBEAT_TIMEOUT = 10  # seconds

docker_client = docker.from_env()

# Global dictionary to store deployments info.
# Each key is a deployment_id and the value is a dict with details.
deployments = {}

@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    """
    Receives heartbeat messages from agents.
    Expected JSON payload includes: agent_id, ip, cpu, memory, and state.
    """
    data = request.get_json()
    agent_id = data.get("agent_id")
    if not agent_id:
        return jsonify({"status": "error", "message": "No agent_id provided"}), 400
    agents[agent_id] = {
        "ip": data.get("ip"),
        "cpu": data.get("cpu"),
        "memory": data.get("memory"),
        "state": data.get("state", "Free"),
        "last_seen": time.time()
    }
    return jsonify({"status": "ok"}), 200

@app.route('/upload_code', methods=['POST'])
def upload_code():
    """
    Accepts a ZIP file containing source code and a Dockerfile.
    Builds a Docker image, optionally pushes it to Docker Hub,
    and instructs an available free agent to start a deployment.
    """
    if 'code' not in request.files:
        return jsonify({"status": "error", "message": "No code file provided"}), 400

    code_file = request.files['code']
    if code_file.filename == '':
        return jsonify({"status": "error", "message": "Empty filename"}), 400

    upload_dir = tempfile.mkdtemp(prefix="code_upload_")
    file_path = os.path.join(upload_dir, code_file.filename)
    code_file.save(file_path)

    if code_file.filename.lower().endswith(".zip"):
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(upload_dir)
            os.remove(file_path)
        except Exception as e:
            return jsonify({"status": "error", "message": f"Failed to unzip: {str(e)}"}), 500

    build_context = upload_dir
    if not os.path.exists(os.path.join(upload_dir, 'Dockerfile')):
        subdirs = [d for d in os.listdir(upload_dir) if os.path.isdir(os.path.join(upload_dir, d))]
        if len(subdirs) == 1 and os.path.exists(os.path.join(upload_dir, subdirs[0], 'Dockerfile')):
            build_context = os.path.join(upload_dir, subdirs[0])
        else:
            return jsonify({"status": "error", "message": "Cannot locate specified Dockerfile"}), 400

    print(f"Building Docker image from build context: {build_context}")
    image_tag = "user_code_image_" + str(uuid.uuid4())[:8]
    try:
        docker_client.images.build(path=build_context, tag=image_tag)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Docker build failed: {str(e)}"}), 500

    try:
        username = os.getenv("DOCKER_USERNAME")
        password = os.getenv("DOCKER_PASSWORD")
        hub_push = os.getenv("HUB_PUSH", "false").lower() == "true"
        if hub_push and not (username and password):
            docker_client.login(username=username, password=password)
            push_output = docker_client.images.push(image_tag)
            print(f"Image pushed: {push_output}")
        else:
            print("Docker Hub credentials not provided, skipping push")
    except Exception as e:
        return jsonify({"status": "error", "message": f"Docker push failed: {str(e)}"}), 500

    # Only select agents that are free.
    available_agents = {aid: info for aid, info in agents.items() 
                        if time.time() - info["last_seen"] < HEARTBEAT_TIMEOUT and info.get("state") == "Free"}
    if not available_agents:
        return jsonify({"status": "error", "message": "No available free agents"}), 503

    selected_agent = min(available_agents.items(), key=lambda x: x[1]["cpu"])[1]
    agent_ip = selected_agent["ip"]

    try:
        url = f"http://{agent_ip}:5001/start_deployment"
        payload = {"image": image_tag, "container_name": f"{image_tag}_container"}
        resp = requests.post(url, json=payload, timeout=60)
        if resp.status_code == 200:
            deployment_id = resp.json().get("deployment_id")
            mapped_ports = resp.json().get("mapped_ports")
            # Store deployment info in the global dictionary.
            deployments[deployment_id] = {
                "deployment_id": deployment_id,
                "agent": agent_ip,
                "image": image_tag,
                "mapped_ports": mapped_ports,
                "status": "running"
            }
            return jsonify({
                "status": "deployed",
                "agent": agent_ip,
                "image": image_tag,
                "deployment_id": deployment_id,
                "mapped_ports": mapped_ports,
                "logs": ""
            }), 200
        else:
            return jsonify({"status": "error", "message": resp.json()}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/cancel_deployment', methods=['POST'])
def scheduler_cancel_deployment():
    """
    Forwards a cancellation request to an agent.
    Expects JSON payload with:
      - "deployment_id": the deployment ID,
      - "agent_ip": the IP address of the agent.
    """
    data = request.get_json()
    deployment_id = data.get("deployment_id")
    agent_ip = data.get("agent_ip")
    if not deployment_id:
        return jsonify({"status": "error", "message": "No deployment id provided"}), 400
    if not agent_ip:
        return jsonify({"status": "error", "message": "No agent ip provided"}), 400
    try:
        url = f"http://{agent_ip}:5001/cancel_deployment"
        payload = {"deployment_id": deployment_id}
        resp = requests.post(url, json=payload, timeout=30)
         # If cancellation is successful, update deployment status.
        if resp.status_code == 200 and deployment_id in deployments:
            deployments[deployment_id]["status"] = "cancelled"
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/agents', methods=['GET'])
def get_agents():
    """Returns the list of active agents in JSON format."""
    return jsonify(agents)

@app.route('/deployments', methods=['GET'])
def get_deployments():
    return jsonify(deployments)

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """
    Serves a basic HTML dashboard to monitor active agents and deployments.
    Displays agent status with a colored dot and tooltip.
    """
    return render_template("dashboard.html")

def cleanup_agents():
    """Removes stale agents based on heartbeat timeout."""
    while True:
        now = time.time()
        for aid in list(agents.keys()):
            if now - agents[aid]["last_seen"] > HEARTBEAT_TIMEOUT:
                print(f"Removing stale agent: {aid}")
                agents.pop(aid)
        time.sleep(HEARTBEAT_TIMEOUT)

if __name__ == "__main__":
    threading.Thread(target=cleanup_agents, daemon=True).start()
    app.run(host='0.0.0.0', port=5000)
