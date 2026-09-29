import { useState } from "react";
import { UserRound, UserCheck, ChevronDown } from "lucide-react";
import "./AgentAssignment.css";

export default function AgentAssignment({
  agents = [],
  assignedAgentId = "",
  onAssign,
  disabled = false,
}) {
  const [selectedAgent, setSelectedAgent] = useState(assignedAgentId);

  const handleAssign = (event) => {
    const agentId = event.target.value;
    setSelectedAgent(agentId);
    onAssign?.(agentId || null);
  };

  return (
    <div className="agent-assignment">
      <label className="agent-assignment-label">
        <UserRound size={16} />
        Assign to agent
      </label>

      <div className="agent-assignment-select-wrap">
        <select
          value={selectedAgent}
          onChange={handleAssign}
          disabled={disabled}
          aria-label="Assign conversation to agent"
        >
          <option value="">Unassigned</option>
          {agents.map((agent) => {
            const id = agent.id ?? agent.userId;
            const name =
              agent.displayName || agent.name || agent.username || "Agent";

            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>
        <ChevronDown size={16} />
      </div>

      {selectedAgent && (
        <div className="agent-assignment-status">
          <UserCheck size={15} />
          <span>
            Assigned to{" "}
            {agents.find(
              (agent) =>
                String(agent.id ?? agent.userId) === String(selectedAgent)
            )?.displayName ||
              agents.find(
                (agent) =>
                  String(agent.id ?? agent.userId) === String(selectedAgent)
              )?.name ||
              "selected agent"}
          </span>
        </div>
      )}
    </div>
  );
}