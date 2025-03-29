# Distributed Physical Resources as a Service (DRaaS)

A distributed system for deploying, monitoring, and managing Docker-based workloads across multiple machines. This project consists of three main components:

- **Agent**: Runs on individual machines to execute Docker containers.
- **Scheduler**: Acts as a central controller to receive deployment requests, build Docker images, distribute deployments to available agents, and provide a web dashboard for monitoring.
- **Client**: A simple GUI client to upload source code (in a ZIP file) for deployment.

## Project Structure
DRaaS/ │ ├── agent/ │ └── agent.py # Agent service handling container execution and log monitoring. │ ├── scheduler/ │ └── scheduler.py # Scheduler service for image building, agent selection, and dashboard UI. │ └── client/ └── client.py # GUI client for uploading code and initiating deployments.


## Features

- **Dynamic Deployment**: The scheduler builds Docker images from uploaded code and instructs an available agent to start a deployment.
- **Dynamic Port Mapping**: The agent runs Docker containers with dynamic port mapping using Docker's `publish_all_ports` feature.
- **Log Streaming & Monitoring**: The agent monitors container logs in real-time and provides endpoints to retrieve logs.
- **Cancellation**: Deployments can be cancelled via an API endpoint.
- **Dashboard UI**: A basic web dashboard is provided via the scheduler to view active agents, monitor deployment logs, and cancel deployments.
- **Agent Heartbeats**: Agents send periodic heartbeat messages to the scheduler to update their status (CPU, memory, last seen).

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/DPRaaS.git
   cd DPRaaS
   ```
2. **Install Python dependencies:**

   It is recommended to use a virtual environment.

   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   **Note:** Make sure to include required packages in your requirements.txt. For example:

   ```nginx
   Flask
   docker
   psutil
   requests
   Flask-Cors
   tkinter
   ```
3. **Docker Installation:**
   Ensure Docker is installed and running on your system, as both the agent and scheduler use Docker commands.


*Configuration*

- **Agent Configuration:**

  The agent (agent.py) reads the following environment variables:
  - AGENT_IP: Set this to the public IP address or hostname of the agent machine.
  - SCHEDULER_URL: URL of the scheduler service (e.g., http://localhost:5000).

- **Scheduler Configuration:**

  The scheduler (scheduler.py) can optionally push Docker images to Docker Hub if the following environment variables are set:
  - DOCKER_USERNAME
  - DOCKER_PASSWORD

*Running the Services*

1. **Start the Scheduler:**
   ```bash
   cd scheduler
   python scheduler.py
   ```
   The scheduler runs on port 5000 and provides the dashboard at http://localhost:5000/dashboard.

2. **Start the Agent:**
   ``bash
   cd agent
   python agent.py
   ```
   The agent runs on port 5001. Make sure the AGENT_IP and SCHEDULER_URL are correctly set in your environment.

3. **Run the Client:**
   ```bash
   cd client
   python client.py
   ```
   Use the client GUI to select a ZIP file containing your project (including a Dockerfile) and upload it to the scheduler for deployment.

*Dashboard UI*

The scheduler's dashboard (available at http://localhost:5000/dashboard) provides:
- Active Agents: A table displaying the agent ID, IP, CPU usage, memory usage, and last seen timestamp.
- Deployment Monitor: A form to input a Deployment ID and Agent IP to fetch the container logs from the agent. It also provides a button to cancel the deployment.