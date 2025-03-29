import os
import time
import uuid
import threading
import tempfile
import zipfile
from flask import Flask, request, jsonify, Response
import requests
import docker

app = Flask(__name__)

# In-memory registry of active agents.
agents = {}
HEARTBEAT_TIMEOUT = 10  # seconds

docker_client = docker.from_env()

@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    """Receive heartbeat messages from agents."""
    data = request.get_json()
    agent_id = data.get("agent_id")
    if not agent_id:
        return jsonify({"status": "error", "message": "No agent_id provided"}), 400
    agents[agent_id] = {
        "ip": data.get("ip"),
        "cpu": data.get("cpu"),
        "memory": data.get("memory"),
        "last_seen": time.time()
    }
    return jsonify({"status": "ok"}), 200

@app.route('/upload_code', methods=['POST'])
def upload_code():
    """
    Accepts a ZIP file containing the source code and a Dockerfile.
    Builds a Docker image, pushes it to Docker Hub (if credentials are provided),
    and instructs an available agent to start the deployment.
    """
    if 'code' not in request.files:
        return jsonify({"status": "error", "message": "No code file provided"}), 400

    code_file = request.files['code']
    if code_file.filename == '':
        return jsonify({"status": "error", "message": "Empty filename"}), 400

    upload_dir = tempfile.mkdtemp(prefix="code_upload_")
    file_path = os.path.join(upload_dir, code_file.filename)
    code_file.save(file_path)

    # Extract ZIP file if applicable.
    if code_file.filename.lower().endswith(".zip"):
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(upload_dir)
            os.remove(file_path)
        except Exception as e:
            return jsonify({"status": "error", "message": f"Failed to unzip: {str(e)}"}), 500

    # Determine the build context (look for a Dockerfile).
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

    # Optionally push the image to Docker Hub if credentials are provided.
    try:
        username = os.getenv("DOCKER_USERNAME")
        password = os.getenv("DOCKER_PASSWORD")
        if username and password:
            docker_client.login(username=username, password=password)
            push_output = docker_client.images.push(image_tag)
            print(f"Image pushed: {push_output}")
        else:
            print("Docker Hub credentials not provided, skipping push")
    except Exception as e:
        return jsonify({"status": "error", "message": f"Docker push failed: {str(e)}"}), 500

    # Find an available agent based on heartbeat.
    available_agents = {aid: info for aid, info in agents.items() if time.time() - info["last_seen"] < HEARTBEAT_TIMEOUT}
    if not available_agents:
        return jsonify({"status": "error", "message": "No available agents"}), 503

    selected_agent = min(available_agents.items(), key=lambda x: x[1]["cpu"])[1]
    agent_ip = selected_agent["ip"]

    try:
        # Use the new /start_deployment endpoint on the agent.
        url = f"http://{agent_ip}:5001/start_deployment"
        payload = {"image": image_tag, "container_name": f"{image_tag}_container"}
        resp = requests.post(url, json=payload, timeout=60)
        if resp.status_code == 200:
            # Deployment started; return deployment info.
            return jsonify({
                "status": "deployed",
                "agent": agent_ip,
                "image": image_tag,
                "deployment_id": resp.json().get("deployment_id"),
                "mapped_ports": resp.json().get("mapped_ports"),
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
      - "deployment_id": the ID of the deployment to cancel,
      - "agent_ip": the IP of the agent hosting the deployment.
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
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/agents', methods=['GET'])
def get_agents():
    """
    Returns the list of active agents in JSON format.
    """
    return jsonify(agents)

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """
    Returns a basic HTML dashboard to monitor agents and deployments.
    """
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Scheduler Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .section { margin-bottom: 40px; }
        </style>
    </head>
    <body>
        <h1>Scheduler Dashboard</h1>
        <div class="section">
            <h2>Active Agents</h2>
            <table id="agentsTable">
                <thead>
                    <tr>
                        <th>Agent ID</th>
                        <th>IP</th>
                        <th>CPU</th>
                        <th>Memory</th>
                        <th>Last Seen</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>
        <div class="section">
            <h2>Deployment Monitor</h2>
            <form id="deploymentForm">
                <label for="deploymentId">Deployment ID:</label>
                <input type="text" id="deploymentId" required>
                <label for="agentIp">Agent IP:</label>
                <input type="text" id="agentIp" required>
                <button type="button" onclick="fetchLogs()">Fetch Logs</button>
                <button type="button" onclick="cancelDeployment()">Cancel Deployment</button>
            </form>
            <pre id="logs" style="background-color: #eee; padding: 10px; height:300px; overflow:auto;"></pre>
        </div>
        <script>
            // Poll for agents every 5 seconds.
            function fetchAgents() {
                fetch('/agents')
                .then(response => response.json())
                .then(data => {
                    const tbody = document.querySelector("#agentsTable tbody");
                    tbody.innerHTML = "";
                    for (let agentId in data) {
                        const agent = data[agentId];
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${agentId}</td>
                            <td>${agent.ip}</td>
                            <td>${agent.cpu}</td>
                            <td>${agent.memory}</td>
                            <td>${new Date(agent.last_seen * 1000).toLocaleString()}</td>
                        `;
                        tbody.appendChild(row);
                    }
                })
                .catch(err => console.error("Error fetching agents:", err));
            }
            // Initial fetch and poll.
            fetchAgents();
            setInterval(fetchAgents, 5000);

            // Fetch deployment logs directly from the agent.
            function fetchLogs() {
                const deploymentId = document.getElementById("deploymentId").value;
                const agentIp = document.getElementById("agentIp").value;
                if (!deploymentId || !agentIp) {
                    alert("Please provide both Deployment ID and Agent IP.");
                    return;
                }
                // Assumes agent's /deployment_logs endpoint is accessible.
                fetch(`http://${agentIp}:5001/deployment_logs?deployment_id=${deploymentId}`)
                .then(response => response.json())
                .then(data => {
                    document.getElementById("logs").textContent = 
                        "Status: " + data.status + "\\n\\n" +
                        "Mapped Ports: " + JSON.stringify(data.mapped_ports, null, 2) + "\\n\\n" +
                        "Logs:\\n" + data.logs;
                })
                .catch(err => {
                    console.error("Error fetching logs:", err);
                    document.getElementById("logs").textContent = "Error fetching logs: " + err;
                });
            }

            // Cancel a deployment by calling the scheduler endpoint.
            function cancelDeployment() {
                const deploymentId = document.getElementById("deploymentId").value;
                const agentIp = document.getElementById("agentIp").value;
                if (!deploymentId || !agentIp) {
                    alert("Please provide both Deployment ID and Agent IP.");
                    return;
                }
                fetch("/cancel_deployment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deployment_id: deploymentId, agent_ip: agentIp })
                })
                .then(response => response.json())
                .then(data => {
                    alert("Cancellation result: " + JSON.stringify(data));
                })
                .catch(err => {
                    console.error("Error cancelling deployment:", err);
                    alert("Error cancelling deployment: " + err);
                });
            }
        </script>
    </body>
    </html>
    """
    return Response(html, mimetype="text/html")

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
