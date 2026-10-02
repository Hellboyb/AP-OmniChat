import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bot,
  Camera,
  CheckCircle2,
  Globe2,
  KeyRound,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Unplug
} from "lucide-react";
import { api } from "../api";
import "./ConnectionCenter.css";

const CHANNELS = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    description: "Connect your WhatsApp Business Cloud API",
    accent: "green",
    fields: [
      { key: "appId", label: "App ID", placeholder: "Enter Meta App ID" },
      {
        key: "appSecret",
        label: "App Secret",
        placeholder: "Enter Meta App Secret",
        secret: true
      },
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "Enter WhatsApp access token",
        secret: true
      },
      {
        key: "businessAccountId",
        label: "Business Account ID",
        placeholder: "Enter WhatsApp Business Account ID"
      },
      {
        key: "phoneNumberId",
        label: "Phone Number ID",
        placeholder: "Enter WhatsApp Phone Number ID"
      },
      {
        key: "verifyToken",
        label: "Verify Token",
        placeholder: "Enter your webhook verify token",
        secret: true
      },
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://your-domain.com/api/webhooks/whatsapp"
      },
      {
        key: "apiVersion",
        label: "Graph API Version",
        placeholder: "Example: v23.0"
      }
    ]
  },
  {
    id: "facebook",
    name: "Facebook Messenger",
    icon: Globe2,
    description: "Connect Facebook Page Messenger",
    accent: "blue",
    fields: [
      { key: "appId", label: "App ID", placeholder: "Enter Meta App ID" },
      {
        key: "appSecret",
        label: "App Secret",
        placeholder: "Enter Meta App Secret",
        secret: true
      },
      {
        key: "pageId",
        label: "Facebook Page ID",
        placeholder: "Enter Facebook Page ID"
      },
      {
        key: "pageAccessToken",
        label: "Page Access Token",
        placeholder: "Enter Page Access Token",
        secret: true
      },
      {
        key: "verifyToken",
        label: "Verify Token",
        placeholder: "Enter your webhook verify token",
        secret: true
      },
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://your-domain.com/api/webhooks/facebook"
      }
    ]
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Camera,
    description: "Connect your Instagram Professional account",
    accent: "pink",
    fields: [
      { key: "appId", label: "App ID", placeholder: "Enter Meta App ID" },
      {
        key: "appSecret",
        label: "App Secret",
        placeholder: "Enter Meta App Secret",
        secret: true
      },
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "Enter Instagram access token",
        secret: true
      },
      {
        key: "instagramAccountId",
        label: "Instagram Account ID",
        placeholder: "Enter Instagram Professional Account ID"
      },
      {
        key: "pageId",
        label: "Facebook Page ID",
        placeholder: "Enter linked Facebook Page ID"
      },
      {
        key: "verifyToken",
        label: "Verify Token",
        placeholder: "Enter your webhook verify token",
        secret: true
      },
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://your-domain.com/api/webhooks/instagram"
      }
    ]
  }
];

const AI_PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Connect your own Gemini API key"
  },
  {
    id: "openai",
    name: "OpenAI / ChatGPT",
    description: "Connect your own OpenAI API key"
  }
];

function createInitialValues() {
  return CHANNELS.reduce((result, channel) => {
    result[channel.id] = {};

    channel.fields.forEach((field) => {
      result[channel.id][field.key] = "";
    });

    return result;
  }, {});
}

function createInitialVisibility() {
  return CHANNELS.reduce((result, channel) => {
    result[channel.id] = {};

    channel.fields.forEach((field) => {
      result[channel.id][field.key] = false;
    });

    return result;
  }, {});
}

function normalizeConnection(connection) {
  return {
    channelId: connection.channelId || connection.channel || "",
    status: connection.status || "Not connected",
    connectedAtUtc: connection.connectedAtUtc || null
  };
}

export default function ConnectionCenter() {
  const [connections, setConnections] = useState([]);
  const [values, setValues] = useState(createInitialValues);
  const [visibility, setVisibility] = useState(createInitialVisibility);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState("");
  const [message, setMessage] = useState(null);

  const [aiConnections, setAiConnections] = useState([]);
  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiAction, setAiAction] = useState("");

  async function loadConnections() {
    setLoading(true);

    try {
      const result = await api.get("/api/connections");

      const list = Array.isArray(result)
        ? result
        : result?.connections || [];

      setConnections(list.map(normalizeConnection));
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Unable to load connection status."
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadAiConnections() {
    setAiLoading(true);

    try {
      const result = await api.get("/api/ai-connections");

      const list = Array.isArray(result)
        ? result
        : result?.connections || [];

      setAiConnections(list);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Unable to load AI connection status."
      });
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
    loadAiConnections();
  }, []);

  function getConnection(channelId) {
    return (
      connections.find((connection) => connection.channelId === channelId) ||
      null
    );
  }

  function getAiConnection(provider) {
    return (
      aiConnections.find(
        (connection) =>
          connection.provider?.toLowerCase() === provider.toLowerCase()
      ) || null
    );
  }

  function updateField(channelId, key, value) {
    setValues((current) => ({
      ...current,
      [channelId]: {
        ...current[channelId],
        [key]: value
      }
    }));
  }

  function toggleVisibility(channelId, key) {
    setVisibility((current) => ({
      ...current,
      [channelId]: {
        ...current[channelId],
        [key]: !current[channelId][key]
      }
    }));
  }

  function validateFields(channel) {
    const currentValues = values[channel.id];

    const missing = channel.fields
      .filter((field) => !String(currentValues[field.key] || "").trim())
      .map((field) => field.label);

    if (missing.length > 0) {
      setMessage({
        type: "error",
        text: `${channel.name}: please fill ${missing.join(", ")}.`
      });

      return false;
    }

    return true;
  }

  async function connectChannel(channel) {
    setMessage(null);

    if (!validateFields(channel)) {
      return;
    }

    setActiveAction(`${channel.id}:connect`);

    try {
      const result = await api.post(
        `/api/connections/${channel.id}/authorize`,
        {
          channelId: channel.id,
          credentials: values[channel.id]
        }
      );

      await loadConnections();

      setMessage({
        type: result?.status === "Connected" ? "success" : "warning",
        text:
          result?.message ||
          result?.status ||
          `${channel.name} connection verification completed.`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          `Unable to verify ${channel.name} connection.`
      });
    } finally {
      setActiveAction("");
    }
  }

  async function disconnectChannel(channel) {
    setMessage(null);
    setActiveAction(`${channel.id}:disconnect`);

    try {
      const result = await api.post(
        `/api/connections/${channel.id}/disconnect`
      );

      await loadConnections();

      setMessage({
        type: "success",
        text:
          result?.message ||
          `${channel.name} has been disconnected.`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          `Unable to disconnect ${channel.name}.`
      });
    } finally {
      setActiveAction("");
    }
  }

  function clearChannel(channelId) {
    setValues((current) => ({
      ...current,
      [channelId]: CHANNELS.find((channel) => channel.id === channelId)
        .fields.reduce((result, field) => {
          result[field.key] = "";
          return result;
        }, {})
    }));
  }

  async function connectAi() {
    setMessage(null);

    if (!aiApiKey.trim()) {
      setMessage({
        type: "error",
        text: "Please enter your AI API key."
      });

      return;
    }

    setAiAction("connect");

    try {
      const result = await api.post(
        "/api/ai-connections/connect",
        {
          provider: aiProvider,
          apiKey: aiApiKey.trim()
        }
      );

      await loadAiConnections();

      setAiApiKey("");

      setMessage({
        type: result?.status === "Connected" ? "success" : "warning",
        text:
          result?.message ||
          `${aiProvider} connection verification completed.`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Unable to connect the selected AI provider."
      });
    } finally {
      setAiAction("");
    }
  }

  async function disconnectAi(provider) {
    setMessage(null);
    setAiAction(`${provider}:disconnect`);

    try {
      const result = await api.post(
        `/api/ai-connections/${provider}/disconnect`
      );

      await loadAiConnections();

      setMessage({
        type: "success",
        text:
          result?.message ||
          `${provider} has been disconnected.`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Unable to disconnect the AI provider."
      });
    } finally {
      setAiAction("");
    }
  }

  const selectedAiConnection = getAiConnection(aiProvider);

  const selectedAiConnected =
    selectedAiConnection?.status?.toLowerCase() === "connected";

  return (
    <section className="connection-page">
      <div className="connection-hero">
        <div>
          <div className="connection-eyebrow">
            <ShieldCheck size={15} />
            OFFICIAL API CONNECTIONS
          </div>

          <h1>Connect Your Channels</h1>

          <p>
            Add your own official API credentials and securely connect
            WhatsApp, Facebook Messenger and Instagram to AP-OmniChat.
          </p>
        </div>

        <button
          className="refresh-connections"
          onClick={() => {
            loadConnections();
            loadAiConnections();
          }}
          disabled={loading || aiLoading}
        >
          <RefreshCw
            size={17}
            className={loading || aiLoading ? "spin" : ""}
          />
          Refresh Status
        </button>
      </div>

      {message && (
        <div className={`connection-alert ${message.type}`}>
          {message.type === "success" ? (
            <CheckCircle2 size={19} />
          ) : (
            <AlertCircle size={19} />
          )}

          <span>{message.text}</span>

          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="security-note">
        <ShieldCheck size={19} />

        <div>
          <strong>Your credentials stay yours.</strong>
          <span>
            AP-OmniChat does not invent, provide or silently configure
            third-party API credentials. Enter credentials from the official
            provider dashboard and the backend will verify the connection.
          </span>
        </div>
      </div>

      <div className="connection-grid">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const connection = getConnection(channel.id);

          const connected =
            connection?.status?.toLowerCase() === "connected";

          const connecting = activeAction === `${channel.id}:connect`;
          const disconnecting =
            activeAction === `${channel.id}:disconnect`;

          return (
            <article
              key={channel.id}
              className={`connection-card ${channel.accent}`}
            >
              <div className="card-top">
                <div className="channel-identity">
                  <div className="channel-icon">
                    <Icon size={26} />
                  </div>

                  <div>
                    <h2>{channel.name}</h2>
                    <p>{channel.description}</p>
                  </div>
                </div>

                <div
                  className={`status-pill ${
                    connected ? "connected" : "offline"
                  }`}
                >
                  <span />
                  {connected ? "Connected" : "Not connected"}
                </div>
              </div>

              <div className="card-divider" />

              <div className="api-heading">
                <div>
                  <KeyRound size={17} />
                  <span>API Configuration</span>
                </div>

                <small>
                  {channel.fields.length} required fields
                </small>
              </div>

              <div className="field-grid">
                {channel.fields.map((field) => {
                  const isVisible =
                    visibility[channel.id]?.[field.key];

                  return (
                    <label
                      className={`api-field ${
                        field.key === "webhookUrl" ? "full" : ""
                      }`}
                      key={field.key}
                    >
                      <span>{field.label}</span>

                      <div className="input-wrap">
                        <input
                          type={
                            field.secret && !isVisible
                              ? "password"
                              : "text"
                          }
                          value={
                            values[channel.id]?.[field.key] || ""
                          }
                          onChange={(event) =>
                            updateField(
                              channel.id,
                              field.key,
                              event.target.value
                            )
                          }
                          placeholder={field.placeholder}
                          autoComplete="off"
                        />

                        {field.secret && (
                          <button
                            type="button"
                            onClick={() =>
                              toggleVisibility(
                                channel.id,
                                field.key
                              )
                            }
                          >
                            {isVisible ? "Hide" : "Show"}
                          </button>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="card-footer">
                <button
                  className="clear-button"
                  type="button"
                  onClick={() => clearChannel(channel.id)}
                  disabled={connecting || disconnecting}
                >
                  Clear
                </button>

                {connected ? (
                  <button
                    className="disconnect-button"
                    type="button"
                    onClick={() => disconnectChannel(channel)}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 size={17} className="spin" />
                    ) : (
                      <Unplug size={17} />
                    )}

                    {disconnecting
                      ? "Disconnecting..."
                      : "Disconnect"}
                  </button>
                ) : (
                  <button
                    className="connect-button"
                    type="button"
                    onClick={() => connectChannel(channel)}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <Loader2 size={17} className="spin" />
                    ) : (
                      <Link2 size={17} />
                    )}

                    {connecting
                      ? "Verifying..."
                      : `Connect ${channel.name}`}
                  </button>
                )}
              </div>

              {connection?.connectedAtUtc && connected && (
                <div className="connected-info">
                  <Activity size={15} />
                  Connected successfully and verified by the backend.
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* AI CONNECTION */}
      <section className="ai-connection-section">
        <div className="ai-section-header">
          <div>
            <div className="connection-eyebrow">
              <Bot size={15} />
              AI AUTOMATION
            </div>

            <h2>Connect Your AI</h2>

            <p>
              Connect your own AI provider. This AI can later be used
              to automatically reply to customer messages.
            </p>
          </div>

          <div className="ai-status-badge">
            <span
              className={
                selectedAiConnected ? "ai-dot connected" : "ai-dot"
              }
            />
            {selectedAiConnected
              ? "AI Connected"
              : "AI Not connected"}
          </div>
        </div>

        <div className="ai-connection-card">
          <div className="ai-provider-area">
            <div className="ai-provider-title">
              <Bot size={20} />
              <div>
                <strong>AI Provider</strong>
                <span>Select the AI you want AP-OmniChat to use.</span>
              </div>
            </div>

            <div className="ai-provider-grid">
              {AI_PROVIDERS.map((provider) => {
                const connection =
                  getAiConnection(provider.id);

                const connected =
                  connection?.status?.toLowerCase() ===
                  "connected";

                return (
                  <button
                    type="button"
                    key={provider.id}
                    className={`ai-provider-option ${
                      aiProvider === provider.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setAiProvider(provider.id)
                    }
                  >
                    <div>
                      <strong>{provider.name}</strong>
                      <span>{provider.description}</span>
                    </div>

                    {connected && (
                      <CheckCircle2 size={18} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ai-key-area">
            <label className="api-field">
              <span>
                {aiProvider === "gemini"
                  ? "Gemini API Key"
                  : "OpenAI API Key"}
              </span>

              <div className="input-wrap">
                <input
                  type={
                    aiKeyVisible ? "text" : "password"
                  }
                  value={aiApiKey}
                  onChange={(event) =>
                    setAiApiKey(event.target.value)
                  }
                  placeholder={
                    aiProvider === "gemini"
                      ? "Enter your Gemini API key"
                      : "Enter your OpenAI API key"
                  }
                  autoComplete="off"
                />

                <button
                  type="button"
                  onClick={() =>
                    setAiKeyVisible(
                      (current) => !current
                    )
                  }
                >
                  {aiKeyVisible ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="ai-key-note">
              <ShieldCheck size={15} />

              <span>
                Your API key is encrypted by the backend and is
                never returned to the frontend.
              </span>
            </div>
          </div>

          <div className="ai-card-footer">
            {selectedAiConnected ? (
              <button
                className="disconnect-button"
                type="button"
                onClick={() =>
                  disconnectAi(aiProvider)
                }
                disabled={
                  aiAction === `${aiProvider}:disconnect`
                }
              >
                {aiAction ===
                `${aiProvider}:disconnect` ? (
                  <Loader2
                    size={17}
                    className="spin"
                  />
                ) : (
                  <Unplug size={17} />
                )}

                {aiAction ===
                `${aiProvider}:disconnect`
                  ? "Disconnecting..."
                  : `Disconnect ${aiProvider === "gemini"
                      ? "Gemini"
                      : "OpenAI"}`}
              </button>
            ) : (
              <button
                className="connect-button ai-connect-button"
                type="button"
                onClick={connectAi}
                disabled={aiAction === "connect"}
              >
                {aiAction === "connect" ? (
                  <Loader2
                    size={17}
                    className="spin"
                  />
                ) : (
                  <Link2 size={17} />
                )}

                {aiAction === "connect"
                  ? "Verifying AI..."
                  : `Connect ${
                      aiProvider === "gemini"
                        ? "Gemini"
                        : "OpenAI"
                    }`}
              </button>
            )}
          </div>

          {selectedAiConnection?.connectedAtUtc &&
            selectedAiConnected && (
              <div className="connected-info ai-connected-info">
                <Activity size={15} />
                {aiProvider === "gemini"
                  ? "Gemini"
                  : "OpenAI"}{" "}
                is connected and verified by the backend.
              </div>
            )}
        </div>
      </section>

      <div className="connection-bottom-note">
        <ShieldCheck size={17} />

        <span>
          Only official provider APIs should be used. Connection status is
          based on backend verification, not on clicking the Connect button.
        </span>
      </div>
    </section>
  );
}