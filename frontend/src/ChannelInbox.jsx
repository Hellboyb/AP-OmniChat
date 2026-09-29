import { useEffect, useState } from "react";
import { api } from "../api";

const CHANNELS = {
  whatsapp: {
    title: "WhatsApp Inbox",
    description: "Messages received through your connected WhatsApp Business account.",
    icon: "W",
  },
  messenger: {
    title: "Messenger Inbox",
    description: "Messages received through your connected Facebook Page.",
    icon: "M",
  },
  instagram: {
    title: "Instagram Inbox",
    description: "Messages received through your connected Instagram Professional account.",
    icon: "I",
  },
};

export default function ChannelInbox({ channel }) {
  const config = CHANNELS[channel];

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      setError("");
      setMessages([]);

      try {
        const result = await api.get(
          `/api/inbox?channel=${encodeURIComponent(channel)}`
        );

        if (cancelled) return;

        const receivedMessages = Array.isArray(result)
          ? result
          : Array.isArray(result?.messages)
            ? result.messages
            : [];

        setMessages(receivedMessages);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Could not load messages. Check the backend connection."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (config) {
      loadMessages();
    }

    return () => {
      cancelled = true;
    };
  }, [channel]);

  if (!config) {
    return (
      <section className="future-view">
        <h2>Unknown channel</h2>
        <p>This inbox channel is not supported.</p>
      </section>
    );
  }

  return (
    <section className="future-view">
      <header>
        <h2>{config.title}</h2>
        <p>{config.description}</p>
      </header>

      {loading && <p>Loading messages…</p>}

      {!loading && error && (
        <div role="alert">
          <p>{error}</p>
          <p>
            The inbox endpoint must be available in the backend before
            messages can be displayed.
          </p>
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div>
          <h3>No messages to display</h3>
          <p>
            No messages were returned by the server. Messages will appear
            here when the backend and channel integration provide them.
          </p>
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <div>
          {messages.map((message) => (
            <article
              key={message.id}
              className="channel-message"
            >
              <h3>{message.senderName || message.senderId || "Contact"}</h3>
              <p>{message.text || message.body || ""}</p>
              {message.createdAt && (
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleString()}
                </time>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
