import React, { useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  MessageCircle,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "../api";
import "./PeopleSearch.css";

export default function PeopleSearch({ onClose, onConversationCreated }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingUserId, setStartingUserId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const searchUsers = async (event) => {
    event.preventDefault();

    const value = query.trim();

    if (value.length < 3) {
      setError("Enter at least 3 characters to search.");
      setUsers([]);
      return;
    }

    setSearching(true);
    setError("");
    setNotice("");

    try {
      const result = await api.get(
        `/api/users/search?q=${encodeURIComponent(value)}`,
      );

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.users)
          ? result.users
          : Array.isArray(result?.results)
            ? result.results
            : [];

      setUsers(list);
      if (list.length === 0) {
        setNotice("No matching users found.");
      }
    } catch (err) {
      setUsers([]);
      setError(err?.message || "Could not search users.");
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (user) => {
    const userId = user?.id ?? user?.userId;

    if (!userId) {
      setError("This user record does not contain a usable user ID.");
      return;
    }

    setStartingUserId(String(userId));
    setError("");
    setNotice("");

    try {
      const created = await api.post("/api/mychat/conversations", {
        title:
          user?.displayName ||
          user?.username ||
          user?.email ||
          "Personal chat",
      });

      const conversationId =
        created?.id ??
        created?.conversationId ??
        created?.myChatConversationId;

      if (!conversationId) {
        throw new Error("The server did not return a conversation ID.");
      }

      await api.post(
        `/api/mychat/conversations/${encodeURIComponent(conversationId)}/members`,
        { userId: String(userId) },
      );

      const conversation = {
        ...created,
        id: conversationId,
        title:
          user?.displayName ||
          user?.username ||
          user?.email ||
          "Personal chat",
      };

      onConversationCreated?.(conversation);
      onClose?.();
    } catch (err) {
      setError(
        err?.message ||
          "Could not start this conversation. Check the server response.",
      );
    } finally {
      setStartingUserId(null);
    }
  };

  return (
    <div className="people-search-backdrop" role="presentation">
      <section
        className="people-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-search-title"
      >
        <header className="people-search-header">
          <div className="people-search-heading">
            <div className="people-search-heading-icon">
              <UserPlus size={21} />
            </div>
            <div>
              <h2 id="people-search-title">Find people</h2>
              <p>Search by username, display name, or email.</p>
            </div>
          </div>

          <button
            type="button"
            className="people-search-close"
            onClick={onClose}
            aria-label="Close people search"
          >
            <X size={20} />
          </button>
        </header>

        <form className="people-search-form" onSubmit={searchUsers}>
          <div className="people-search-input-wrap">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter name, username, or email"
              aria-label="Search people"
            />
          </div>

          <button type="submit" disabled={searching}>
            {searching ? (
              <LoaderCircle size={17} className="people-search-spin" />
            ) : (
              <Search size={17} />
            )}
            Search
          </button>
        </form>

        {error && (
          <div className="people-search-alert error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {notice && <p className="people-search-notice">{notice}</p>}

        <div className="people-search-results">
          {users.map((user, index) => {
            const userId = user?.id ?? user?.userId ?? index;
            const name =
              user?.displayName ||
              user?.username ||
              user?.email ||
              "User";

            return (
              <article className="people-search-user" key={String(userId)}>
                <div className="people-search-avatar">
                  {String(name)
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() || "")
                    .join("")}
                </div>

                <div className="people-search-user-info">
                  <strong>{name}</strong>
                  {user?.username && user.username !== name && (
                    <span>@{user.username}</span>
                  )}
                  {user?.email && <small>{user.email}</small>}
                </div>

                <button
                  type="button"
                  className="people-search-chat-button"
                  disabled={startingUserId !== null}
                  onClick={() => startConversation(user)}
                >
                  {startingUserId === String(userId) ? (
                    <LoaderCircle size={16} className="people-search-spin" />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  Chat
                </button>
              </article>
            );
          })}
        </div>

        <footer className="people-search-footer">
          Search results depend on the users available to your account.
        </footer>
      </section>
    </div>
  );
}