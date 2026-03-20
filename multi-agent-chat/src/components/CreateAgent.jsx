import { useEffect, useMemo, useState } from "react";
import API from "../api";

export default function CreateAgent({
  mode = "create",
  agentId,
  onAgentIdChange,
  agents: agentsProp,
  onClose,
}) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("normal");
  const [agentsLocal, setAgentsLocal] = useState([]);
  const [selectedHandoffs, setSelectedHandoffs] = useState([]);
  const [file, setFile] = useState(null);
  const [existingFilePath, setExistingFilePath] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editAgentId, setEditAgentId] = useState(agentId ? String(agentId) : "");

  useEffect(() => {
    if (agentsProp) return;
    API.get("/agents").then(res => setAgentsLocal(res.data.agents || []));
  }, [agentsProp]);

  const agents = agentsProp ?? agentsLocal;
  const effectiveEditId = mode === "edit" ? (agentId ? String(agentId) : editAgentId) : null;
  const effectiveInitialAgent =
    mode === "edit" && effectiveEditId
      ? agents.find(a => String(a.id) === String(effectiveEditId)) ?? null
      : null;

  useEffect(() => {
    if (mode !== "edit") return;

    if (agentId != null && String(agentId) !== editAgentId) {
      setEditAgentId(String(agentId));
    }
 
  }, [agentId, mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    setIsLoading(true);

    // Prefill from list endpoint data (your backend exposes name/prompt/type/data_file in GET /agents).
    setName(effectiveInitialAgent?.name ?? "");
    setPrompt(effectiveInitialAgent?.prompt ?? "");
    setType(effectiveInitialAgent?.type ?? "normal");
    setExistingFilePath(effectiveInitialAgent?.data_file ?? null);

    if (Array.isArray(effectiveInitialAgent?.child_agent_ids))
      setSelectedHandoffs(effectiveInitialAgent.child_agent_ids);
    if (Array.isArray(effectiveInitialAgent?.handoffs))
      setSelectedHandoffs(effectiveInitialAgent.handoffs);

    setIsLoading(false);
  }, [mode, effectiveInitialAgent]);

  useEffect(() => {
    // If user switches from super -> normal, clear handoff selection.
    if (type !== "super") setSelectedHandoffs([]);
  }, [type]);

  const canSave = useMemo(() => {
    if (mode === "edit" && !effectiveEditId) return false;
    if (!name.trim()) return false;
    if (!prompt.trim()) return false;
    return true;
  }, [mode, effectiveEditId, name, prompt]);

  const handleSave = async () => {
    if (!canSave || isSaving || isLoading) return;

    setIsSaving(true);
    try {
      let filePath = existingFilePath ?? null;

      // Upload file if exists.
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await API.post("/upload", formData);
        filePath = res.data.file_path;
      }

      const payload = {
        name: name.trim(),
        prompt: prompt.trim(),
        type,
        data_file: filePath,
      };

      let savedId = agentId ?? (mode === "edit" ? effectiveEditId : null);

      if (mode === "edit" && agentId) {
        // Update agent (backend route: PUT /agents/{agent_id})
        await API.put(`/agents/${agentId}`, payload);
      } else if (mode === "edit" && effectiveEditId) {
        await API.put(`/agents/${effectiveEditId}`, payload);
      } else {
        // Create agent.
        const res = await API.post("/agents", payload);
        savedId = res.data.id;
      }

      // Add handoffs if super.
      if (type === "super" && selectedHandoffs.length > 0 && savedId) {
        await API.post(`/agents/${savedId}/handoffs`, {
          child_agent_ids: selectedHandoffs
        });
      }

      // Show toast after refresh.
      sessionStorage.setItem("toastType", "success");
      sessionStorage.setItem(
        "toastMessage",
        mode === "edit" ? "Agent updated successfully." : "Agent created successfully."
      );

      onClose?.();
      window.location.reload();
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (mode === "edit" ? "Failed to update agent." : "Failed to create agent.");

      sessionStorage.setItem("toastType", "error");
      sessionStorage.setItem("toastMessage", message);

      onClose?.();
      window.location.reload();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal glass">
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{mode === "edit" ? "Edit Agent" : "Create Agent"}</div>
            <div className="modalSubtitle">
              Configure name, prompt, type, optional file, and super-agent handoffs.
            </div>
          </div>

          <button className="iconBtn" type="button" onClick={() => onClose?.()}>
            ✕
          </button>
        </div>

        <div className="modalBody">
          {isLoading ? <div className="muted">Loading agent...</div> : null}

          {mode === "edit" ? (
            <div className="field">
              <label className="label">Select agent to edit</label>
              <div className="selectWrap">
                <select
                  className="select"
                  value={effectiveEditId ?? ""}
                  onChange={e => {
                    const next = e.target.value;
                    setEditAgentId(next);
                    onAgentIdChange?.(next);
                  }}
                >
                  <option value="">Choose an agent</option>
                  {agents.map(a => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="formGrid">
            <div className="field">
              <label className="label">Name</label>
              <input
                className="input"
                placeholder="Agent Name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={mode === "edit" && !effectiveEditId}
              />
            </div>

            <div className="field">
              <label className="label">Type</label>
              <div className="selectWrap">
                <select
                  className="select"
                  value={type}
                  onChange={e => setType(e.target.value)}
                  disabled={mode === "edit" && !effectiveEditId}
                >
                  <option value="normal">Normal</option>
                  <option value="super">Super</option>
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label">Prompt</label>
            <textarea
              className="textarea"
              placeholder="System prompt / instructions for the agent..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={mode === "edit" && !effectiveEditId}
            />
          </div>

          <div className="field">
            <label className="label">Data File (optional)</label>
            <div className="fileRow">
              <input
                className="input"
                type="file"
                onChange={e => setFile(e.target.files?.[0] || null)}
                disabled={mode === "edit" && !effectiveEditId}
              />
              {file ? <div className="fileMeta">{file.name}</div> : null}
              {!file && existingFilePath ? (
                <div className="fileMeta" title={existingFilePath}>
                  Current: {existingFilePath}
                </div>
              ) : null}
            </div>
          </div>

          {type === "super" ? (
            <div className="field">
              <label className="label">Handoff to child agents</label>
              <div className="handoffList">
                {agents.length === 0 ? (
                  <div className="muted">No agents available yet.</div>
                ) : (
                  agents.map(a => (
                    <label key={a.id} className="checkRow">
                      <input
                        type="checkbox"
                        checked={selectedHandoffs.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedHandoffs(prev => [...prev, a.id]);
                          } else {
                            setSelectedHandoffs(prev =>
                              prev.filter(id => id !== a.id)
                            );
                          }
                        }}
                      />
                      <span className="checkLabel">{a.name}</span>
                      <span className="checkMeta">{a.type}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="hint">
                Select at least one agent to link as a handoff target.
              </div>
            </div>
          ) : null}
        </div>

        <div className="modalFooter">
          <button className="btnGhost" type="button" onClick={() => onClose?.()}>
            Cancel
          </button>
          <button
            className="btnPrimary"
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving || isLoading}
          >
            {isSaving ? "Saving..." : mode === "edit" ? "Save Changes" : "Save Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}