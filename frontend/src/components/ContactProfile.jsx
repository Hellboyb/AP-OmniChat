import { Mail, Phone, UserRound, X, MessageCircle } from "lucide-react";
import "./ContactProfile.css";

export default function ContactProfile({
  contact,
  onClose,
  onMessage,
}) {
  if (!contact) return null;

  const name =
    contact.displayName ||
    contact.name ||
    contact.username ||
    "Contact";

  const username = contact.username
    ? `@${contact.username}`
    : "";

  const email = contact.email || "";
  const phone = contact.phoneNumber || contact.phone || "";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="contact-profile-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="contact-profile-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} contact profile`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="contact-profile-header">
          <h3>Contact profile</h3>

          <button
            type="button"
            className="contact-profile-close"
            onClick={onClose}
            aria-label="Close contact profile"
          >
            <X size={19} />
          </button>
        </header>

        <div className="contact-profile-identity">
          {contact.avatarUrl || contact.profilePicture ? (
            <img
              className="contact-profile-avatar"
              src={contact.avatarUrl || contact.profilePicture}
              alt={`${name}'s profile`}
            />
          ) : (
            <div className="contact-profile-avatar contact-profile-avatar-fallback">
              {initials || <UserRound size={30} />}
            </div>
          )}

          <h2>{name}</h2>

          {username && (
            <p className="contact-profile-username">{username}</p>
          )}

          {contact.status && (
            <span className="contact-profile-status">
              {contact.status}
            </span>
          )}
        </div>

        <div className="contact-profile-details">
          {email && (
            <div className="contact-profile-detail">
              <span className="contact-profile-detail-icon">
                <Mail size={17} />
              </span>
              <div>
                <small>Email</small>
                <p>{email}</p>
              </div>
            </div>
          )}

          {phone && (
            <div className="contact-profile-detail">
              <span className="contact-profile-detail-icon">
                <Phone size={17} />
              </span>
              <div>
                <small>Phone</small>
                <p>{phone}</p>
              </div>
            </div>
          )}

          {!email && !phone && (
            <p className="contact-profile-no-details">
              No additional contact details are available.
            </p>
          )}
        </div>

        <button
          type="button"
          className="contact-profile-message-button"
          onClick={() => onMessage?.(contact)}
        >
          <MessageCircle size={18} />
          Message
        </button>
      </section>
    </div>
  );
}