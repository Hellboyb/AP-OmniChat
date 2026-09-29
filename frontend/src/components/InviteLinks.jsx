import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Link2,
  LoaderCircle,
  Share2,
  X,
} from "lucide-react";
import { api } from "../api";
import "./InviteLink.css";

export default function InviteLink({ conversationId, conversationTitle, onClose }) {
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const createInvite = async () => {
    if (!conversationId || loading) return;

    setLoading(true);
    setError("");
    setInvite("");
    setCopied(false);

    try {
      const result = await api.post(
        `/api/mychat/conversations/${encodeURIComponent(conversationId)}/invites`,
        {},
      );

      const link =
        result?.inviteUrl ??
        result?.url ??
        result?.link ??
        result?.inviteLink;

      if (!link) {
        throw new Error("The server did not return an invite link.");
      }

      setInvite(link);
    } catch (err) {
      setError(err?.message || "Could not create an invite link.");
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!invite) return;

    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
    } catch {
      setError("Could not copy automatically. Select and copy the link.");
    }
  };

  const shareInvite = async () => {
    if (!invite) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${conversationTitle || "my chat"}`,
          text: `Join my conversation on AP OmniChat.`,
          url: invite,
        });
      } catch {
        // The user may close the share sheet without sharing.
      }
    } else {
      await copyInvite();
    }
  };

  return (
    <div className="invite-backdrop" role="presentation">
      <section
        className="invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
      >
        <header className="invite-header">
          <div className="invite-heading">
            <div className="invite-icon">
              <Link2 size={21} />
            </div>
            <div>
              <h2 id="invite-title">Invite to chat</h2>
              <p>{conversationTitle || "Personal conversation"}</p>
            </div>
          </div>

          <button
            type="button"
            className="invite-close"
            onClick={onClose}
            aria-label="Close invite dialog"
          >
            <X size={19} />
          </button>
        </header>

        <div className="invite-body">
          <p className="invite-description">
            Create a shareable invitation link for someone to join this
            conversation.
          </p>

          {!invite && (
            <button
              type="button"
              className="invite-create-button"
              onClick={createInvite}
              disabled={loading || !conversationId}
            >
              {loading ? (
                <LoaderCircle size={18} className="invite-spin" />
              ) : (
                <Link2 size={18} />
              )}
              {loading ? "Creating link…" : "Create invite link"}
            </button>
          )}

          {error && (
            <div className="invite-error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          {invite && (
            <>
              <label className="invite-link-label" htmlFor="invite-link">
                Your invitation link
              </label>

              <input
                id="invite-link"
                className="invite-link-input"
                value={invite}
                readOnly
                onFocus={(event) => event.target.select()}
              />

              <div className="invite-actions">
                <button
                  type="button"
                  className="invite-copy-button"
                  onClick={copyInvite}
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copied" : "Copy link"}
                </button>

                <button
                  type="button"
                  className="invite-share-button"
                  onClick={shareInvite}
                >
                  <Share2 size={17} />
                  Share
                </button>
              </div>

              <p className="invite-hint">
                Only share this link with people you want to invite. Anyone
                who has access to a valid invite may be able to join.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}