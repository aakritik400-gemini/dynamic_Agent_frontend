# AstraAgents – Multi-Agent Studio

A modern frontend application for building, managing, and chatting with AI agents. AstraAgents provides an intuitive interface to create custom agents, configure their behavior, link them together, and interact with them in real-time.

##  Features

- **Create & Manage Agents** – Build custom AI agents with custom prompts, types, and configurations
- **Chat Interface** – Interact with agents in real-time through a responsive chat UI
- **Agent Linking** – Enable agents to hand off conversations to other agents
- **File Support** – Upload and manage data files for agent context
- **Live Notifications** – Toast notifications for user feedback
- **Edit Mode** – Modify existing agents and their configurations
- **Responsive Design** – Works seamlessly on different screen sizes

##  Tech Stack

- **React 19** – Modern UI library
- **Vite 8** – Fast build tool and dev server with HMR
- **Axios** – HTTP client for API communication
- **ESLint** – Code quality and style checking

##  Prerequisites

- Node.js 16+ and npm
- Backend API running on `http://127.0.0.1:8000` (configurable in [src/api.js](src/api.js))

##  Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create an optimized production build:

```bash
npm run build
```


##  Project Structure

```
src/
├── App.jsx                 # Root component
├── main.jsx               # Entry point
├── api.js                 # Axios API instance
├── styles.css             # Global styles
├── pages/
│   └── Dashboard.jsx      # Main dashboard page
├── components/
│   ├── AskAgent.jsx       # Chat interface component
│   ├── CreateAgent.jsx    # Create/edit agent modal
│   └── Toast.jsx          # Notification component
└── assets/                # Static assets
```

## API Integration

The application communicates with a backend API at `http://127.0.0.1:8000`. Key endpoints:

- `GET /agents` – Fetch all available agents
- `POST /agents` – Create a new agent
- `PUT /agents/{id}` – Update an existing agent
- `DELETE /agents/{id}` – Delete an agent
- `POST /agents/{id}/ask` – Send a message to an agent

To change the API base URL, modify the `baseURL` in [src/api.js](src/api.js).

## Component Descriptions

### Dashboard
Main page displaying the application header, chat interface, and modals for agent creation/editing.

### AskAgent
Chat component that allows users to select an agent and send messages, with scroll-to-latest message functionality.

### CreateAgent
Modal for creating new agents or editing existing ones. Supports agent types, custom prompts, file uploads, and agent handoff configuration.

### Toast
Reusable notification component for displaying success/error messages to users.

##  Configuration

### Backend API URL
Edit [src/api.js](src/api.js) to change the API endpoint:

```javascript
const API = axios.create({
  baseURL: "http://your-api-url:port",
});
```


