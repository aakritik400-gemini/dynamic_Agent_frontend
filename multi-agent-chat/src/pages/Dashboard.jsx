import { useEffect, useState } from "react";
import AskAgent from "../components/AskAgent";
import CreateAgent from "../components/CreateAgent";
import Toast from "../components/Toast";
import API from "../api";

export default function Dashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [toast, setToast] = useState(() => {
    if (typeof window === "undefined") return null;

    const message = sessionStorage.getItem("toastMessage");
    const type = sessionStorage.getItem("toastType") || "success";

    if (!message) return null;

    sessionStorage.removeItem("toastMessage");
    sessionStorage.removeItem("toastType");
    return { message, type };
  });

  useEffect(() => {
    API.get("/agents").then(res => setAgents(res.data.agents || []));
  }, []);

  return (
    <div className="appRoot">
      <div className="backgroundDecor" aria-hidden="true" />

      <header className="topbar glass">
        <div className="brand">
          <div className="brandTitle">AstraAgents</div>
          <div className="brandSubtitle">Multi-agent studio • build, link, and chat</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btnGhost"
            onClick={() => setIsEditOpen(true)}
            title="Edit an agent"
          >
            Edit Agent
          </button>
          <button
            type="button"
            className="btnPrimary"
            onClick={() => setIsCreateOpen(true)}
          >
            + Create Agent
          </button>
        </div>
      </header>

      <main className="mainArea">
        <AskAgent
          agents={agents}
          agentId={agentId}
          onAgentIdChange={setAgentId}
        />
      </main>

      {isCreateOpen ? (
        <CreateAgent mode="create" onClose={() => setIsCreateOpen(false)} agents={agents} />
      ) : null}

      {isEditOpen ? (
        <CreateAgent
          mode="edit"
          agentId={agentId}
          onAgentIdChange={setAgentId}
          agents={agents}
          onClose={() => setIsEditOpen(false)}
        />
      ) : null}

      {toast ? (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}