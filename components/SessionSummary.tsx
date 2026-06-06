import type { Session } from "next-auth";
import { SignOutButton } from "./AuthButtons";

type SessionSummaryProps = {
  session: Session;
};

export function SessionSummary({ session }: SessionSummaryProps) {
  return (
    <section className="session-summary" aria-label="Signed-in user">
      <div>
        <span>Signed in as</span>
        <strong>{session.user?.name ?? session.user?.email}</strong>
        {session.user?.email ? <p>{session.user.email}</p> : null}
      </div>
      <SignOutButton />
    </section>
  );
}
