import api from "./api";

export const CHANNELS = [
  { id: "all", label: "All Channels" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "messenger", label: "Messenger" },
  { id: "instagram", label: "Instagram" },
  { id: "mychat", label: "My Chat" },
];

export const INBOX_CHANNELS = [
  "whatsapp",
  "messenger",
  "instagram",
  "mychat",
];

export function isAbortError(error) {
  return error?.name === "AbortError";
}

export function getUserLabel(user) {
  return (
    user?.displayName ||
    user?.userName ||
    user?.username ||
    user?.email ||
    "User"
  );
}

export function safeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.conversations)) {
    return value.conversations;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

export function getChannel(item) {
  return String(
    item?.channel ||
      item?.source ||
      item?.platform ||
      item?.provider ||
      ""
  )
    .trim()
    .toLowerCase();
}

export function getItemId(item, index) {
  return (
    item?.id ??
    item?.conversationId ??
    item?.conversationID ??
    item?.chatId ??
    `${getChannel(item) || "conversation"}-${index}`
  );
}

export function getItemTitle(item) {
  return (
    item?.title ||
    item?.name ||
    item?.customerName ||
    item?.senderName ||
    item?.contactName ||
    "Conversation"
  );
}

export function getItemPreview(item) {
  const lastMessage = item?.lastMessage;

  if (lastMessage && typeof lastMessage === "object") {
    return lastMessage.text || lastMessage.content || "New message";
  }

  if (typeof lastMessage === "string" && lastMessage.trim()) {
    return lastMessage;
  }

  if (Array.isArray(item?.messages) && item.messages.length > 0) {
    const message = item.messages[item.messages.length - 1];

    return message?.text || message?.content || "New message";
  }

  return (
    item?.preview ||
    item?.message ||
    item?.text ||
    "No messages yet"
  );
}

export function getItemTime(item) {
  return (
    item?.updatedAtUtc ||
    item?.updatedAt ||
    item?.createdAtUtc ||
    item?.createdAt ||
    item?.lastMessage?.createdAtUtc ||
    item?.lastMessage?.createdAt ||
    null
  );
}

export function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeConversation(item, index, fallbackChannel = "") {
  const channel = getChannel(item) || fallbackChannel || "conversation";

  return {
    ...item,
    channel,
    __id: `${channel}-${getItemId(item, index)}`,
  };
}

export async function fetchInboxChannel(channel, signal) {
  const response = await api.get(
    `/api/inbox?channel=${encodeURIComponent(channel)}`,
    { signal }
  );

  const fallback = channel === "all" ? "" : channel;

  return safeArray(response).map((item, index) =>
    normalizeConversation(item, index, fallback)
  );
}

export async function fetchInboxSummary(signal) {
  return api.get("/api/inbox/summary", { signal });
}

export async function fetchConversation(conversationId, signal) {
  return api.get(`/api/inbox/${conversationId}`, { signal });
}
