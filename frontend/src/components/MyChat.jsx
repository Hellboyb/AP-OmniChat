import { useEffect, useState } from "react";
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  UserRound
} from "lucide-react";

import api from "../api";
import "./MyChat.css";

export default function MyChat() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/api/mychat/users")
      .then((result) => setUsers(result?.users || []))
      .catch(() => setUsers([]));
  }, []);

  async function openChat(user) {
    setSelected(user);

    try {
      const result = await api.get(
        `/api/mychat/messages/${user.id}`
      );

      setMessages(result?.messages || []);
    } catch {
      setMessages([]);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();

    if (!message.trim() || !selected) return;

    const text = message.trim();
    setMessage("");

    try {
      const result = await api.post("/api/mychat/messages", {
        recipientUserId: selected.id,
        text
      });

      if (result?.message) {
        setMessages((current) => [...current, result.message]);
      }
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="mychat-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRIVATE MESSAGING</span>
          <h1>My Chat</h1>
          <p>Real-time conversations inside AP-OmniChat.</p>
        </div>
      </div>

      <div className="mychat-shell">
        <aside className="mychat-users">
          <div className="mychat-search">
            <Search size={17} />
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="new-chat-button">
            <Plus size={17} />
            New conversation
          </button>

          <div className="user-list">
            {users
              .filter((user) =>
                `${user.userName} ${user.email}`
                  .toLowerCase()
                  .includes(search.toLowerCase())
              )
              .map((user) => (
                <button
                  className={`chat-user ${
                    selected?.id === user.id ? "active" : ""
                  }`}
                  key={user.id}
                  onClick={() => openChat(user)}
                >
                  <div className="avatar">
                    {(user.userName || user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>{user.userName}</strong>
                    <span>{user.email}</span>
                  </div>
                </button>
              ))}

            {users.length === 0 && (
              <div className="mychat-empty-small">
                <UserRound size={20} />
                No users found.
              </div>
            )}
          </div>
        </aside>

        <section className="chat-window">
          {!selected ? (
            <div className="chat-placeholder">
              <MessageCircle size={42} />
              <h2>Select a conversation</h2>
              <p>Choose a user to start chatting.</p>
            </div>
          ) : (
            <>
              <header className="chat-header">
                <div className="avatar">
                  {(selected.userName || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>{selected.userName}</strong>
                  <span>{selected.email}</span>
                </div>
              </header>

              <div className="messages">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`message ${
                      item.senderUserId === selected.id
                        ? "received"
                        : "sent"
                    }`}
                  >
                    {item.text}
                  </div>
                ))}
              </div>

              <form className="message-composer" onSubmit={sendMessage}>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a message..."
                />

                <button>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}