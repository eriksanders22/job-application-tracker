"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResult = {
  totalFetched: number;
  savedJobApplicationEmails: number;
  skippedEmails: number;
};

export function SyncGmailButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function syncGmail() {
    setIsSyncing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/gmail/sync", {
        method: "POST"
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Gmail sync failed.");
      }

      const syncResult = result as SyncResult;
      setMessage(
        `Fetched ${syncResult.totalFetched} emails, saved ${syncResult.savedJobApplicationEmails} job application emails, skipped ${syncResult.skippedEmails}.`
      );
      router.refresh();
    } catch (syncError) {
      setError(
        syncError instanceof Error ? syncError.message : "Gmail sync failed."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section className="sync-panel" aria-label="Gmail sync">
      <button
        className="auth-button"
        disabled={isSyncing}
        onClick={syncGmail}
        type="button"
      >
        {isSyncing ? "Syncing Gmail..." : "Sync Gmail"}
      </button>
      {message ? <p className="sync-message">{message}</p> : null}
      {error ? <p className="sync-error">{error}</p> : null}
    </section>
  );
}
