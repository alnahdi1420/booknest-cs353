"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/providers/store-context";
import { Alert, Spinner } from "@/components/ui";
import { DEMO_PERSONAS, DEMO_USERS } from "@/lib/demo/seed";
import { ROLE_LABELS } from "@/lib/types";

const PERSONA_HOME: Record<string, string> = {
  "demo-customer": "/books",
  "demo-warehouse": "/warehouse",
  "demo-admin": "/admin",
};

export default function LoginPage() {
  const { mode, ready } = useStore();
  if (!ready) return <Spinner />;
  return <div className="container-page py-12">{mode === "demo" ? <DemoLogin /> : <SupabaseLogin />}</div>;
}

/** Demo Mode: explicit persona choice. This is a simulation, not real authentication. */
function DemoLogin() {
  const { user, switchPersona } = useStore();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="inline-block rounded-full bg-accent-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
          Demo Mode · simulated sign-in
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold">Choose a demo persona</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          There are no passwords in Demo Mode. Pick a sample role to see what it can do. This is for classroom
          demonstration only and is <strong>not secure</strong>.
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {DEMO_PERSONAS.map((p) => {
          const profile = DEMO_USERS.find((u) => u.id === p.userId)!;
          const active = user?.id === p.userId;
          return (
            <div key={p.userId} className={`card flex flex-col p-6 ${active ? "border-brand-500 ring-2 ring-brand-100" : ""}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white" aria-hidden>
                {profile.fullName.charAt(0)}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">{ROLE_LABELS[profile.role]}</p>
              <h2 className="font-serif text-xl font-semibold">{profile.fullName}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{p.description}</p>
              <button
                type="button"
                className={active ? "btn-outline mt-5" : "btn-primary mt-5"}
                onClick={() => {
                  switchPersona?.(p.userId);
                  router.push(PERSONA_HOME[p.userId]);
                }}
              >
                {active ? "Continue as this persona" : "Use this persona"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Supabase Mode: real email + password sign-in and sign-up. */
function SupabaseLogin() {
  const { user, signIn, signUp, signOut } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (user) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="font-serif text-2xl font-semibold">You are signed in</h1>
        <p className="mt-2 text-muted">
          {user.fullName} ({ROLE_LABELS[user.role]})
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/books" className="btn-primary">Browse books</Link>
          <button type="button" className="btn-outline" onClick={() => signOut?.()}>Sign out</button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMessage({ ok: false, text: "Enter a valid email address." });
    if (password.length < 8) return setMessage({ ok: false, text: "Password must be at least 8 characters." });
    if (tab === "signup" && fullName.trim().length < 3) return setMessage({ ok: false, text: "Enter your full name." });

    setBusy(true);
    if (tab === "signin") {
      const result = await signIn!(email, password);
      setBusy(false);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/books");
    } else {
      const result = await signUp!(fullName, email, password);
      setBusy(false);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      setMessage({
        ok: true,
        text: result.value.needsConfirmation
          ? "Account created. Please check your email and click the confirmation link, then sign in."
          : "Account created. You are now signed in as a customer.",
      });
      if (!result.value.needsConfirmation) router.push("/books");
    }
  }

  return (
    <div className="card mx-auto max-w-md p-8">
      <h1 className="text-center font-serif text-3xl font-semibold">{tab === "signin" ? "Sign in" : "Create account"}</h1>
      <div className="mt-6 grid grid-cols-2 rounded-full bg-paper p-1 text-sm font-semibold" role="tablist">
        {(["signin", "signup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`rounded-full py-2 ${tab === t ? "bg-white shadow-sm" : "text-muted"}`}
            onClick={() => {
              setTab(t);
              setMessage(null);
            }}
          >
            {t === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {tab === "signup" && (
          <div>
            <label htmlFor="fullName" className="label">Full name</label>
            <input id="fullName" className="input" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {tab === "signup" && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
        </div>
        {message && <Alert tone={message.ok ? "success" : "error"}>{message.text}</Alert>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Please wait..." : tab === "signin" ? "Sign in" : "Create account"}
        </button>
        {tab === "signup" && (
          <p className="text-center text-xs text-muted">New accounts are always created with the Customer role.</p>
        )}
      </form>
    </div>
  );
}
