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
  const [nameError, setNameError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (agentsProp) return;
    API.get("/agents").then(res => setAgentsLocal(res.data.agents || []));
  }, [agentsProp]);

  const agents = agentsProp ?? agentsLocal;
  const effectiveEditId = mode === "edit" ? (agentId ? String(agentId) : editAgentId) : null;

  // Prevent self-handoff
  const handoffCandidates = useMemo(() => {
    if (mode !== "edit" || !effectiveEditId) return agents;
    const selfId = Number(effectiveEditId);
    return agents.filter(a => a.id !== selfId);
  }, [agents, mode, effectiveEditId]);

  // Load agent data in edit mode
  useEffect(() => {
    if (mode !== "edit") return;
    if (!effectiveEditId) return;

    const controller = new AbortController();
    setIsLoading(true);

    API.get(`/agents/${effectiveEditId}`, { signal: controller.signal })
      .then(res => {
        if (res.data?.error) throw new Error(res.data.error);

        const agent = res.data.agent;
        const rawType = agent?.type ?? "normal";
        setName(agent?.name ?? "");
        setPrompt(agent?.prompt ?? "");
        setType(rawType === "base" ? "normal" : rawType);
        setExistingFilePath(agent?.data_file ?? null);

        const children = res.data.child_agent_ids ?? [];
        const selfId = Number(effectiveEditId);
        setSelectedHandoffs(children.filter(id => id !== selfId));
      })
      .catch(err => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setName("");
        setPrompt("");
        setType("normal");
        setExistingFilePath(null);
        setSelectedHandoffs([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [mode, effectiveEditId]);

  // Clear handoffs if type is no longer super
  useEffect(() => {
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
    setNameError(""); // reset previous errors
    try {
      let filePath = existingFilePath ?? null;

      // Upload file if exists
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

      let savedId = null;

      if (mode === "edit") {
        await API.put(`/agents/${effectiveEditId}`, payload);
        savedId = effectiveEditId;
      } else {
        const res = await API.post("/agents", payload);
        savedId = res.data.id;
      }

      // Handle handoffs if super-agent
      if (mode === "edit" && savedId) {
        await API.put(`/agents/${Number(savedId)}/handoffs`, {
          child_agent_ids: type === "super" ? selectedHandoffs : [],
        });
      } else if (type === "super" && selectedHandoffs.length > 0 && savedId) {
        await API.post(`/agents/${savedId}/handoffs`, {
          child_agent_ids: selectedHandoffs,
        });
      }

      //  Close modal on success only
      sessionStorage.setItem("toastType", "success");
      sessionStorage.setItem(
        "toastMessage",
        mode === "edit" ? "Agent updated successfully." : "Agent created successfully."
      );
      onClose?.();
      window.location.reload();

    } catch (err) {
      //  Keep modal open, show error toast
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        (mode === "edit" ? "Failed to update agent." : "Failed to create agent.");

      // Highlight name if duplicate
      if (message.toLowerCase().includes("already exists")) {
        setNameError(message);
      }

      sessionStorage.setItem("toastType", "error");
      sessionStorage.setItem("toastMessage", message);
      console.error("Agent save failed:", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!effectiveEditId) return;


    try {
      await API.delete(`/agents/${effectiveEditId}`);
      sessionStorage.setItem("toastType", "success");
      sessionStorage.setItem("toastMessage", "Agent deleted successfully.");
      onClose?.();
      window.location.reload();
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete agent.";
      sessionStorage.setItem("toastType", "error");
      sessionStorage.setItem("toastMessage", message);
    }
  };
return (
  <>
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal glass">
        {/* Modal Header */}
        <div className="modalHeader">
          <div>
            <div className="modalTitle">{mode === "edit" ? "Edit Agent" : "Create Agent"}</div>
            <div className="modalSubtitle">
              Configure name, prompt, type, optional file, and super-agent handoffs.
            </div>
          </div>
          <button className="iconBtn" type="button" onClick={() => onClose?.()}>✕</button>
        </div>

        {/* Modal Body */}
        <div className="modalBody">
          {isLoading && <div className="muted">Loading agent...</div>}

          {mode === "edit" && (
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
                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="formGrid">
            <div className="field">
              <label className="label">Name</label>
              <input
                className={`input ${nameError ? "inputError" : ""}`}
                placeholder="Agent Name"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setNameError("");
                }}
                disabled={mode === "edit" && !effectiveEditId}
              />
              {nameError && <div className="fieldError">{nameError}</div>}
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
              {file && <div className="fileMeta">{file.name}</div>}
              {!file && existingFilePath && (
                <div className="fileMeta" title={existingFilePath}>
                  Current: {existingFilePath}
                </div>
              )}
            </div>
          </div>

          {type === "super" && (
            <div className="field">
              <label className="label">Handoff to child agents</label>
              <div className="handoffList">
                {handoffCandidates.length === 0 ? (
                  <div className="muted">
                    {mode === "edit" && effectiveEditId && agents.length <= 1
                      ? "Add more agents first, or only other agents can be handoff targets."
                      : "No agents available yet."}
                  </div>
                ) : (
                  handoffCandidates.map(a => (
                    <label key={a.id} className="checkRow">
                      <input
                        type="checkbox"
                        checked={selectedHandoffs.includes(a.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedHandoffs(prev => [...prev, a.id]);
                          else setSelectedHandoffs(prev => prev.filter(id => id !== a.id));
                        }}
                      />
                      <span className="checkLabel">{a.name}</span>
                      <span className="checkMeta">{a.type}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="hint">
                {mode === "edit" && effectiveEditId
                  ? "Current handoffs are pre-selected. You cannot hand off to the agent you are editing."
                  : "Select at least one agent to link as a handoff target."}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modalFooter">
          <button className="btnGhost" type="button" onClick={() => onClose?.()}>
            Cancel
          </button>

          {mode === "edit" && effectiveEditId && (
            <button
              className="btnDanger"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isLoading}
            >
              Delete Agent
            </button>
          )}

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

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div
        className="modalOverlay"
        onMouseDown={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
      >
        <div className="modal glass">
          <div className="modalHeader">
            <div>
              <div className="modalTitle">Confirm Delete</div>
              <div className="modalSubtitle">
                Are you sure you want to permanently delete this agent? This action cannot be undone.
              </div>
            </div>
            <button className="iconBtn" type="button" onClick={() => setShowDeleteConfirm(false)}>✕</button>
          </div>
          <div className="modalBody">
            <p className="muted">
              Deleting an agent will remove it permanently from the system.
            </p>
          </div>
          <div className="modalFooter">
            <button className="btnGhost" type="button" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            <button
              className="btnDanger"
              type="button"
              onClick={() => { setShowDeleteConfirm(false); handleDelete(); }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}