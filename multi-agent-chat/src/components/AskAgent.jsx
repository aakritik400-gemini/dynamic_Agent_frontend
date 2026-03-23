import { useEffect, useMemo, useRef, useState } from "react";
import API from "../api";

export default function AskAgent({
  agents: agentsProp,
  agentId: agentIdProp,
  onAgentIdChange,
}) {
  const [agentsLocal, setAgentsLocal] = useState([]); // store list of agents for dropdown, only used if not provided by parent
  const [agentIdLocal, setAgentIdLocal] = useState(""); //store selected agent id 
  const [question, setQuestion] = useState(""); // what user types stays here until they send, then it moves to messages as a user message
  const [messages, setMessages] = useState([]); // chat history
  const [isAsking, setIsAsking] = useState(false); // loading state "thinking "
  const listRef = useRef(null); // used to auto scroll to the latest message

  useEffect(() => {
    if (agentsProp) return;
    API.get("/agents").then(res => setAgentsLocal(res.data.agents || []));
  }, [agentsProp]);

  const agents = agentsProp ?? agentsLocal;
  const agentId = agentIdProp ?? agentIdLocal;
  const setAgentId = (next) => {
    if (agentIdProp != null) onAgentIdChange?.(next);
    else setAgentIdLocal(next);
  };

  useEffect(() => {
    // Reset chat when agent changes to keep UI consistent.
    setMessages([]);
    setQuestion("");
  }, [agentId]);

  useEffect(() => {
    // Keep the latest messages in view.
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isAsking]);

  const canSend = useMemo(() => {
    if (!agentId) return false;
    if (!question.trim()) return false;
    if (isAsking) return false;
    return true;
  }, [agentId, question, isAsking]);

 const ask = async () => {
  if (!canSend) return;

  const q = question.trim();
  setQuestion("");

  setMessages(prev => [...prev, { role: "user", content: q }]);
  setIsAsking(true);

  try {
    const res = await API.post(`/ask/${agentId}`, { question: q });

    const reply =
      res?.data?.response?.trim() || " No response from agent. Please try again.";

    setMessages(prev => [
      ...prev,
      { role: "assistant", content: reply }
    ]);
  } catch (err) {
    const message =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      " Failed to get response from server.";

    setMessages(prev => [
      ...prev,
      { role: "assistant", content: message }
    ]);
  } finally {
    setIsAsking(false);
  }
};

  return (
    <div className="glass chatCard">
      <div className="chatHeader">
        <div>
          <div className="chatTitle">Main Chat</div>
          <div className="chatSubtitle">Select an agent and start a conversation.</div>
        </div>

        <div className="agentSelect">
          <label className="label">Agent</label>
          <div className="selectWrap">
            <select
              className="select"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
            >
              <option value="" hidden selected>
                Choose an agent
              </option>
              {agents.map(a => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="messageList" ref={listRef}>
        {messages.length === 0 ? (
          <div className="emptyState">
            <div className="emptyTitle">No messages yet</div>
            <div className="emptyHint">
              Pick an agent above, then type your message below.
            </div>
          </div>
        ) : null}

        {messages.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={m.role === "user" ? "messageRow userRow" : "messageRow assistantRow"}
          >
            <div className={m.role === "user" ? "messageBubble userBubble" : "messageBubble assistantBubble"}>
              {m.content}
            </div>
          </div>
        ))}

        {isAsking ? (
          <div className="messageRow assistantRow">
            <div className="messageBubble assistantBubble">
              Thinking...
            </div>
          </div>
        ) : null}
      </div>

      <div className="composer">
        <textarea
          className="textarea composerInput"
          placeholder={
            agentId ? "Ask anything... (Enter to send)" : "Select an agent to start"
          }
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={!agentId}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
        />
        <button
          className="btnPrimary"
          type="button"
          onClick={ask}
          disabled={!canSend}
        >
          {isAsking ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}