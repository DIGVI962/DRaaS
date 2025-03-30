# DRaaS

A distributed system for deploying, monitoring, and managing Docker-based workloads across multiple machines. This project consists of two main components:

- **Agent**: Runs on individual machines to execute Docker containers.
- **Scheduler**: Acts as a central controller to receive deployment requests, build Docker images, distribute deployments to available agents, and provide a web dashboard for monitoring.

## Project Structure
```
DRaaS/
├── Backend/
│   └── scripts/
│       ├── agent/
│       |   ├── requirements.txt
│       │   ├── agent.py
│       │   ├── agent.env.example
│       └── scheduler/
│           ├── requirements.txt
│           ├── scheduler.py
│           ├── scheduler.env.example
│           └── templates/
│               └── dashboard.html
└── README.md

```

## Features

- **Dynamic Deployment**: The scheduler builds Docker images from uploaded code and instructs an available agent to start a deployment.
- **Log Streaming & Monitoring**: The agent monitors container logs in real-time and provides endpoints to retrieve logs.
- **Cancellation**: Deployments can be cancelled via an API endpoint.
- **Agent Heartbeats**: Agents send periodic heartbeat messages to the scheduler to update their status (CPU, memory, last seen).

## Configuration

- **Agent Configuration:**

  The agent (`agent.py`) reads the following environment variables:
  - `AGENT_IP`: Set this to the public IP address or hostname of the agent machine.
  - `AGENT_PORT`: Set this to the port number you wnat the agent to use to communicate with the Scheduler.
  - `SCHEDULER_URL`: URL of the scheduler service (e.g., `http://localhost:5000`).

- **Scheduler Configuration:**

  The scheduler (`scheduler.py`) can optionally push Docker images to Docker Hub if the following environment variables are set:
  - `DOCKER_USERNAME`
  - `DOCKER_PASSWORD`
  - `DOCKER_HUB_PUSH`

## Running the Services

1. **Start the Scheduler:**
   ```bash
   cd scheduler
   pip install requirements.txt
   cp scheduler.env.example scheduler.env
   python scheduler.py
   ```
   The scheduler runs on port `5000` and provides the dashboard at `http://localhost:5000/dashboard`.

2. **Start the Agent:**
   ```bash
   cd agent
   pip install requirements.txt
   cp agent.env.example agent.env
   python agent.py
   ```
   The agent runs on port `AGENT_PORT`. Make sure the `AGENT_IP` and `SCHEDULER_URL` are correctly set in your environment.
