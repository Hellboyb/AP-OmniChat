import { useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import "./ChatLabels.css";

const DEFAULT_LABELS = [
  { id: "important", name: "Important", color: "#f97316" },
  { id: "follow-up", name: "Follow-up", color: "#3b82f6" },
  { id: "customer", name: "Customer", color: "#22c55e" },
  { id: "personal", name: "Personal", color: "#a855f7" },
];

export default function ChatLabels({
  labels = DEFAULT_LABELS,
  selectedLabels = [],
  onChange,
  disabled = false,
}) {
  const [customLabels, setCustomLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [showCreator, setShowCreator] = useState(false);

  const allLabels = [...labels, ...customLabels];

  const toggleLabel = (labelId) => {
    const updated = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId];

    onChange?.(updated);
  };

  const createLabel = (event) => {
    event.preventDefault();

    const name = newLabelName.trim();
    if (!name) return;

    const label = {
      id: `custom-${Date.now()}`,
      name,
      color: "#06b6d4",
    };

    setCustomLabels((current) => [...current, label]);
    setNewLabelName("");
    setShowCreator(false);
    onChange?.([...selectedLabels, label.id]);
  };

  const removeCustomLabel = (labelId) => {
    setCustomLabels((current) =>
      current.filter((label) => label.id !== labelId)
    );

    onChange?.(selectedLabels.filter((id) => id !== labelId));
  };

  return (
    <div className="chat-labels">
      <div className="chat-labels-heading">
        <span>
          <Tag size={16} />
          Chat labels
        </span>

        <button
          type="button"
          className="chat-labels-add"
          onClick={() => setShowCreator((value) => !value)}
          disabled={disabled}
          aria-label="Create label"
          title="Create label"
        >
          {showCreator ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {showCreator && (
        <form className="chat-labels-create" onSubmit={createLabel}>
          <input
            value={newLabelName}
            onChange={(event) => setNewLabelName(event.target.value)}
            placeholder="Enter label name"
            maxLength={30}
            autoFocus
          />
          <button type="submit" disabled={!newLabelName.trim()}>
            Add
          </button>
        </form>
      )}

      <div className="chat-labels-list">
        {allLabels.map((label) => {
          const isSelected = selectedLabels.includes(label.id);

          return (
            <div className="chat-label-row" key={label.id}>
              <button
                type="button"
                className={`chat-label-chip ${isSelected ? "selected" : ""}`}
                style={{
                  "--label-color": label.color || "#f97316",
                }}
                onClick={() => toggleLabel(label.id)}
                disabled={disabled}
                aria-pressed={isSelected}
              >
                <span className="chat-label-dot" />
                {label.name}
              </button>

              {label.id.startsWith("custom-") && (
                <button
                  type="button"
                  className="chat-label-remove"
                  onClick={() => removeCustomLabel(label.id)}
                  disabled={disabled}
                  title={`Remove ${label.name}`}
                  aria-label={`Remove ${label.name}`}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedLabels.length > 0 && (
        <button
          type="button"
          className="chat-labels-clear"
          onClick={() => onChange?.([])}
          disabled={disabled}
        >
          Clear selected labels
        </button>
      )}
    </div>
  );
}