import React, { useEffect, useState } from "react";
import { fetchInboxSummary, getUserLabel } from "../inbox";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import "./AdminPage.css";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "connections", label: "Connections", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "System Settings", icon: Settings },
];

function StatusBadge({ active, activeText = "Active", inactiveText = "Not connected" }) {
  return (
    <span className={`admin-status ${active ? "is-active" : "is-inactive"}`}>
      {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {active ? activeText : inactiveText}
    </span>
  );
}

function StatCard({ icon: Icon, label, value = "—", detail }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-icon">
        <Icon size={20} />
      </div>
      <div className="admin-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

function OverviewSection({ summary, loading }) {
  return (
    <div className="admin-section-content">
      <div className="admin-stats-grid">
        <StatCard
          icon={MessageSquare}
          label="Total conversations"
          value={loading ? "—" : summary.total}
          detail="From your workspace inbox"
        />
        <StatCard
          icon={Users}
          label="My Chat threads"
          value={loading ? "—" : summary.mychat}
          detail="Internal conversations"
        />
        <StatCard
          icon={Activity}
          label="WhatsApp"
          value={loading ? "—" : summary.whatsapp}
          detail="Channel conversations"
        />
        <StatCard
          icon={Bot}
          label="Social channels"
          value={loading ? "—" : summary.messenger + summary.instagram}
          detail="Messenger + Instagram"
        />
      </div>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h3>Platform services</h3>
            <p>Service status overview</p>
          </div>
          <span className="admin-muted-label">Status not verified live</span>
        </div>

        <div className="admin-service-list">
          <div className="admin-service-row">
            <div className="admin-service-icon"><Activity size={18} /></div>
            <div className="admin-service-info">
              <strong>Application API</strong>
              <span>Backend availability</span>
            </div>
            <StatusBadge active={false} inactiveText="Not checked" />
          </div>
          <div className="admin-service-row">
            <div className="admin-service-icon"><MessageSquare size={18} /></div>
            <div className="admin-service-info">
              <strong>Real-time chat</strong>
              <span>SignalR connection status</span>
            </div>
            <StatusBadge active={false} inactiveText="Not checked" />
          </div>
          <div className="admin-service-row">
            <div className="admin-service-icon"><Bot size={18} /></div>
            <div className="admin-service-info">
              <strong>AI assistant</strong>
              <span>AI provider configuration</span>
            </div>
            <StatusBadge active={false} inactiveText="Not checked" />
          </div>
        </div>
      </section>

      <div className="admin-notice">
        <CircleHelp size={19} />
        <div>
          <strong>Admin dashboard is ready for backend integration</strong>
          <p>
            Statistics and management actions are placeholders until the
            corresponding secured admin API endpoints are connected.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaceholderSection({ title, description }) {
  return (
    <section className="admin-panel admin-placeholder">
      <div className="admin-placeholder-icon"><ShieldCheck size={26} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span>Waiting for secured admin API integration</span>
    </section>
  );
}

export default function AdminPage({ onBack, embedded = false, user }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [summary, setSummary] = useState({
    total: 0,
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    mychat: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const selectedSection = sections.find((section) => section.id === activeSection);
  const adminName = getUserLabel(user);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setSummaryLoading(true);

      try {
        const data = await fetchInboxSummary();

        if (!cancelled) {
          setSummary({
            total: Number(data?.total) || 0,
            whatsapp: Number(data?.whatsapp) || 0,
            messenger: Number(data?.messenger) || 0,
            instagram: Number(data?.instagram) || 0,
            mychat: Number(data?.mychat) || 0,
          });
        }
      } catch {
        if (!cancelled) {
          setSummary({
            total: 0,
            whatsapp: 0,
            messenger: 0,
            instagram: 0,
            mychat: 0,
          });
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "users":
        return (
          <PlaceholderSection
            title="User Management"
            description="View users, inspect account details, and manage access when the admin endpoints are available."
          />
        );
      case "connections":
        return (
          <PlaceholderSection
            title="Connection Management"
            description="Review connected channels and manage integration settings through secured admin APIs."
          />
        );
      case "analytics":
        return (
          <PlaceholderSection
            title="Platform Analytics"
            description="Usage, messaging, and engagement reports will appear here when analytics data is available."
          />
        );
      case "settings":
        return (
          <PlaceholderSection
            title="System Settings"
            description="Configure platform-wide options and service settings using authorized admin endpoints."
          />
        );
      default:
        return <OverviewSection summary={summary} loading={summaryLoading} />;
    }
  };

  return (
    <main className={embedded ? "admin-page admin-page--embedded" : "admin-page"}>
      {!embedded && (
      <header className="admin-topbar">
        <div className="admin-brand">
          <div className="admin-brand-mark"><ShieldCheck size={22} /></div>
          <div>
            <strong>AP OmniChat</strong>
            <span>Administration</span>
          </div>
        </div>

        {onBack && (
          <button className="admin-back-button" onClick={onBack} type="button">
            <ArrowLeft size={17} />
            Back to app
          </button>
        )}
      </header>
      )}

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-label">ADMIN CONSOLE</div>
          <nav className="admin-nav">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={`admin-nav-item ${activeSection === id ? "active" : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
                <ChevronRight className="admin-nav-chevron" size={16} />
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-avatar">AD</div>
            <div>
              <strong>{adminName}</strong>
              <span>Admin console</span>
            </div>
          </div>
        </aside>

        <section className="admin-main">
          <div className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">AP OMNICHAT / ADMIN</span>
              <h1>{selectedSection?.label || "Administration"}</h1>
              <p>Manage and monitor your AP OmniChat platform.</p>
            </div>
            <span className="admin-role-chip"><ShieldCheck size={15} /> Admin area</span>
          </div>

          {renderSection()}
        </section>
      </div>
    </main>
  );
}