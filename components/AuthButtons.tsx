import { signIn, signOut } from "../lib/auth";

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <button className="auth-button" type="submit">
        Sign in with Google
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button className="auth-button secondary" type="submit">
        Sign out
      </button>
    </form>
  );
}
