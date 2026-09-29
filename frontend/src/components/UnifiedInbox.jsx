import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Camera,
  Inbox,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";

import api from "../api";
import {
  CHANNELS,
  fetchConversation,
  fetchInboxChannel,
  formatDate,
  formatTime,
  getChannel,
  getItemPreview,
  getItemTime,
  getItemTitle,
  isAbortError,
} from "../inbox";

const CHANNEL_ICONS = {
  all: Inbox,
  whatsapp: MessageCircle,
  messenger: MessageSquare,
  instagram: Camera,
  mychat: Users,
};

export default function UnifiedInbox({
  activeChannel,
  setActiveChannel,
  globalSearch,
  onOpenMyChat,
  user,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [localSearch, setLocalSearch] = useState("");

  const loadInbox = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const mapped = await fetchInboxChannel(activeChannel, signal);

        mapped.sort((a, b) => {
          const first = new Date(getItemTime(a) || 0).getTime();
          const second = new Date(getItemTime(b) || 0).getTime();
          return second - first;
        });

        setConversations(mapped);
        setSelectedConversation((current) => {
          if (!current) {
            return mapped[0] || null;
          }

          return (
            mapped.find((item) => item.__id === current.__id) ||
            mapped[0] ||
            null
          );
        });
      } catch (loadError) {
        if (isAbortError(loadError)) {
          return;
        }

        setConversations([]);
        setSelectedConversation(null);
        setError(loadError?.message || "Unable to load conversations.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [activeChannel]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadInbox(controller.signal);

    const refreshHandler = () => loadInbox(controller.signal);

    window.addEventListener("ap-omnichat-refresh", refreshHandler);

    return () => {
      controller.abort();
      window.removeEventListener("ap-omnichat-refresh", refreshHandler);
    };
  }, [loadInbox]);

  const searchValue = `${globalSearch || ""} ${localSearch || ""}`.trim();

  const filteredConversations = useMemo(() => {
    const query = searchValue.toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((item) => {
      const haystack = [
        getItemTitle(item),
        getItemPreview(item),
        getChannel(item),
        item?.accountName,
        item?.senderName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [conversations, searchValue]);

  return (
    <section className="inbox-page">
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">CONVERSATIONS</span>
          <h1>Unified Inbox</h1>
          <p>
            View conversations from all connected channels in one place.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => loadInbox()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="inbox-toolbar">
        <div className="channel-tabs">
          {CHANNELS.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.id] || Inbox;

            return (
              <button
                key={channel.id}
                type="button"
                className={
                  activeChannel === channel.id
                    ? "channel-tab channel-tab--active"
                    : "channel-tab"
                }
                onClick={() => {
                  if (channel.id === "mychat" && onOpenMyChat) {
                    onOpenMyChat();
                    return;
                  }

                  setActiveChannel(channel.id);
                }}
              >
                <Icon size={16} />
                {channel.label}
              </button>
            );
          })}
        </div>

        <div className="inbox-search">
          <Search size={17} />
          <input
            type="search"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
          />
        </div>
      </div>

      {error && (
        <div className="section-error">
          <Activity size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="inbox-layout">
        <div className="conversation-list">
          <div className="conversation-list-header">
            <span>
              {loading
                ? "Loading..."
                : `${filteredConversations.length} conversation${
                    filteredConversations.length === 1 ? "" : "s"
                  }`}
            </span>
          </div>

          {loading ? (
            <div className="inbox-empty-state">
              <RefreshCw size={24} className="spin" />
              <strong>Loading conversations</strong>
              <span>Fetching your latest messages...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="inbox-empty-state">
              <Inbox size={28} />
              <strong>No conversations</strong>
              <span>No conversations match your current selection.</span>
            </div>
          ) : (
            filteredConversations.map((item) => {
              const channel = getChannel(item);
              const active = selectedConversation?.__id === item.__id;

              return (
                <button
                  type="button"
                  key={item.__id}
                  className={[
                    "conversation-row",
                    active ? "conversation-row--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedConversation(item)}
                >
                  <div className="conversation-avatar">
                    {getItemTitle(item).charAt(0).toUpperCase()}
                  </div>

                  <div className="conversation-row-content">
                    <div className="conversation-row-top">
                      <strong>{getItemTitle(item)}</strong>
                      <span>{formatTime(getItemTime(item))}</span>
                    </div>
                    <div className="conversation-row-preview">
                      {getItemPreview(item)}
                    </div>
                    <div className="conversation-row-channel">
                      {channel || activeChannel}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <ConversationViewer
          conversation={selectedConversation}
          user={user}
          onMessageSent={(conversationId, message) => {
            setConversations((current) =>
              current.map((item) =>
                String(item.id) === String(conversationId)
                  ? {
                      ...item,
                      lastMessage: message,
                      updatedAtUtc: message?.createdAtUtc,
                    }
                  : item
              )
            );
          }}
        />
      </div>
    </section>
  );
}

function ConversationViewer({ conversation, user, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!conversation?.id) {
      setMessages([]);
      setError("");
      return undefined;
    }

    if (Array.isArray(conversation.messages) && conversation.messages.length) {
      setMessages(conversation.messages);
    } else {
      setMessages([]);
    }

    const controller = new AbortController();

    async function loadThread() {
      setLoading(true);
      setError("");

      try {
        const detail = await fetchConversation(
          conversation.id,
          controller.signal
        );

        setMessages(Array.isArray(detail?.messages) ? detail.messages : []);
      } catch (loadError) {
        if (isAbortError(loadError)) {
          return;
        }

        setError(loadError?.message || "Unable to load this conversation.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadThread();

    return () => controller.abort();
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="conversation-viewer conversation-viewer--empty">
        <Inbox size={34} />
        <h2>Select a conversation</h2>
        <p>Choose a conversation from the list to view its messages.</p>
      </div>
    );
  }

  const channel = getChannel(conversation);
  const canReply = channel === "mychat";

  async function handleSend(event) {
    event.preventDefault();

    const text = draft.trim();

    if (!text || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const message = await api.post(
        `/api/mychat/conversations/${conversation.id}/messages`,
        { text }
      );

      setMessages((current) => [...current, message]);
      setDraft("");
      onMessageSent?.(conversation.id, message);
    } catch (sendError) {
      setError(sendError?.message || "Unable to send this message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="conversation-viewer">
      <div className="conversation-viewer-header">
        <div className="conversation-viewer-user">
          <div className="conversation-avatar conversation-avatar--large">
            {getItemTitle(conversation).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{getItemTitle(conversation)}</h2>
            <span>{channel || "Conversation"}</span>
          </div>
        </div>
        <div className="conversation-viewer-meta">
          {formatDate(conversation.updatedAtUtc || conversation.createdAtUtc)}
        </div>
      </div>

      {error && (
        <div className="section-error">
          <Activity size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="conversation-messages">
        {loading && messages.length === 0 ? (
          <div className="conversation-no-messages">
            <RefreshCw size={24} className="spin" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="conversation-no-messages">
            <MessageCircle size={26} />
            <span>No messages available yet.</span>
          </div>
        ) : (
          messages.map((message, index) => {
            const senderType = String(message?.senderType || "").toLowerCase();
            const outgoing =
              senderType === "user" ||
              senderType === "agent" ||
              senderType === "admin" ||
              message?.senderId === user?.id;

            return (
              <div
                key={message?.id ?? `${conversation.__id}-${index}`}
                className={[
                  "message-bubble-row",
                  outgoing ? "message-bubble-row--outgoing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="message-bubble">
                  {message?.senderName && (
                    <span className="message-sender">{message.senderName}</span>
                  )}
                  <span>{message?.text || message?.content || ""}</span>
                  {message?.createdAtUtc && (
                    <small>{formatTime(message.createdAtUtc)}</small>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canReply && (
        <form className="conversation-composer" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a reply..."
            aria-label="Message"
            disabled={sending}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={sending || !draft.trim()}
          >
            <Send size={16} />
            Send
          </button>
        </form>
      )}
    </div>
  );
}
