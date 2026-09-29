import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  Bell,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Command,
  FileText,
  Inbox,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react";

import { api, clearAccessToken, getAccessToken } from "./api";
import AuthPage from "./components/AuthPage";
import MyChat from "./components/MyChat";
import ConnectionCenter from "./components/ConnectionCenter";
import AdminPage from "./components/AdminPage";
import "./App.css";

const STORAGE_KEYS = {
  userRole: "ap_omnichat_role",
  preferences: "ap_omnichat_preferences",
  inboxMeta: "ap_omnichat_inbox_meta",
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "inbox", label: "Unified Inbox", icon: Inbox },
  { id: "mychat", label: "My Chat", icon: MessageCircle },
  { id: "connections", label: "Connection Center", icon: Link2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const CHANNELS = [
  { id: "all", label: "All Channels" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "messenger", label: "Messenger" },
  { id: "instagram", label: "Instagram" },
  { id: "mychat", label: "My Chat" },
];

function safeArray(value) {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.conversations)) return value.conversations;

  return [];
}

function getDisplayName(item, fallback = "Unknown") {
  return (
    item?.displayName ||
    item?.name ||
    item?.fullName ||
    item?.senderName ||
    item?.customerName ||
    item?.username ||
    fallback
  );
}

function getItemId(item, fallbackIndex = 0) {
  return (
    item?.id ||
    item?.conversationId ||
    item?.userId ||
    item?.senderId ||
    `local-${fallbackIndex}`
  );
}

function getChannel(item) {
  return (
    item?.channel ||
    item?.channelName ||
    item?.platform ||
    item?.source ||
    "mychat"
  )
    .toString()
    .toLowerCase();
}

function getTimeValue(item) {
  return (
    item?.updatedAt ||
    item?.updatedAtUtc ||
    item?.lastMessageAt ||
    item?.createdAt ||
    item?.createdAtUtc ||
    item?.sentAt ||
    item?.timestamp ||
    null
  );
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
}

function getInitials(name) {
  const value = String(name || "U").trim();

  if (!value) return "U";

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function readLocalObject(key, fallback) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage errors.
  }
}

function StatusPill({ children, tone = "neutral" }) {
  return (
    <span className={`status-pill status-pill-${tone}`}>
      <span className="status-pill-dot" />
      {children}
    </span>
  );
}

function Avatar({ name, size = "md" }) {
  return (
    <div className={`avatar avatar-${size}`} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}

function Overview({ user, onNavigate }) {
  const [summary, setSummary] = useState({
    total: 0,
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    mychat: 0,
  });

  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);

    try {
      const channels = [
        "whatsapp",
        "messenger",
        "instagram",
        "mychat",
      ];

      const responses = await Promise.all(
        channels.map((currentChannel) =>
          api.get(
            `/api/inbox?channel=${encodeURIComponent(currentChannel)}`
          )
        )
      );

      const counts = responses.map((response) => {
        if (Array.isArray(response?.conversations)) {
          return response.conversations.length;
        }

        return safeArray(response).length;
      });

      const nextSummary = {
        whatsapp: counts[0] || 0,
        messenger: counts[1] || 0,
        instagram: counts[2] || 0,
        mychat: counts[3] || 0,
      };

      nextSummary.total =
        nextSummary.whatsapp +
        nextSummary.messenger +
        nextSummary.instagram +
        nextSummary.mychat;

      setSummary(nextSummary);
    } catch (error) {
      console.error("Failed to load inbox summary:", error);

      setSummary({
        total: 0,
        whatsapp: 0,
        messenger: 0,
        instagram: 0,
        mychat: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Command Center</span>
          <h1>Good to see you, {user?.displayName || "there"}</h1>
          <p>
            Manage conversations, channels, automation and messaging from one
            workspace.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate("inbox")}
        >
          Open Inbox
          <Inbox size={17} />
        </button>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <Inbox size={20} />
          </div>

          <div>
            <span className="metric-label">Total Conversations</span>
            <strong>{loading ? "—" : summary.total}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon metric-green">
            <MessageCircle size={20} />
          </div>

          <div>
            <span className="metric-label">My Chat</span>
            <strong>{loading ? "—" : summary.mychat}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <Link2 size={20} />
          </div>

          <div>
            <span className="metric-label">WhatsApp</span>
            <strong>{loading ? "—" : summary.whatsapp}</strong>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <Users size={20} />
          </div>

          <div>
            <span className="metric-label">Social Channels</span>
            <strong>
              {loading
                ? "—"
                : summary.messenger + summary.instagram}
            </strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel-card dashboard-main-card">
          <div className="panel-header">
            <div>
              <h2>Workspace modules</h2>
              <p>Jump directly into the part of AP OmniChat you need.</p>
            </div>
          </div>

          <div className="module-grid">
            <button
              type="button"
              className="module-card"
              onClick={() => onNavigate("inbox")}
            >
              <Inbox size={22} />
              <div>
                <strong>Unified Inbox</strong>
                <span>Centralize supported channel conversations.</span>
              </div>
            </button>

            <button
              type="button"
              className="module-card"
              onClick={() => onNavigate("mychat")}
            >
              <MessageCircle size={22} />
              <div>
                <strong>My Chat</strong>
                <span>Internal personal messaging.</span>
              </div>
            </button>

            <button
              type="button"
              className="module-card"
              onClick={() => onNavigate("connections")}
            >
              <Link2 size={22} />
              <div>
                <strong>Connection Center</strong>
                <span>Manage WhatsApp, Instagram and Messenger.</span>
              </div>
            </button>

          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2>System status</h2>
              <p>Frontend runtime indicators.</p>
            </div>

            <Activity size={20} />
          </div>

          <div className="status-list">
            <div className="status-row">
              <span>Frontend</span>
              <StatusPill tone="success">Running</StatusPill>
            </div>

            <div className="status-row">
              <span>Authentication</span>
              <StatusPill tone="success">Session Active</StatusPill>
            </div>

            <div className="status-row">
              <span>Real-time messaging</span>
              <StatusPill tone="neutral">Backend Driven</StatusPill>
            </div>

            <div className="status-row">
              <span>API</span>
              <StatusPill tone="neutral">Backend Driven</StatusPill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnifiedInbox() {
  const [channel, setChannel] = useState("all");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [meta, setMeta] = useState(() =>
    readLocalObject(STORAGE_KEYS.inboxMeta, {})
  );

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let normalized = [];

      if (channel === "all") {
        const channels = [
          "whatsapp",
          "messenger",
          "instagram",
          "mychat",
        ];

        const responses = await Promise.all(
          channels.map((currentChannel) =>
            api.get(
              `/api/inbox?channel=${encodeURIComponent(currentChannel)}`
            )
          )
        );

        normalized = responses.flatMap((response) =>
          safeArray(response)
        );
      } else {
        const response = await api.get(
          `/api/inbox?channel=${encodeURIComponent(channel)}`
        );

        normalized = safeArray(response);
      }

      const mapped = normalized.map((item, index) => ({
        ...item,
        __id: String(getItemId(item, index)),
        __name: getDisplayName(item),
        __channel: getChannel(item),
        __time: getTimeValue(item),
      }));

      setItems(mapped);

      if (mapped.length > 0) {
        setSelectedId((previous) =>
          mapped.some((item) => item.__id === previous)
            ? previous
            : mapped[0].__id
        );
      } else {
        setSelectedId("");
      }
    } catch (err) {
      if (err?.unauthorized) {
        clearAccessToken();
      }

      setError(err?.message || "Unable to load inbox.");
      setItems([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      const haystack = [
        item.__name,
        item?.email,
        item?.username,
        item?.lastMessage,
        item?.preview,
        item?.text,
        item?.channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search]);

  const selected = useMemo(
    () =>
      filteredItems.find((item) => item.__id === selectedId) ||
      items.find((item) => item.__id === selectedId) ||
      null,
    [filteredItems, items, selectedId]
  );

  const updateMeta = (id, patch) => {
    setMeta((previous) => {
      const next = {
        ...previous,
        [id]: {
          ...(previous[id] || {}),
          ...patch,
        },
      };

      writeLocalObject(STORAGE_KEYS.inboxMeta, next);

      return next;
    });
  };

  const selectedMeta = selected ? meta[selected.__id] || {} : {};

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Messaging</span>
          <h1>Unified Inbox</h1>
          <p>
            View supported channel conversations in one place.
          </p>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={loadInbox}
          title="Refresh inbox"
          aria-label="Refresh inbox"
        >
          <Activity size={18} />
        </button>
      </div>

      <div className="inbox-layout">
        <aside className="inbox-sidebar panel-card">
          <div className="inbox-toolbar">
            <div className="search-box">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search conversations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="filter-tabs">
              {CHANNELS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={channel === item.id ? "active" : ""}
                  onClick={() => setChannel(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="conversation-list">
            {loading && (
              <div className="empty-state compact">
                <div className="loading-spinner" />
                <span>Loading inbox...</span>
              </div>
            )}

            {!loading && error && (
              <div className="empty-state compact">
                <CircleAlert size={24} />
                <strong>Inbox unavailable</strong>
                <span>{error}</span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadInbox}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && filteredItems.length === 0 && (
              <div className="empty-state compact">
                <Inbox size={26} />
                <strong>No conversations</strong>
                <span>
                  No conversations match the current filter.
                </span>
              </div>
            )}

            {!loading &&
              !error &&
              filteredItems.map((item) => {
                const itemMeta = meta[item.__id] || {};

                return (
                  <button
                    type="button"
                    key={item.__id}
                    className={`conversation-item ${
                      selectedId === item.__id ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(item.__id);

                      updateMeta(item.__id, {
                        unread: 0,
                      });
                    }}
                  >
                    <Avatar name={item.__name} />

                    <div className="conversation-item-content">
                      <div className="conversation-item-top">
                        <strong>{item.__name}</strong>
                        <span>{formatTime(item.__time)}</span>
                      </div>

                      <div className="conversation-item-bottom">
                        <span>
                          {item?.lastMessage ||
                            item?.preview ||
                            item?.text ||
                            "No preview available"}
                        </span>

                        {itemMeta.unread > 0 && (
                          <span className="unread-badge">
                            {itemMeta.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        <section className="inbox-detail panel-card">
          {!selected ? (
            <div className="empty-state">
              <Inbox size={44} />
              <h3>Select a conversation</h3>
              <p>
                Choose a conversation from the left to inspect its details.
              </p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div className="profile-header">
                  <Avatar name={selected.__name} size="lg" />

                  <div>
                    <h2>{selected.__name}</h2>

                    <div className="profile-subline">
                      <span>
                        {selected?.email ||
                          selected?.username ||
                          selected?.phone ||
                          "Contact"}
                      </span>

                      <span className="channel-tag">
                        {selected.__channel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-actions">
                  <button
                    type="button"
                    className={`icon-button ${
                      selectedMeta.starred ? "active-icon" : ""
                    }`}
                    onClick={() =>
                      updateMeta(selected.__id, {
                        starred: !selectedMeta.starred,
                      })
                    }
                    title="Star"
                    aria-label="Star conversation"
                  >
                    <Star
                      size={18}
                      fill={
                        selectedMeta.starred ? "currentColor" : "none"
                      }
                    />
                  </button>

                  <button
                    type="button"
                    className={`icon-button ${
                      selectedMeta.pinned ? "active-icon" : ""
                    }`}
                    onClick={() =>
                      updateMeta(selected.__id, {
                        pinned: !selectedMeta.pinned,
                      })
                    }
                    title="Pin"
                    aria-label="Pin conversation"
                  >
                    <Tag size={18} />
                  </button>
                </div>
              </div>

              <div className="detail-body">
                <div className="contact-card">
                  <div className="contact-card-header">
                    <div>
                      <span className="eyebrow">Contact profile</span>
                      <h3>{selected.__name}</h3>
                    </div>

                    <Users size={22} />
                  </div>

                  <div className="contact-grid">
                    <div>
                      <span>Email</span>
                      <strong>{selected?.email || "Not available"}</strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>{selected?.phone || "Not available"}</strong>
                    </div>

                    <div>
                      <span>Channel</span>
                      <strong>{selected.__channel}</strong>
                    </div>

                    <div>
                      <span>Conversation ID</span>
                      <strong>{selected.__id}</strong>
                    </div>
                  </div>
                </div>

                <div className="message-preview-card">
                  <span className="eyebrow">Latest message</span>

                  <div className="message-preview-bubble">
                    {selected?.lastMessage ||
                      selected?.preview ||
                      selected?.text ||
                      "No message preview available."}
                  </div>
                </div>

                <div className="quick-reply-row">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText("Hello! How can we help you today?")
                    }
                  >
                    Quick Reply
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(
                          "Thanks for reaching out. We will get back to you shortly."
                        )
                    }
                  >
                    Thanks
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText("Could you please share more details?")
                    }
                  >
                    Ask Details
                  </button>
                </div>

                <div className="external-send-note">
                  <CircleAlert size={17} />
                  <span>
                    Incoming customer messages are handled in the Unified Inbox.
                    Automatic AI replies and external-channel sending are controlled
                    by the connected channel backend.
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Insights</span>
          <h1>Analytics</h1>
          <p>
            The visual layer is ready for backend reporting data.
          </p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card large-number-card">
          <BarChart3 size={22} />
          <div>
            <span>Messages</span>
            <strong>—</strong>
            <small>Connect reporting endpoint</small>
          </div>
        </div>

        <div className="metric-card large-number-card">
          <Users size={22} />
          <div>
            <span>Contacts</span>
            <strong>—</strong>
            <small>Connect reporting endpoint</small>
          </div>
        </div>

        <div className="metric-card large-number-card">
          <CheckCheck size={22} />
          <div>
            <span>Read Rate</span>
            <strong>—</strong>
            <small>Connect reporting endpoint</small>
          </div>
        </div>

        <div className="metric-card large-number-card">
          <Activity size={22} />
          <div>
            <span>Response Time</span>
            <strong>—</strong>
            <small>Connect reporting endpoint</small>
          </div>
        </div>
      </div>

      <div className="panel-card chart-placeholder">
        <BarChart3 size={42} />
        <h2>Analytics data layer</h2>
        <p>
          No reporting endpoint was invented in the frontend. Once the .NET
          analytics API is available, this section can consume it directly.
        </p>
      </div>
    </div>
  );
}

function SettingsPage({ preferences, setPreferences }) {
  function updatePreference(key, value) {
    const next = {
      ...preferences,
      [key]: value,
    };

    setPreferences(next);
    writeLocalObject(STORAGE_KEYS.preferences, next);
  }

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Settings</h1>
          <p>Configure local workspace preferences.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2>Notifications</h2>
              <p>Frontend preference controls.</p>
            </div>

            <Bell size={21} />
          </div>

          <div className="settings-list">
            <label className="setting-row">
              <div>
                <strong>Message notifications</strong>
                <span>Show notification preferences in the app.</span>
              </div>

              <input
                type="checkbox"
                checked={preferences.messageNotifications !== false}
                onChange={(event) =>
                  updatePreference(
                    "messageNotifications",
                    event.target.checked
                  )
                }
              />
            </label>

            <label className="setting-row">
              <div>
                <strong>Sound notifications</strong>
                <span>Enable notification sound preference.</span>
              </div>

              <input
                type="checkbox"
                checked={preferences.soundNotifications !== false}
                onChange={(event) =>
                  updatePreference(
                    "soundNotifications",
                    event.target.checked
                  )
                }
              />
            </label>

            <label className="setting-row">
              <div>
                <strong>Auto refresh inbox</strong>
                <span>Keep automatic inbox refresh preference.</span>
              </div>

              <input
                type="checkbox"
                checked={preferences.autoRefresh !== false}
                onChange={(event) =>
                  updatePreference("autoRefresh", event.target.checked)
                }
              />
            </label>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h2>Workspace information</h2>
              <p>Current frontend configuration.</p>
            </div>

            <Command size={21} />
          </div>

          <div className="info-list">
            <div className="info-row">
              <span>Frontend</span>
              <strong>Vite + React</strong>
            </div>

            <div className="info-row">
              <span>Authentication</span>
              <strong>JWT Bearer</strong>
            </div>

            <div className="info-row">
              <span>Real-time messaging</span>
              <strong>Backend Driven</strong>
            </div>

            <div className="info-row">
              <span>API Base</span>
              <strong>
                {import.meta.env.VITE_API_BASE_URL || "http://localhost:5202"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [preferences, setPreferences] = useState(() =>
    readLocalObject(STORAGE_KEYS.preferences, {
      messageNotifications: true,
      soundNotifications: true,
      autoRefresh: true,
    })
  );

  const searchTimer = useRef(null);

  const role = useMemo(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.userRole) || "user";
    } catch {
      return "user";
    }
  }, [user]);

  const bootstrap = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setUser(null);
      setBootstrapping(false);
      return;
    }

    try {
      const currentUser = await api.get("/api/auth/me");
      setUser(currentUser);
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  async function handleGlobalSearch(value) {
    setGlobalSearch(value);

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    if (value.trim().length < 3) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchOpen(true);

      try {
        const response = await api.get(
          `/api/users/search?q=${encodeURIComponent(value.trim())}`
        );

        setSearchResults(safeArray(response));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }

  function handleAuthenticated(nextUser) {
    setUser(nextUser);
    setActiveTab("overview");
    setMobileMenuOpen(false);
  }

  function handleLogout() {
    clearAccessToken();

    try {
      localStorage.removeItem(STORAGE_KEYS.userRole);
    } catch {
      // Ignore.
    }

    setUser(null);
    setActiveTab("overview");
  }

  function navigate(tab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }

  function renderContent() {
    switch (activeTab) {
      case "overview":
        return <Overview user={user} onNavigate={navigate} />;

      case "inbox":
        return <UnifiedInbox />;

      case "mychat":
        return <MyChat currentUser={user} />;

      case "connections":
        return <ConnectionCenter />;

      case "analytics":
        return <AnalyticsPage />;

      case "settings":
        return (
          <SettingsPage
            preferences={preferences}
            setPreferences={setPreferences}
          />
        );

      case "admin":
        return <AdminPage />;

      default:
        return <Overview user={user} onNavigate={navigate} />;
    }
  }

  if (bootstrapping) {
    return (
      <div className="app-loading-screen">
        <div className="brand-mark">AP</div>
        <div className="loading-spinner" />
        <span>Starting AP OmniChat...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const activeNavItem = NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="app-shell">
      <aside
        className={`app-sidebar ${
          mobileMenuOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-mark">AP</div>

          <div>
            <strong>AP OmniChat</strong>
            <span>Command Workspace</span>
          </div>

          <button
            type="button"
            className="sidebar-close mobile-only"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-section-label">Workspace</div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-group">
            {NAV_ITEMS.filter((item) => item.id !== "settings").map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={activeTab === item.id ? "active" : ""}
                  onClick={() => navigate(item.id)}
                >
                  <span className="nav-icon-wrap"><Icon size={18} /></span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-section-label channels-divider">
            Channels
          </div>

          <div className="sidebar-channel-group">
            <button
              type="button"
              className={activeTab === "inbox" ? "active" : ""}
              onClick={() => navigate("inbox")}
            >
              <span className="nav-icon-wrap"><Inbox size={18} /></span>
              <span>All Channels</span>
            </button>

            <button
              type="button"
              className={activeTab === "mychat" ? "active" : ""}
              onClick={() => navigate("mychat")}
            >
              <span className="nav-icon-wrap"><MessageCircle size={18} /></span>
              <span>My Chat</span>
            </button>
          </div>

          <div className="sidebar-bottom-nav">
            <button
              type="button"
              className={activeTab === "settings" ? "active" : ""}
              onClick={() => navigate("settings")}
            >
              <span className="nav-icon-wrap"><Settings size={18} /></span>
              <span>Settings</span>
            </button>

            {role === "admin" && (
              <button
                type="button"
                className={activeTab === "admin" ? "active" : ""}
                onClick={() => navigate("admin")}
              >
                <span className="nav-icon-wrap"><ShieldCheck size={18} /></span>
                <span>Admin Center</span>
              </button>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <Avatar name={user?.displayName || user?.email} />

            <div>
              <strong>{user?.displayName || "User"}</strong>
              <span>{user?.email || "Authenticated"}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          <div className="topbar-left">
            <div className="topbar-title">
              {activeTab === "admin"
                ? "Admin Center"
                : activeNavItem?.label || "AP OmniChat"}
            </div>

            <div className="topbar-status">
              <span className="online-dot" />
              Workspace Active
            </div>
          </div>

          <div className="global-search-wrapper">
            <Search size={17} />

            <input
              type="search"
              value={globalSearch}
              onChange={(event) =>
                handleGlobalSearch(event.target.value)
              }
              onFocus={() => {
                if (globalSearch.trim().length >= 3) {
                  setSearchOpen(true);
                }
              }}
              placeholder="Search people by username, name..."
            />

            {globalSearch && (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  setGlobalSearch("");
                  setSearchResults([]);
                  setSearchOpen(false);
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {searchOpen && globalSearch.trim().length >= 3 && (
              <div className="search-dropdown">
                <div className="search-dropdown-header">
                  <span>People</span>

                  {searchLoading && (
                    <div className="loading-spinner tiny" />
                  )}
                </div>

                {!searchLoading && searchResults.length === 0 && (
                  <div className="search-empty">
                    No matching people found.
                  </div>
                )}

                {!searchLoading &&
                  searchResults.map((person, index) => {
                    const personName = getDisplayName(
                      person,
                      "User"
                    );

                    return (
                      <button
                        type="button"
                        key={getItemId(person, index)}
                        className="search-result-item"
                        onClick={() => {
                          setSearchOpen(false);
                          setGlobalSearch("");
                          navigate("mychat");
                        }}
                      >
                        <Avatar name={personName} size="sm" />

                        <div>
                          <strong>{personName}</strong>
                          <span>
                            {person?.email ||
                              person?.username ||
                              "User"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="user-chip">
              <Avatar
                name={user?.displayName || user?.email}
                size="sm"
              />

              <span>
                {user?.displayName || user?.email}
              </span>

              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        <main className="app-content">{renderContent()}</main>
      </div>
    </div>
  );
}

export default App;
