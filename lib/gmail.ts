import { google, gmail_v1 } from "googleapis";

export type GmailMessageSummary = {
  gmailMessageId: string;
  threadId: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  bodyText: string;
  bodyPreview: string;
  receivedAt: Date;
};

type GoogleAccountTokens = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

const gmailSearchQuery =
  'newer_than:90d (application OR interview OR assessment OR "not selected" OR unfortunately OR "next steps" OR "schedule")';

export function createGoogleOAuthClient(account: GoogleAccountTokens) {
  const oauthClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauthClient.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined
  });

  return oauthClient;
}

export function createGmailClient(account: GoogleAccountTokens) {
  return google.gmail({
    version: "v1",
    auth: createGoogleOAuthClient(account)
  });
}

export async function searchRecentJobMessages(gmail: gmail_v1.Gmail) {
  const response = await gmail.users.messages.list({
    userId: "me",
    q: gmailSearchQuery,
    maxResults: 25
  });

  return response.data.messages ?? [];
}

function getHeaderValue(
  message: gmail_v1.Schema$Message,
  headerName: string
) {
  const headers = message.payload?.headers ?? [];
  const header = headers.find(
    (item) => item.name?.toLowerCase() === headerName.toLowerCase()
  );

  return header?.value ?? "";
}

function parseReceivedAt(message: gmail_v1.Schema$Message) {
  if (message.internalDate) {
    return new Date(Number(message.internalDate));
  }

  const dateHeader = getHeaderValue(message, "date");
  const parsedDate = new Date(dateHeader);

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

function decodeBase64Url(data: string) {
  const normalizedData = data.replace(/-/g, "+").replace(/_/g, "/");
  const paddedData =
    normalizedData + "=".repeat((4 - (normalizedData.length % 4)) % 4);

  return Buffer.from(paddedData, "base64").toString("utf8");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getPayloadBodyData(payload: gmail_v1.Schema$MessagePart) {
  return payload.body?.data ? decodeBase64Url(payload.body.data) : "";
}

function collectBodyParts(
  payload: gmail_v1.Schema$MessagePart | undefined,
  plainTextParts: string[],
  htmlParts: string[]
) {
  if (!payload) {
    return;
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      collectBodyParts(part, plainTextParts, htmlParts);
    }
  }

  const bodyData = getPayloadBodyData(payload);

  if (!bodyData) {
    return;
  }

  if (payload.mimeType === "text/plain") {
    plainTextParts.push(bodyData);
    return;
  }

  if (payload.mimeType === "text/html") {
    htmlParts.push(stripHtml(bodyData));
  }
}

export function extractEmailBody(
  payload: gmail_v1.Schema$MessagePart | undefined
) {
  const plainTextParts: string[] = [];
  const htmlParts: string[] = [];

  collectBodyParts(payload, plainTextParts, htmlParts);

  return (plainTextParts.length ? plainTextParts : htmlParts)
    .join("\n\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createBodyPreview(bodyText: string) {
  return bodyText.length > 500 ? `${bodyText.slice(0, 500)}...` : bodyText;
}

export async function fetchMessageSummary(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<GmailMessageSummary> {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
    metadataHeaders: ["From", "Subject", "Date"]
  });
  const message = response.data;
  const bodyText = extractEmailBody(message.payload);

  return {
    gmailMessageId: message.id ?? messageId,
    threadId: message.threadId ?? "",
    fromEmail: getHeaderValue(message, "from"),
    subject: getHeaderValue(message, "subject"),
    snippet: message.snippet ?? "",
    bodyText,
    bodyPreview: createBodyPreview(bodyText),
    receivedAt: parseReceivedAt(message)
  };
}

export async function fetchRecentJobMessageSummaries(
  gmail: gmail_v1.Gmail
) {
  const messages = await searchRecentJobMessages(gmail);

  return Promise.all(
    messages
      .filter((message) => message.id)
      .map((message) => fetchMessageSummary(gmail, message.id as string))
  );
}
