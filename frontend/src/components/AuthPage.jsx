import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound
} from "lucide-react";

import api, { setAccessToken } from "../api";
import "./AuthPage.css";

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    userName: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function update(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint =
        mode === "login"
          ? "/api/auth/login"
          : "/api/auth/register";

      const payload =
        mode === "login"
          ? {
              email: form.email,
              password: form.password
            }
          : {
              userName: form.userName,
              email: form.email,
              password: form.password
            };

      const result = await api.post(endpoint, payload);

      if (result?.token) {
        setAccessToken(result.token);
      }

      onAuthenticated(result);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration decoration-one" />
      <div className="auth-decoration decoration-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">AP</div>
          <div>
            <strong>AP-OmniChat</strong>
            <span>AI Communication OS</span>
          </div>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">SECURE ACCESS</span>
          <h1>{mode === "login" ? "Welcome back." : "Create your workspace."}</h1>
          <p>
            {mode === "login"
              ? "Sign in to continue to your communication command center."
              : "Create your account and start building your unified inbox."}
          </p>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              <span>Username</span>
              <div className="input-wrap">
                <UserRound size={17} />
                <input
                  value={form.userName}
                  onChange={(e) => update("userName", e.target.value)}
                  placeholder="Your username"
                  required
                />
              </div>
            </label>
          )}

          <label>
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={17} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="input-wrap">
              <LockKeyhole size={17} />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            onClick={() => {
              setMode((value) =>
                value === "login" ? "register" : "login"
              );
              setError("");
            }}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}