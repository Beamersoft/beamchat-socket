# Beamchat Socket Backend

The Beamchat Socket Backend is an integral part of the Beamchat application ecosystem, designed to handle real-time messaging efficiently. It utilizes Socket.IO, along with a robust set of technologies including Express and MongoDB, to provide a seamless chatting experience. This backend is specifically engineered to support scalable, bidirectional, and event-based communication between clients in real-time.

## Features

- **Real-Time Communication**: Leveraging Socket.IO for instant message delivery and event broadcasting.
- **Scalability**: Integrated with the Socket.IO cluster adapter for scaling WebSocket connections across multiple instances.
- **Security**: Uses JSON Web Tokens for secure authentication and connection.
- **Cross-Origin Resource Sharing (CORS)**: Configured to allow cross-origin requests, facilitating integration with various frontend environments.
- **Data Persistence**: Utilizes MongoDB for storing user data and chat history.
- **Logging and Timestamps**: Incorporates Moment.js for handling dates and timestamps, ensuring accurate timekeeping for messages and events.

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- MongoDB and SQLite (locally installed or accessible via cloud)
- Git
- Docker

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Beamersoft/beamchat-socket.git
cd beamchat-socket
```

2. Install dependencies:

```bash
npm install
```

3. Run the project:

    For running this project, it's recommended to run it directly from **beamchat-backend** project, because it contains the docker-compose that builds and runs in a container this socket backend and all works in a symphony :)

    Be sure to have this project at the same directory level than **beamchat-backend** like:

    - /your-projects-folder/beamchat-backend
    - /your-projects-folder/beamchat-socket
