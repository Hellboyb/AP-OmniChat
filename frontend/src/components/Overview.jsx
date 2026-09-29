import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ChevronRight,
  Clock3,
  Inbox,
  Camera,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";

import {
  fetchInboxSummary,
  getUserLabel,
  isAbortError,
} from "../inbox";

export default function Overview({
  user,
  onNavigate,
  onSelectChannel,
}) {
  const [summary, setSummary] = useState({
    total: 0,
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    mychat: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchInboxSummary(signal);

      setSummary({
        total: Number(data?.total) || 0,
        whatsapp: Number(data?.whatsapp) || 0,
        messenger: Number(data?.messenger) || 0,
        instagram: Number(data?.instagram) || 0,
        mychat: Number(data?.mychat) || 0,
      });
    } catch (loadError) {
      if (isAbortError(loadError)) {
        return;
      }

      setError(loadError?.message || "Unable to load dashboard.");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadSummary(controller.signal);

    const refreshHandler = () => {
      loadSummary(controller.signal);
    };

    window.addEventListener("ap-omnichat-refresh", refreshHandler);

    return () => {
      controller.abort();
      window.removeEventListener("ap-omnichat-refresh", refreshHandler);
    };
  }, [loadSummary]);

  const cards = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      value: summary.whatsapp,
      icon: MessageCircle,
    },
    {
      id: "messenger",
      label: "Messenger",
      value: summary.messenger,
      icon: MessageSquare,
    },
    {
      id: "instagram",
      label: "Instagram",
      value: summary.instagram,
      icon: Camera,
    },
    {
      id: "mychat",
      label: "My Chat",
      value: summary.mychat,
      icon: Users,
    },
  ];

  const displayName = getUserLabel(user);
  const greetingName =
    user?.displayName || user?.userName || user?.username || "";

  function openChannel(channelId) {
    if (channelId === "mychat") {
      onNavigate("mychat");
      return;
    }

    onSelectChannel(channelId);
    onNavigate("inbox");
  }

  return (
    <section className="overview-page">
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">DASHBOARD</span>
          <h1>Welcome back{greetingName ? `, ${greetingName}` : ""}</h1>
          <p>
            Manage your conversations, channels and customer interactions from
            one place.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => openChannel("all")}
        >
          <Inbox size={17} />
          Open Inbox
        </button>
      </div>

      {error && (
        <div className="section-error">
          <Activity size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="overview-stat-card overview-stat-card--main">
        <div className="overview-stat-icon">
          <Inbox size={23} />
        </div>

        <div>
          <span>Total conversations</span>
          <strong>{loading ? "—" : summary.total}</strong>
        </div>

        <div className="overview-stat-meta">
          <Clock3 size={15} />
          <span>Across all channels</span>
        </div>
      </div>

      <div className="overview-card-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              type="button"
              key={card.id}
              className="overview-channel-card"
              onClick={() => openChannel(card.id)}
            >
              <div className="overview-channel-card-top">
                <div className="overview-channel-icon">
                  <Icon size={20} />
                </div>
                <ChevronRight size={18} />
              </div>
              <div className="overview-channel-value">
                {loading ? "—" : card.value}
              </div>
              <div className="overview-channel-label">{card.label}</div>
            </button>
          );
        })}
      </div>

      <div className="overview-lower-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Workspace status</h2>
              <p>Signed in as {displayName}.</p>
            </div>
            <ShieldCheck size={21} />
          </div>

          <div className="workspace-status-row">
            <span className="status-indicator">
              <span />
              Online
            </span>
            <span>API connected</span>
          </div>

          <div className="workspace-status-row">
            <span className="status-indicator">
              <span />
              Database
            </span>
            <span>Available</span>
          </div>

          <div className="workspace-status-row">
            <span className="status-indicator">
              <span />
              Authentication
            </span>
            <span>Active</span>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Quick actions</h2>
              <p>Jump directly to the tools you use most.</p>
            </div>
            <Activity size={21} />
          </div>

          <div className="quick-actions">
            <button type="button" onClick={() => openChannel("all")}>
              <Inbox size={18} />
              Unified Inbox
            </button>
            <button type="button" onClick={() => onNavigate("mychat")}>
              <MessageSquare size={18} />
              My Chat
            </button>
            <button type="button" onClick={() => onNavigate("connections")}>
              <Wifi size={18} />
              Connections
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
