import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/*
  ============================================================
  Backend: Spring Boot @ http://localhost:8080
  ============================================================

  Roles:
    OPERATOR
    SUPERVISOR
    MANAGER

  Backend endpoints used:
    POST /api/auth/login
    GET  /api/reference

    POST /api/entries
    PUT  /api/entries/{id}
    GET  /api/entries
    GET  /api/entries/{id}
    POST /api/entries/{id}/submit
    POST /api/entries/{id}/approve
    POST /api/entries/{id}/return
    GET  /api/entries/{id}/history
    POST /api/entries/sync

    GET /api/export/excel?date=YYYY-MM-DD&shift=A

  No external UI libraries are required.
*/

/* ============================================================
   CONFIG
   ============================================================ */

const API_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

const STORAGE = {
  token: "apexflow_token",
  user: "apexflow_user",
  offlineQueue: "apexflow_offline_queue",
  theme: "apexflow_theme",
};

/* ============================================================
   UTILITIES
   ============================================================ */

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
};

const uid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(Number(value));
};

const formatInteger = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

const getSavedQueue = () =>
  safeJsonParse(localStorage.getItem(STORAGE.offlineQueue) || "[]", []);

const saveQueue = (queue) => {
  localStorage.setItem(STORAGE.offlineQueue, JSON.stringify(queue));
};

const getSavedUser = () =>
  safeJsonParse(localStorage.getItem(STORAGE.user) || "null", null);

const saveUser = (user) => {
  localStorage.setItem(STORAGE.user, JSON.stringify(user));
};

const getToken = () => localStorage.getItem(STORAGE.token);

const clearSession = () => {
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
};

const isNetworkError = (error) =>
  error?.message === "Failed to fetch" ||
  error?.name === "TypeError" ||
  !navigator.onLine;

/* ============================================================
   API CLIENT
   ============================================================ */

async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    responseType = "json",
  } = options;

  const token = getToken();

  const finalHeaders = {
    Accept: responseType === "blob" ? "*/*" : "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body:
      body !== undefined
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
  });

  if (response.status === 401) {
    clearSession();

    window.dispatchEvent(new CustomEvent("apexflow:logout"));

    throw new Error("Your session has expired. Please sign in again.");
  }

  if (response.status === 204) return null;

  if (!response.ok) {
    let message = "Something went wrong.";

    try {
      const data = await response.json();
      message =
        data?.message ||
        data?.error ||
        data?.detail ||
        data?.title ||
        message;
    } catch {
      try {
        message = await response.text();
      } catch {
        // Ignore.
      }
    }

    throw new Error(message || `Request failed (${response.status})`);
  }

  if (responseType === "blob") {
    return response.blob();
  }

  return response.json();
}

/* ============================================================
   ICON SYSTEM
   ============================================================ */

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "icon",
    "aria-hidden": "true",
  };

  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    factory: (
      <>
        <path d="M3 21V9l7 4V9l7 4V7l4 2v12" />
        <path d="M3 21h18" />
        <path d="M7 17h2" />
        <path d="M12 17h2" />
        <path d="M17 17h2" />
      </>
    ),
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5V3h6v1.5" />
        <path d="M8 9h8" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-14.7-3L3 11" />
        <path d="M3 4v7h7" />
        <path d="M4 13a8.1 8.1 0 0 0 14.7 3L21 13" />
        <path d="M21 20v-7h-7" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M3 10h18" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.5v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8.1 15a1.7 1.7 0 0 0-1.5-1H6.4v-2.5h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2H15v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l2.3-7L14 19l2.2-7H21" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    warning: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 7h.01" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    chevron: (
      <>
        <path d="m6 9 6 6 6-6" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    rotate: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
    moon: (
      <>
        <path d="M21 15.5A8.5 8.5 0 1 1 8.5 3 6.7 6.7 0 0 0 21 15.5Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m4.93 19.07 1.41-1.41" />
        <path d="m17.66 6.34 1.41-1.41" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
      </>
    ),
    wifi: (
      <>
        <path d="M5 9.5a11 11 0 0 1 14 0" />
        <path d="M8 13a7 7 0 0 1 8 0" />
        <path d="M11 16.5a2 2 0 0 1 2 0" />
      </>
    ),
    wifiOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M5 9.5a11 11 0 0 1 5-2.4" />
        <path d="M14 7.8a11 11 0 0 1 5 1.7" />
        <path d="M8 13a7 7 0 0 1 4-1.2" />
        <path d="M16 13.5a7 7 0 0 0-1.5-.9" />
        <path d="M11 16.5a2 2 0 0 1 2 0" />
      </>
    ),
    bolt: (
      <>
        <path d="m13 2-9 12h7l-1 8 9-12h-7Z" />
      </>
    ),
    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-9" />
        <path d="M17 6h4v4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3.2 8-8 9-4.8-1-8-4-8-9V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 8 5-8 5-8-5Z" />
        <path d="m4 12 8 5 8-5" />
        <path d="m4 16 8 5 8-5" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" />
      </>
    ),
    document: (
      <>
        <path d="M6 3h8l4 4v14H6Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.info}</svg>;
}

/* ============================================================
   TOAST SYSTEM
   ============================================================ */

function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || "info"}`}>
      <div className="toast-icon">
        <Icon
          name={
            toast.type === "success"
              ? "check"
              : toast.type === "error"
                ? "warning"
                : "info"
          }
          size={18}
        />
      </div>

      <div className="toast-content">
        <strong>{toast.title || "Notice"}</strong>
        <span>{toast.message}</span>
      </div>

      <button className="icon-button toast-close" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({ status, small = false }) {
  const normalized = String(status || "").toUpperCase();

  const config = {
    DRAFT: {
      label: "Draft",
      icon: "edit",
    },
    SUBMITTED: {
      label: "Awaiting review",
      icon: "clock",
    },
    RETURNED: {
      label: "Returned",
      icon: "rotate",
    },
    APPROVED: {
      label: "Approved",
      icon: "check",
    },
  };

  const item = config[normalized] || {
    label: normalized || "Unknown",
    icon: "info",
  };

  return (
    <span className={`status-badge status-${normalized.toLowerCase()} ${small ? "status-small" : ""}`}>
      <Icon name={item.icon} size={small ? 12 : 14} />
      {item.label}
    </span>
  );
}

/* ============================================================
   PROGRESS BAR
   ============================================================ */

function ProgressBar({ value = 0, tone = "lime" }) {
  const numeric = clamp(Number(value || 0), 0, 100);

  return (
    <div className={`progress-track progress-${tone}`}>
      <div
        className="progress-fill"
        style={{ width: `${numeric}%` }}
      />
    </div>
  );
}

/* ============================================================
   METRIC CARD
   ============================================================ */

function MetricCard({
  label,
  value,
  sublabel,
  icon,
  tone = "lime",
  progress,
  compact = false,
}) {
  return (
    <div className={`metric-card metric-${tone} ${compact ? "metric-compact" : ""}`}>
      <div className="metric-top">
        <div className="metric-label">{label}</div>
        <div className="metric-icon">
          <Icon name={icon} size={18} />
        </div>
      </div>

      <div className="metric-value">{value}</div>

      {sublabel && <div className="metric-sub">{sublabel}</div>}

      {typeof progress === "number" && (
        <ProgressBar value={progress} tone={tone} />
      )}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  icon = "clipboard",
  title = "Nothing here yet",
  description = "Once records are available, they will appear here.",
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-art">
        <div className="empty-orbit orbit-one" />
        <div className="empty-orbit orbit-two" />
        <div className="empty-icon">
          <Icon name={icon} size={28} />
        </div>
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      {action}
    </div>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */

function LoginScreen({ onLogin, loading }) {
  const [username, setUsername] = useState("operator1");
  const [password, setPassword] = useState("Operator@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid" />

      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-shell">
        <section className="login-story">
          <div className="brand-lockup">
            <div className="brand-mark">
              <span className="brand-mark-dot" />
              <span className="brand-mark-line line-a" />
              <span className="brand-mark-line line-b" />
              <span className="brand-mark-line line-c" />
            </div>

            <div>
              <div className="brand-name">APEXFLOW</div>
              <div className="brand-caption">PRODUCTION CONTROL</div>
            </div>
          </div>

          <div className="story-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Manufacturing operations platform
            </div>

            <h1>
              Production,
              <span> without the friction.</span>
            </h1>

            <p>
              Capture every production hour, surface the numbers that matter,
              and keep plant-floor decisions moving from entry to approval.
            </p>

            <div className="story-stat-row">
              <div>
                <strong>08</strong>
                <span>hour slots</span>
              </div>

              <div>
                <strong>03</strong>
                <span>shift cycles</span>
              </div>

              <div>
                <strong>100%</strong>
                <span>audit trail</span>
              </div>
            </div>
          </div>

          <div className="login-footer-note">
            <Icon name="shield" size={15} />
            Authenticated workspace • Operations secured
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">
            <div className="mobile-brand">
              <div className="brand-mark">
                <span className="brand-mark-dot" />
                <span className="brand-mark-line line-a" />
                <span className="brand-mark-line line-b" />
                <span className="brand-mark-line line-c" />
              </div>

              <div className="brand-name">APEXFLOW</div>
            </div>

            <div className="login-header">
              <div className="section-kicker">WORKSPACE ACCESS</div>
              <h2>Welcome back.</h2>
              <p>Sign in to continue to Production Control.</p>
            </div>

            <form onSubmit={submit} className="login-form">
              <label className="field">
                <span className="field-label">Username</span>
                <div className="input-shell">
                  <Icon name="user" size={17} />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="operator1"
                    autoComplete="username"
                  />
                </div>
              </label>

              <label className="field">
                <span className="field-label">Password</span>
                <div className="input-shell">
                  <Icon name="shield" size={17} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <Icon name={showPassword ? "eye" : "eye"} size={17} />
                  </button>
                </div>
              </label>

              {error && (
                <div className="form-error">
                  <Icon name="warning" size={17} />
                  <span>{error}</span>
                </div>
              )}

              <button
                className="primary-button login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-dark" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Enter workspace
                    <Icon name="arrow" size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="login-demo">
              <div className="demo-heading">
                <span>Demo accounts</span>
                <span className="demo-line" />
              </div>

              <div className="demo-grid">
                <button
                  onClick={() => {
                    setUsername("operator1");
                    setPassword("Operator@123");
                  }}
                >
                  <span className="demo-avatar demo-op">O</span>
                  <span>
                    <strong>Operator</strong>
                    <small>operator1</small>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setUsername("supervisor1");
                    setPassword("Supervisor@123");
                  }}
                >
                  <span className="demo-avatar demo-sup">S</span>
                  <span>
                    <strong>Supervisor</strong>
                    <small>supervisor1</small>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setUsername("manager1");
                    setPassword("Manager@123");
                  }}
                >
                  <span className="demo-avatar demo-man">M</span>
                  <span>
                    <strong>Manager</strong>
                    <small>manager1</small>
                  </span>
                </button>
              </div>
            </div>

            <div className="login-bottom">
              <span>APEXFLOW TECHNOLOGIES</span>
              <span>v1.0</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */

function Sidebar({
  user,
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  onLogout,
  online,
  pendingCount,
}) {
  const role = user?.role || "OPERATOR";

  const navigation =
    role === "OPERATOR"
      ? [
          { id: "dashboard", label: "Overview", icon: "grid" },
          { id: "entries", label: "My production", icon: "clipboard" },
          { id: "new-entry", label: "New entry", icon: "plus" },
        ]
      : role === "SUPERVISOR"
        ? [
            { id: "dashboard", label: "Overview", icon: "grid" },
            { id: "entries", label: "Production queue", icon: "clipboard" },
            { id: "history", label: "Workflow history", icon: "activity" },
          ]
        : [
            { id: "dashboard", label: "Overview", icon: "grid" },
            { id: "entries", label: "Production data", icon: "clipboard" },
            { id: "history", label: "Workflow history", icon: "activity" },
          ];

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="brand-mark small-mark">
            <span className="brand-mark-dot" />
            <span className="brand-mark-line line-a" />
            <span className="brand-mark-line line-b" />
            <span className="brand-mark-line line-c" />
          </div>

          {!collapsed && (
            <div className="sidebar-brand-text">
              <strong>APEXFLOW</strong>
              <span>CONTROL</span>
            </div>
          )}
        </div>

        <button
          className="sidebar-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-label="Toggle sidebar"
        >
          <Icon name={collapsed ? "menu" : "chevron"} size={17} />
        </button>
      </div>

      <div className="sidebar-workspace">
        {!collapsed && (
          <>
            <span className="sidebar-label">WORKSPACE</span>
            <div className="workspace-switcher">
              <div className="workspace-symbol">
                <Icon name="factory" size={16} />
              </div>
              <div className="workspace-text">
                <strong>Production floor</strong>
                <span>Chennai plant</span>
              </div>
              <Icon name="chevron" size={14} />
            </div>
          </>
        )}
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <span className="sidebar-label">NAVIGATION</span>}

        {navigation.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? "nav-active" : ""}`}
            onClick={() => setActiveView(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={19} />
            </span>

            {!collapsed && <span>{item.label}</span>}

            {!collapsed && item.id === "new-entry" && (
              <span className="nav-new">
                <Icon name="plus" size={11} />
              </span>
            )}
          </button>
        ))}

        {role === "OPERATOR" && pendingCount > 0 && !collapsed && (
          <div className="offline-queue">
            <div className="offline-queue-icon">
              <Icon name="wifiOff" size={16} />
            </div>
            <div>
              <strong>{pendingCount} unsynced</strong>
              <span>Waiting for connection</span>
            </div>
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && (
          <div className={`connection-status ${online ? "is-online" : "is-offline"}`}>
            <span className="connection-dot" />
            <div>
              <strong>{online ? "Connected" : "Offline mode"}</strong>
              <span>{online ? "Backend reachable" : "Local queue active"}</span>
            </div>
          </div>
        )}

        <div className={`user-card ${collapsed ? "user-card-collapsed" : ""}`}>
          <div className={`avatar avatar-${role.toLowerCase()}`}>
            {initials(user?.name || user?.username)}
          </div>

          {!collapsed && (
            <div className="user-card-info">
              <strong>{user?.name || user?.username}</strong>
              <span>{role.toLowerCase()}</span>
            </div>
          )}

          {!collapsed && (
            <button
              className="icon-button user-logout"
              onClick={onLogout}
              title="Sign out"
            >
              <Icon name="logout" size={17} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            className="collapsed-logout"
            onClick={onLogout}
            title="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}

/* ============================================================
   TOPBAR
   ============================================================ */

function Topbar({
  user,
  title,
  subtitle,
  onRefresh,
  refreshing,
  online,
  pendingCount,
  theme,
  toggleTheme,
  onNewEntry,
  canCreate,
}) {
  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <div className="topbar-mobile-mark">
          <div className="brand-mark tiny-mark">
            <span className="brand-mark-dot" />
            <span className="brand-mark-line line-a" />
            <span className="brand-mark-line line-b" />
            <span className="brand-mark-line line-c" />
          </div>
        </div>

        <div>
          <div className="topbar-kicker">
            {greeting}, {user?.name?.split(" ")[0] || "there"}
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="topbar-actions">
        <div className={`live-pill ${online ? "online" : "offline"}`}>
          <span />
          {online ? "Live" : "Offline"}
        </div>

        {pendingCount > 0 && (
          <div className="sync-pill">
            <Icon name="refresh" size={14} />
            {pendingCount} pending
          </div>
        )}

        <button
          className="icon-button topbar-button"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>

        <button
          className={`icon-button topbar-button ${refreshing ? "spinning" : ""}`}
          onClick={onRefresh}
          title="Refresh"
        >
          <Icon name="refresh" size={18} />
        </button>

        {canCreate && (
          <button className="primary-button topbar-create" onClick={onNewEntry}>
            <Icon name="plus" size={17} />
            New production entry
          </button>
        )}
      </div>
    </header>
  );
}

/* ============================================================
   PAGE HEADER
   ============================================================ */

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>

      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

/* ============================================================
   DASHBOARD - OPERATOR
   ============================================================ */

function OperatorDashboard({
  entries,
  user,
  onNewEntry,
  onOpenEntry,
  onSubmit,
  pendingCount,
  online,
  refreshing,
}) {
  const ownEntries = entries || [];

  const draftCount = ownEntries.filter((e) => e.status === "DRAFT").length;
  const submittedCount = ownEntries.filter(
    (e) => e.status === "SUBMITTED"
  ).length;
  const returnedCount = ownEntries.filter(
    (e) => e.status === "RETURNED"
  ).length;
  const approvedCount = ownEntries.filter(
    (e) => e.status === "APPROVED"
  ).length;

  const totalProduced = ownEntries.reduce(
    (sum, entry) => sum + Number(entry.producedQuantity || 0),
    0
  );

  const totalAccepted = ownEntries.reduce(
    (sum, entry) => sum + Number(entry.acceptedQuantity || 0),
    0
  );

  const avgAchievement = ownEntries.length
    ? ownEntries.reduce(
        (sum, entry) => sum + Number(entry.achievementPercentage || 0),
        0
      ) / ownEntries.length
    : 0;

  const recent = ownEntries.slice(0, 5);

  return (
    <div className="dashboard-page">
      <section className="hero-banner">
        <div className="hero-pattern" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot" />
            Operator workspace
          </div>

          <h2>
            Keep the line moving,
            <br />
            <span>hour by hour.</span>
          </h2>

          <p>
            Capture production accurately, stay ahead of exceptions, and keep
            your shift handoffs clean.
          </p>

          <button className="hero-button" onClick={onNewEntry}>
            Start a production entry
            <Icon name="arrow" size={17} />
          </button>
        </div>

        <div className="hero-machine">
          <div className="machine-ring ring-a" />
          <div className="machine-ring ring-b" />
          <div className="machine-core">
            <Icon name="factory" size={56} strokeWidth={1.1} />
          </div>

          <div className="machine-floating mf-one">
            <span>SHIFT</span>
            <strong>A</strong>
          </div>

          <div className="machine-floating mf-two">
            <span>STATUS</span>
            <strong>RUNNING</strong>
          </div>

          <div className="machine-floating mf-three">
            <span>ACCEPTED</span>
            <strong>{formatInteger(totalAccepted)}</strong>
          </div>
        </div>
      </section>

      {!online && (
        <div className="offline-banner">
          <div className="offline-banner-icon">
            <Icon name="wifiOff" size={19} />
          </div>
          <div>
            <strong>You are offline.</strong>
            <span>
              New entries are saved locally and will be synchronized when the
              connection returns.
            </span>
          </div>

          {pendingCount > 0 && (
            <div className="offline-banner-count">
              {pendingCount} waiting
            </div>
          )}
        </div>
      )}

      <div className="metric-grid operator-metrics">
        <MetricCard
          label="Total entries"
          value={ownEntries.length}
          sublabel="All time in workspace"
          icon="clipboard"
          tone="blue"
        />

        <MetricCard
          label="Approved"
          value={approvedCount}
          sublabel={`${formatPercent(ownEntries.length ? (approvedCount / ownEntries.length) * 100 : 0)} of entries`}
          icon="check"
          tone="lime"
          progress={ownEntries.length ? (approvedCount / ownEntries.length) * 100 : 0}
        />

        <MetricCard
          label="Produced"
          value={formatInteger(totalProduced)}
          sublabel="Units captured"
          icon="activity"
          tone="violet"
        />

        <MetricCard
          label="Avg. achievement"
          value={formatPercent(avgAchievement)}
          sublabel="Across recorded entries"
          icon="trend"
          tone="amber"
          progress={avgAchievement}
        />
      </div>

      <div className="dashboard-columns">
        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">RECENT ACTIVITY</div>
              <h3>Your production entries</h3>
            </div>

            <button
              className="text-button"
              onClick={() => onOpenEntry("list")}
            >
              View all
              <Icon name="arrow" size={15} />
            </button>
          </div>

          {refreshing ? (
            <div className="table-loading">
              <span className="spinner" />
              Loading production data...
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="No production entries yet"
              description="Your first production entry will appear here."
              action={
                <button
                  className="secondary-button"
                  onClick={onNewEntry}
                >
                  <Icon name="plus" size={15} />
                  Create first entry
                </button>
              }
            />
          ) : (
            <div className="recent-list">
              {recent.map((entry, index) => (
                <button
                  key={entry.id || entry.clientId || index}
                  className="recent-row"
                  onClick={() => onOpenEntry(entry)}
                >
                  <div className="recent-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="recent-main">
                    <strong>
                      {entry.machine}{" "}
                      <span>•</span> {entry.partNumber}
                    </strong>

                    <span>
                      {formatDate(entry.entryDate)} · Shift {entry.shift} · Hour{" "}
                      {entry.hourSlot}
                    </span>
                  </div>

                  <div className="recent-qty">
                    <span>Accepted</span>
                    <strong>{formatInteger(entry.acceptedQuantity)}</strong>
                  </div>

                  <StatusBadge status={entry.status} small />

                  <Icon name="arrow" size={15} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel status-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">WORKFLOW</div>
              <h3>Entry status</h3>
            </div>

            <div className="panel-status-icon">
              <Icon name="layers" size={17} />
            </div>
          </div>

          <div className="workflow-summary">
            <WorkflowRail
              label="Draft"
              count={draftCount}
              color="neutral"
              detail="Being prepared"
            />

            <WorkflowRail
              label="Submitted"
              count={submittedCount}
              color="blue"
              detail="Waiting for review"
            />

            <WorkflowRail
              label="Returned"
              count={returnedCount}
              color="amber"
              detail="Needs attention"
            />

            <WorkflowRail
              label="Approved"
              count={approvedCount}
              color="lime"
              detail="Complete"
            />
          </div>

          {returnedCount > 0 && (
            <div className="attention-card">
              <div className="attention-icon">
                <Icon name="warning" size={18} />
              </div>

              <div>
                <strong>
                  {returnedCount} {returnedCount === 1 ? "entry needs" : "entries need"} attention
                </strong>
                <span>
                  Review supervisor feedback and resubmit when ready.
                </span>
              </div>
            </div>
          )}

          <div className="shift-summary">
            <span>Workspace</span>
            <strong>
              {online ? "Cloud synchronized" : "Local-first mode"}
            </strong>
          </div>
        </section>
      </div>
    </div>
  );
}

function WorkflowRail({ label, count, color, detail }) {
  return (
    <div className={`workflow-row workflow-${color}`}>
      <div className="workflow-dot" />
      <div className="workflow-copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <b>{count}</b>
    </div>
  );
}

/* ============================================================
   SUPERVISOR / MANAGER DASHBOARD
   ============================================================ */

function ReviewDashboard({
  entries,
  role,
  onReview,
  onExport,
  selectedDate,
  setSelectedDate,
  selectedShift,
  setSelectedShift,
}) {
  const all = entries || [];

  const submitted = all.filter((e) => e.status === "SUBMITTED");
  const approved = all.filter((e) => e.status === "APPROVED");
  const returned = all.filter((e) => e.status === "RETURNED");

  const totalProduced = all.reduce(
    (sum, item) => sum + Number(item.producedQuantity || 0),
    0
  );

  const totalRejected = all.reduce(
    (sum, item) => sum + Number(item.rejectedQuantity || 0),
    0
  );

  const rejectionRate = totalProduced
    ? (totalRejected / totalProduced) * 100
    : 0;

  const approvalRate = all.length
    ? (approved.length / all.length) * 100
    : 0;

  const title = role === "SUPERVISOR"
    ? "Production review"
    : "Production command center";

  const description =
    role === "SUPERVISOR"
      ? "Monitor submitted production and keep the workflow moving."
      : "Read-only operational visibility across production and approvals.";

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={role === "SUPERVISOR" ? "SUPERVISOR WORKSPACE" : "MANAGER WORKSPACE"}
        title={title}
        description={description}
        action={
          role === "MANAGER" ? (
            <button
              className="secondary-button"
              onClick={() => onExport(selectedDate, selectedShift)}
            >
              <Icon name="download" size={16} />
              Export Excel
            </button>
          ) : null
        }
      />

      <div className="review-controls panel">
        <div className="review-control-heading">
          <span className="panel-kicker">EXPORT WINDOW</span>
          <strong>Choose production period</strong>
        </div>

        <label className="compact-field">
          <span>Date</span>
          <div className="input-shell compact-input">
            <Icon name="calendar" size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </label>

        <label className="compact-field">
          <span>Shift</span>
          <div className="input-shell compact-input">
            <Icon name="clock" size={15} />
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
            >
              <option value="A">Shift A · 06:00–14:00</option>
              <option value="B">Shift B · 14:00–22:00</option>
              <option value="C">Shift C · 22:00–06:00</option>
            </select>
          </div>
        </label>

        <div className="review-control-meta">
          <Icon name="database" size={16} />
          <span>{all.length} records visible</span>
        </div>
      </div>

      <div className="metric-grid review-metrics">
        <MetricCard
          label="Awaiting review"
          value={submitted.length}
          sublabel="Submitted entries"
          icon="clock"
          tone="blue"
          compact
        />

        <MetricCard
          label="Approved"
          value={approved.length}
          sublabel={`${formatPercent(approvalRate)} approval share`}
          icon="check"
          tone="lime"
          progress={approvalRate}
          compact
        />

        <MetricCard
          label="Returned"
          value={returned.length}
          sublabel="Needs operator action"
          icon="rotate"
          tone="amber"
          compact
        />

        <MetricCard
          label="Rejection rate"
          value={formatPercent(rejectionRate)}
          sublabel="Across visible production"
          icon="warning"
          tone={rejectionRate > 10 ? "red" : "violet"}
          progress={Math.min(rejectionRate * 5, 100)}
          compact
        />
      </div>

      <div className="review-layout">
        <section className="panel queue-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">LIVE QUEUE</div>
              <h3>
                {role === "SUPERVISOR"
                  ? "Entries requiring attention"
                  : "Latest production"}
              </h3>
            </div>

            <div className="queue-count">
              {role === "SUPERVISOR" ? submitted.length : all.length}
            </div>
          </div>

          <div className="review-list">
            {(role === "SUPERVISOR" ? submitted : all.slice(0, 8)).map(
              (entry) => (
                <button
                  key={entry.id}
                  className="review-list-item"
                  onClick={() => onReview(entry)}
                >
                  <div className="review-item-marker">
                    <span />
                  </div>

                  <div className="review-item-main">
                    <div>
                      <strong>
                        {entry.machine}
                        <span> / </span>
                        {entry.partNumber}
                      </strong>
                      <StatusBadge status={entry.status} small />
                    </div>

                    <span className="review-item-meta">
                      {entry.operatorName || "Operator"} ·{" "}
                      {formatDate(entry.entryDate)} · Shift {entry.shift} · Hour{" "}
                      {entry.hourSlot}
                    </span>
                  </div>

                  <div className="review-item-metric">
                    <span>Achievement</span>
                    <strong>
                      {formatPercent(entry.achievementPercentage)}
                    </strong>
                  </div>

                  <Icon name="arrow" size={15} />
                </button>
              )
            )}

            {((role === "SUPERVISOR" && submitted.length === 0) ||
              (role === "MANAGER" && all.length === 0)) && (
              <EmptyState
                icon="check"
                title={
                  role === "SUPERVISOR"
                    ? "Review queue is clear"
                    : "No production records"
                }
                description={
                  role === "SUPERVISOR"
                    ? "There are no submitted entries waiting for review."
                    : "Production entries will appear once operators record them."
                }
              />
            )}
          </div>
        </section>

        <section className="panel pulse-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">OPERATIONS PULSE</div>
              <h3>Production snapshot</h3>
            </div>
          </div>

          <div className="pulse-chart">
            <div className="pulse-grid-line" />
            <div className="pulse-grid-line" />
            <div className="pulse-grid-line" />
            <div className="pulse-axis-label top">100%</div>
            <div className="pulse-axis-label middle">50%</div>
            <div className="pulse-axis-label bottom">0%</div>

            <div className="pulse-bars">
              {[63, 78, 54, 88, 71, 92, 68, 82, 74, 95].map(
                (height, index) => (
                  <div
                    className="pulse-bar-wrap"
                    key={index}
                    title={`${height}%`}
                  >
                    <div
                      className="pulse-bar"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              )}
            </div>
          </div>

          <div className="pulse-legend">
            <span>
              <i className="legend-dot legend-lime" />
              Achievement
            </span>
            <span>
              <i className="legend-dot legend-dim" />
              Hourly view
            </span>
          </div>

          <div className="pulse-footer">
            <div>
              <span>Total produced</span>
              <strong>{formatInteger(totalProduced)}</strong>
            </div>

            <div>
              <span>Total rejected</span>
              <strong>{formatInteger(totalRejected)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   ENTRY FORM
   ============================================================ */

const EMPTY_FORM = {
  entryDate: today(),
  shift: "A",
  hourSlot: 1,
  machine: "",
  partNumber: "",
  plannedQuantity: "",
  producedQuantity: "",
  rejectedQuantity: "0",
  rejectionReason: "",
  downtimeMinutes: "0",
  downtimeReason: "",
  remarks: "",
  clientId: "",
};

function EntryForm({
  mode = "create",
  initialData,
  reference,
  onCancel,
  onSave,
  saving,
}) {
  const firstInput = useRef(null);

  const normalizedInitial = useMemo(
    () => ({
      ...EMPTY_FORM,
      ...(initialData || {}),
      clientId:
        initialData?.clientId ||
        `web-${uid()}`,
      hourSlot: Number(initialData?.hourSlot || 1),
      plannedQuantity:
        initialData?.plannedQuantity !== undefined
          ? String(initialData.plannedQuantity)
          : "",
      producedQuantity:
        initialData?.producedQuantity !== undefined
          ? String(initialData.producedQuantity)
          : "",
      rejectedQuantity:
        initialData?.rejectedQuantity !== undefined
          ? String(initialData.rejectedQuantity)
          : "0",
      downtimeMinutes:
        initialData?.downtimeMinutes !== undefined
          ? String(initialData.downtimeMinutes)
          : "0",
    }),
    [initialData]
  );

  const [form, setForm] = useState(normalizedInitial);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(true);

  useEffect(() => {
    setForm(normalizedInitial);

    const timer = setTimeout(() => {
      firstInput.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [normalizedInitial]);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const planned = Number(form.plannedQuantity || 0);
  const produced = Number(form.producedQuantity || 0);
  const rejected = Number(form.rejectedQuantity || 0);
  const downtime = Number(form.downtimeMinutes || 0);

  const accepted = Math.max(produced - rejected, 0);
  const rejectionPercent = produced > 0 ? (rejected / produced) * 100 : 0;
  const achievementPercent = planned > 0 ? (accepted / planned) * 100 : 0;
  const runningTime = 60 - clamp(downtime, 0, 60);

  const validate = (forSubmit = false) => {
    const next = {};

    if (!form.entryDate) next.entryDate = "Date is required.";
    if (!form.shift) next.shift = "Shift is required.";
    if (!form.hourSlot) next.hourSlot = "Hour slot is required.";
    if (!form.machine) next.machine = "Select a machine.";
    if (!form.partNumber) next.partNumber = "Select a part number.";

    if (form.plannedQuantity === "") {
      next.plannedQuantity = "Planned quantity is required.";
    }

    if (form.producedQuantity === "") {
      next.producedQuantity = "Produced quantity is required.";
    }

    if (planned < 0) {
      next.plannedQuantity = "Quantity cannot be negative.";
    }

    if (produced < 0) {
      next.producedQuantity = "Quantity cannot be negative.";
    }

    if (rejected < 0) {
      next.rejectedQuantity = "Quantity cannot be negative.";
    }

    if (rejected > produced) {
      next.rejectedQuantity =
        "Rejected quantity cannot exceed produced quantity.";
    }

    if (downtime < 0 || downtime > 60) {
      next.downtimeMinutes =
        "Downtime must be between 0 and 60 minutes.";
    }

    if (rejected > 0 && !form.rejectionReason) {
      next.rejectionReason =
        "A rejection reason is required when rejected quantity is greater than 0.";
    }

    if (downtime > 0 && !form.downtimeReason.trim()) {
      next.downtimeReason =
        "A downtime reason is required when downtime is greater than 0.";
    }

    if (forSubmit && rejectionPercent > 10 && !form.remarks.trim()) {
      next.remarks =
        "A remark is required because rejection is above 10%.";
    }

    setErrors(next);

    const firstError = Object.keys(next)[0];

    if (firstError) {
      requestAnimationFrame(() => {
        const element = document.querySelector(
          `[data-field="${firstError}"]`
        );

        element?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate(mode === "submit")) return;

    const payload = {
      entryDate: form.entryDate,
      shift: form.shift,
      hourSlot: Number(form.hourSlot),
      machine: form.machine,
      partNumber: form.partNumber,
      plannedQuantity: Number(form.plannedQuantity || 0),
      producedQuantity: Number(form.producedQuantity || 0),
      rejectedQuantity: Number(form.rejectedQuantity || 0),
      rejectionReason: form.rejectionReason || null,
      downtimeMinutes: Number(form.downtimeMinutes || 0),
      downtimeReason: form.downtimeReason || null,
      remarks: form.remarks || "",
      clientId: form.clientId,
    };

    await onSave(payload, mode);
  };

  const machineOptions = reference?.machines || [];
  const partOptions = reference?.parts || [];
  const rejectionReasons = reference?.rejectionReasons || [];
  const hourSlots =
    reference?.hourSlots?.length > 0
      ? reference.hourSlots
      : [1, 2, 3, 4, 5, 6, 7, 8];

  const shiftMeta = {
    A: "06:00 — 14:00",
    B: "14:00 — 22:00",
    C: "22:00 — 06:00",
  };

  return (
    <div className="entry-editor">
      <div className="editor-top">
        <div>
          <div className="page-eyebrow">
            {mode === "edit" ? "EDIT PRODUCTION" : "NEW PRODUCTION"}
          </div>

          <h2>
            {mode === "edit"
              ? "Refine the record."
              : "Capture the hour."}
          </h2>

          <p>
            Every production entry becomes part of the plant’s operational
            record.
          </p>
        </div>

        <div className="editor-client-badge">
          <span>Entry ID</span>
          <strong>{form.clientId.slice(-12)}</strong>
        </div>
      </div>

      <div className="editor-grid">
        <section className="editor-main">
          <div className="editor-section panel">
            <div className="editor-section-heading">
              <div className="editor-number">01</div>
              <div>
                <span className="panel-kicker">PRODUCTION CONTEXT</span>
                <h3>Where and when</h3>
              </div>
            </div>

            <div className="form-grid form-grid-four">
              <Field
                label="Production date"
                required
                error={errors.entryDate}
                dataField="entryDate"
              >
                <div className="input-shell">
                  <Icon name="calendar" size={16} />
                  <input
                    type="date"
                    value={form.entryDate}
                    onChange={(e) => update("entryDate", e.target.value)}
                  />
                </div>
              </Field>

              <Field
                label="Shift"
                required
                error={errors.shift}
                dataField="shift"
              >
                <div className="shift-selector">
                  {["A", "B", "C"].map((shift) => (
                    <button
                      type="button"
                      key={shift}
                      className={
                        form.shift === shift ? "shift-active" : ""
                      }
                      onClick={() => update("shift", shift)}
                    >
                      <strong>{shift}</strong>
                      <span>{shiftMeta[shift]}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="Hour slot"
                required
                error={errors.hourSlot}
                dataField="hourSlot"
              >
                <div className="input-shell">
                  <Icon name="clock" size={16} />
                  <select
                    value={form.hourSlot}
                    onChange={(e) =>
                      update("hourSlot", Number(e.target.value))
                    }
                  >
                    {hourSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        Hour {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field
                label="Machine"
                required
                error={errors.machine}
                dataField="machine"
              >
                <div className="input-shell">
                  <Icon name="factory" size={16} />
                  <select
                    value={form.machine}
                    onChange={(e) => update("machine", e.target.value)}
                  >
                    <option value="">Select machine</option>

                    {machineOptions.map((machine) => (
                      <option key={machine} value={machine}>
                        {machine}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field
                label="Part number"
                required
                error={errors.partNumber}
                dataField="partNumber"
                className="field-span-2"
              >
                <div className="input-shell">
                  <Icon name="layers" size={16} />
                  <select
                    value={form.partNumber}
                    onChange={(e) =>
                      update("partNumber", e.target.value)
                    }
                  >
                    <option value="">Select part number</option>

                    {partOptions.map((part) => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </div>

          <div className="editor-section panel">
            <div className="editor-section-heading">
              <div className="editor-number">02</div>
              <div>
                <span className="panel-kicker">PRODUCTION COUNTS</span>
                <h3>What happened this hour?</h3>
              </div>
            </div>

            <div className="form-grid form-grid-three">
              <Field
                label="Planned quantity"
                required
                error={errors.plannedQuantity}
                dataField="plannedQuantity"
              >
                <QuantityInput
                  value={form.plannedQuantity}
                  onChange={(value) => update("plannedQuantity", value)}
                  placeholder="0"
                  inputRef={firstInput}
                />
              </Field>

              <Field
                label="Produced quantity"
                required
                error={errors.producedQuantity}
                dataField="producedQuantity"
              >
                <QuantityInput
                  value={form.producedQuantity}
                  onChange={(value) => update("producedQuantity", value)}
                  placeholder="0"
                />
              </Field>

              <Field
                label="Rejected quantity"
                error={errors.rejectedQuantity}
                dataField="rejectedQuantity"
              >
                <QuantityInput
                  value={form.rejectedQuantity}
                  onChange={(value) => update("rejectedQuantity", value)}
                  placeholder="0"
                />
              </Field>
            </div>

            <div className="calculation-strip">
              <CalculationTile
                label="Accepted"
                value={formatInteger(accepted)}
                detail="Produced − rejected"
                tone="lime"
              />

              <CalculationTile
                label="Rejection"
                value={formatPercent(rejectionPercent)}
                detail="Quality signal"
                tone={rejectionPercent > 10 ? "red" : "blue"}
              />

              <CalculationTile
                label="Achievement"
                value={formatPercent(achievementPercent)}
                detail="Against plan"
                tone="violet"
              />

              <CalculationTile
                label="Running time"
                value={`${runningTime} min`}
                detail="60 − downtime"
                tone="amber"
              />
            </div>

            {rejectionPercent > 10 && (
              <div className="inline-warning">
                <Icon name="warning" size={17} />
                <div>
                  <strong>High rejection detected</strong>
                  <span>
                    Rejection is above 10%. A remark will be required before
                    submission.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="editor-section panel">
            <div className="editor-section-heading">
              <div className="editor-number">03</div>
              <div>
                <span className="panel-kicker">QUALITY & DOWNTIME</span>
                <h3>Exceptions and context</h3>
              </div>

              <button
                type="button"
                className="ghost-button editor-toggle"
                onClick={() => setShowAdvanced((value) => !value)}
              >
                {showAdvanced ? "Collapse" : "Expand"}
                <Icon
                  name="chevron"
                  size={15}
                />
              </button>
            </div>

            {showAdvanced && (
              <div className="advanced-form">
                <div className="form-grid form-grid-two">
                  <Field
                    label="Rejection reason"
                    error={errors.rejectionReason}
                    dataField="rejectionReason"
                    help={
                      rejected > 0
                        ? "Required when rejected quantity is greater than 0."
                        : "Optional when there are no rejected units."
                    }
                  >
                    <div className="input-shell">
                      <Icon name="warning" size={16} />
                      <select
                        value={form.rejectionReason}
                        onChange={(e) =>
                          update("rejectionReason", e.target.value)
                        }
                      >
                        <option value="">No rejection / select reason</option>

                        {rejectionReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>

                  <Field
                    label="Downtime minutes"
                    error={errors.downtimeMinutes}
                    dataField="downtimeMinutes"
                    help="Maximum 60 minutes for a single hour slot."
                  >
                    <QuantityInput
                      value={form.downtimeMinutes}
                      onChange={(value) =>
                        update("downtimeMinutes", value)
                      }
                      max={60}
                    />
                  </Field>

                  <Field
                    label="Downtime reason"
                    error={errors.downtimeReason}
                    dataField="downtimeReason"
                    help={
                      downtime > 0
                        ? "Required when downtime is greater than 0."
                        : "Optional when downtime is zero."
                    }
                  >
                    <div className="input-shell">
                      <Icon name="clock" size={16} />
                      <input
                        value={form.downtimeReason}
                        onChange={(e) =>
                          update("downtimeReason", e.target.value)
                        }
                        placeholder="e.g. Tool replacement"
                      />
                    </div>
                  </Field>

                  <Field
                    label="Remarks"
                    error={errors.remarks}
                    dataField="remarks"
                    help={
                      rejectionPercent > 10
                        ? "Required because rejection is above 10%."
                        : "Add any context useful to a reviewer."
                    }
                  >
                    <div className="input-shell textarea-shell">
                      <textarea
                        rows={3}
                        value={form.remarks}
                        onChange={(e) =>
                          update("remarks", e.target.value)
                        }
                        placeholder="Describe anything the next person should know..."
                      />
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="editor-sidebar">
          <div className="preview-card panel">
            <div className="preview-header">
              <div>
                <span className="panel-kicker">LIVE PREVIEW</span>
                <h3>Production snapshot</h3>
              </div>

              <span className="live-dot">
                <i />
                Live
              </span>
            </div>

            <div className="preview-machine">
              <div className="preview-machine-symbol">
                <Icon name="factory" size={25} />
              </div>

              <div>
                <strong>{form.machine || "No machine selected"}</strong>
                <span>
                  {form.partNumber || "Part number pending"}
                </span>
              </div>
            </div>

            <div className="preview-meta-grid">
              <div>
                <span>Date</span>
                <strong>{formatDate(form.entryDate)}</strong>
              </div>

              <div>
                <span>Shift</span>
                <strong>
                  {form.shift} · Hour {form.hourSlot}
                </strong>
              </div>
            </div>

            <div className="preview-divider" />

            <PreviewMetric
              label="Achievement"
              value={formatPercent(achievementPercent)}
              progress={achievementPercent}
              tone="lime"
            />

            <PreviewMetric
              label="Quality"
              value={formatPercent(100 - rejectionPercent)}
              progress={Math.max(100 - rejectionPercent, 0)}
              tone={rejectionPercent > 10 ? "red" : "blue"}
            />

            <PreviewMetric
              label="Running"
              value={`${runningTime} min`}
              progress={(runningTime / 60) * 100}
              tone="amber"
            />

            <div className="preview-status">
              <div className="preview-status-icon">
                <Icon name="shield" size={17} />
              </div>

              <div>
                <strong>
                  {mode === "edit"
                    ? "Changes stay in your workflow"
                    : "Ready for validation"}
                </strong>
                <span>
                  All required rules are checked before submission.
                </span>
              </div>
            </div>
          </div>

          <div className="editor-actions panel">
            <div className="save-note">
              <Icon name="database" size={16} />
              <span>
                {navigator.onLine
                  ? "Connected to production server"
                  : "Offline — will save locally"}
              </span>
            </div>

            <button
              type="button"
              className="primary-button full-button"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner spinner-dark" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="check" size={17} />
                  Save as draft
                </>
              )}
            </button>

            <button
              type="button"
              className="secondary-button full-button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  help,
  children,
  dataField,
  className = "",
}) {
  return (
    <label
      className={`field ${className}`}
      data-field={dataField}
    >
      <span className="field-label">
        {label}
        {required && <b>*</b>}
      </span>

      {children}

      {error && (
        <span className="field-error">
          <Icon name="warning" size={13} />
          {error}
        </span>
      )}

      {!error && help && <span className="field-help">{help}</span>}
    </label>
  );
}

function QuantityInput({
  value,
  onChange,
  placeholder = "0",
  max,
  inputRef,
}) {
  return (
    <div className="input-shell quantity-input">
      <span className="quantity-prefix">#</span>
      <input
        ref={inputRef}
        type="number"
        min="0"
        max={max}
        step="1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const value = e.target.value;

          if (value === "") {
            onChange("");
            return;
          }

          const numeric = Number(value);

          if (!Number.isFinite(numeric)) return;

          onChange(
            max !== undefined
              ? String(clamp(Math.floor(numeric), 0, max))
              : String(Math.max(Math.floor(numeric), 0))
          );
        }}
      />
      <span className="quantity-unit">units</span>
    </div>
  );
}

function CalculationTile({ label, value, detail, tone }) {
  return (
    <div className={`calc-tile calc-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PreviewMetric({ label, value, progress, tone }) {
  return (
    <div className="preview-metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <ProgressBar value={progress} tone={tone} />
    </div>
  );
}

/* ============================================================
   ENTRY LIST
   ============================================================ */

function EntriesTable({
  entries,
  role,
  onOpen,
  onEdit,
  onSubmit,
  onApprove,
  onReturn,
  onHistory,
  onNewEntry,
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [shift, setShift] = useState("ALL");

  const filtered = useMemo(() => {
    return (entries || []).filter((entry) => {
      const q = query.toLowerCase().trim();

      const matchesSearch =
        !q ||
        String(entry.machine || "").toLowerCase().includes(q) ||
        String(entry.partNumber || "").toLowerCase().includes(q) ||
        String(entry.operatorName || "").toLowerCase().includes(q) ||
        String(entry.entryDate || "").toLowerCase().includes(q);

      const matchesStatus =
        status === "ALL" || entry.status === status;

      const matchesShift =
        shift === "ALL" || entry.shift === shift;

      return matchesSearch && matchesStatus && matchesShift;
    });
  }, [entries, query, status, shift]);

  return (
    <div className="entries-page">
      <PageHeader
        eyebrow={
          role === "OPERATOR"
            ? "OPERATOR RECORDS"
            : role === "SUPERVISOR"
              ? "REVIEW QUEUE"
              : "READ-ONLY PRODUCTION"
        }
        title={
          role === "OPERATOR"
            ? "My production"
            : role === "SUPERVISOR"
              ? "Production queue"
              : "Production data"
        }
        description={
          role === "OPERATOR"
            ? "Every hour captured by you, with complete workflow visibility."
            : role === "SUPERVISOR"
              ? "Review submitted records and resolve workflow exceptions."
              : "Operational production data with read-only access."
        }
        action={
          role === "OPERATOR" ? (
            <button className="primary-button" onClick={onNewEntry}>
              <Icon name="plus" size={16} />
              New entry
            </button>
          ) : null
        }
      />

      <section className="table-panel panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Icon name="search" size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search machine, part, operator..."
            />
          </div>

          <div className="toolbar-select">
            <Icon name="filter" size={15} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RETURNED">Returned</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>

          <div className="toolbar-select">
            <Icon name="clock" size={15} />
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="ALL">All shifts</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
            </select>
          </div>

          <div className="result-count">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={query || status !== "ALL" || shift !== "ALL" ? "search" : "clipboard"}
            title={
              query || status !== "ALL" || shift !== "ALL"
                ? "Nothing matches those filters"
                : "No production entries"
            }
            description={
              query || status !== "ALL" || shift !== "ALL"
                ? "Try widening your search or clearing one of the filters."
                : "Production records will appear here once they are created."
            }
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Production</th>
                  <th>Operator</th>
                  <th>Schedule</th>
                  <th>Output</th>
                  <th>Achievement</th>
                  <th>Status</th>
                  <th className="actions-th">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((entry) => {
                  const canEdit =
                    role === "OPERATOR" &&
                    (entry.status === "DRAFT" ||
                      entry.status === "RETURNED");

                  const canSubmit =
                    role === "OPERATOR" &&
                    (entry.status === "DRAFT" ||
                      entry.status === "RETURNED");

                  return (
                    <tr key={entry.id || entry.clientId}>
                      <td>
                        <button
                          className="table-primary"
                          onClick={() => onOpen(entry)}
                        >
                          <strong>
                            {entry.machine}
                            <span> / </span>
                            {entry.partNumber}
                          </strong>
                          <span>
                            #{entry.id} · Accepted{" "}
                            {formatInteger(entry.acceptedQuantity)}
                          </span>
                        </button>
                      </td>

                      <td>
                        <div className="table-person">
                          <span className="mini-avatar">
                            {initials(entry.operatorName)}
                          </span>
                          <span>
                            {entry.operatorName || "Unknown"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="table-schedule">
                          <strong>{formatDate(entry.entryDate)}</strong>
                          <span>
                            Shift {entry.shift} · Hour {entry.hourSlot}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="table-output">
                          <strong>
                            {formatInteger(entry.producedQuantity)}
                          </strong>
                          <span>
                            {formatInteger(entry.rejectedQuantity)} rejected
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="achievement-cell">
                          <strong>
                            {formatPercent(entry.achievementPercentage)}
                          </strong>
                          <ProgressBar
                            value={entry.achievementPercentage}
                            tone="lime"
                          />
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={entry.status} />
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            className="table-action"
                            onClick={() => onOpen(entry)}
                            title="View"
                          >
                            <Icon name="eye" size={15} />
                          </button>

                          {canEdit && (
                            <button
                              className="table-action"
                              onClick={() => onEdit(entry)}
                              title="Edit"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                          )}

                          {canSubmit && (
                            <button
                              className="table-action action-submit"
                              onClick={() => onSubmit(entry)}
                              title="Submit"
                            >
                              <Icon name="send" size={15} />
                            </button>
                          )}

                          {role === "SUPERVISOR" &&
                            entry.status === "SUBMITTED" && (
                              <>
                                <button
                                  className="table-action action-approve"
                                  onClick={() => onApprove(entry)}
                                  title="Approve"
                                >
                                  <Icon name="check" size={15} />
                                </button>

                                <button
                                  className="table-action action-return"
                                  onClick={() => onReturn(entry)}
                                  title="Return"
                                >
                                  <Icon name="rotate" size={15} />
                                </button>
                              </>
                            )}

                          {(role === "SUPERVISOR" || role === "MANAGER") && (
                            <button
                              className="table-action"
                              onClick={() => onHistory(entry)}
                              title="View workflow history"
                            >
                              <Icon name="activity" size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   ENTRY DETAIL
   ============================================================ */

function EntryDetail({
  entry,
  role,
  onBack,
  onEdit,
  onSubmit,
  onApprove,
  onReturn,
  onHistory,
}) {
  if (!entry) return null;

  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <Icon name="arrow" size={15} />
        Back to records
      </button>

      <div className="detail-header">
        <div>
          <div className="page-eyebrow">
            PRODUCTION ENTRY #{entry.id}
          </div>

          <div className="detail-title-row">
            <h2>
              {entry.machine} <span>/</span> {entry.partNumber}
            </h2>
            <StatusBadge status={entry.status} />
          </div>

          <p>
            {formatDate(entry.entryDate)} · Shift {entry.shift} · Hour{" "}
            {entry.hourSlot} · {entry.operatorName}
          </p>
        </div>

        <div className="detail-actions">
          {role === "OPERATOR" &&
            (entry.status === "DRAFT" || entry.status === "RETURNED") && (
              <>
                <button
                  className="secondary-button"
                  onClick={() => onEdit(entry)}
                >
                  <Icon name="edit" size={16} />
                  Edit
                </button>

                <button
                  className="primary-button"
                  onClick={() => onSubmit(entry)}
                >
                  <Icon name="send" size={16} />
                  Submit
                </button>
              </>
            )}

          {role === "SUPERVISOR" && entry.status === "SUBMITTED" && (
            <>
              <button
                className="secondary-button"
                onClick={() => onReturn(entry)}
              >
                <Icon name="rotate" size={16} />
                Return
              </button>

              <button
                className="primary-button"
                onClick={() => onApprove(entry)}
              >
                <Icon name="check" size={16} />
                Approve
              </button>
            </>
          )}

          {(role === "SUPERVISOR" || role === "MANAGER") && (
            <button
              className="icon-button topbar-button"
              onClick={() => onHistory(entry)}
              title="Workflow history"
            >
              <Icon name="activity" size={18} />
            </button>
          )}
        </div>
      </div>

      {entry.status === "RETURNED" && entry.latestWorkflowRemark && (
        <div className="returned-banner">
          <div className="returned-icon">
            <Icon name="rotate" size={18} />
          </div>

          <div>
            <span>Supervisor feedback</span>
            <strong>{entry.latestWorkflowRemark}</strong>
          </div>

          <small>
            {entry.latestChangedBy} · {formatDateTime(entry.latestChangedAt)}
          </small>
        </div>
      )}

      <div className="detail-grid">
        <section className="panel detail-main-card">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">PRODUCTION RESULT</div>
              <h3>Hour summary</h3>
            </div>

            <div className="detail-machine-label">
              <Icon name="factory" size={17} />
              {entry.machine}
            </div>
          </div>

          <div className="detail-big-metrics">
            <DetailMetric
              label="Planned"
              value={formatInteger(entry.plannedQuantity)}
              unit="units"
              tone="blue"
            />

            <DetailMetric
              label="Produced"
              value={formatInteger(entry.producedQuantity)}
              unit="units"
              tone="violet"
            />

            <DetailMetric
              label="Accepted"
              value={formatInteger(entry.acceptedQuantity)}
              unit="units"
              tone="lime"
            />

            <DetailMetric
              label="Rejected"
              value={formatInteger(entry.rejectedQuantity)}
              unit="units"
              tone="red"
            />
          </div>

          <div className="detail-progress-row">
            <div>
              <span>Achievement</span>
              <strong>{formatPercent(entry.achievementPercentage)}</strong>
            </div>

            <div className="detail-progress">
              <ProgressBar
                value={entry.achievementPercentage}
                tone="lime"
              />
            </div>
          </div>

          <div className="detail-progress-row">
            <div>
              <span>Quality yield</span>
              <strong>
                {formatPercent(
                  Math.max(100 - Number(entry.rejectionPercentage || 0), 0)
                )}
              </strong>
            </div>

            <div className="detail-progress">
              <ProgressBar
                value={Math.max(
                  100 - Number(entry.rejectionPercentage || 0),
                  0
                )}
                tone="blue"
              />
            </div>
          </div>
        </section>

        <section className="panel detail-context-card">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">CONTEXT</div>
              <h3>Shift information</h3>
            </div>
          </div>

          <DetailLine
            label="Production date"
            value={formatDate(entry.entryDate)}
            icon="calendar"
          />

          <DetailLine
            label="Shift"
            value={`${entry.shift} · ${shiftHours(entry.shift)}`}
            icon="clock"
          />

          <DetailLine
            label="Hour slot"
            value={`Hour ${entry.hourSlot}`}
            icon="activity"
          />

          <DetailLine
            label="Machine"
            value={entry.machine}
            icon="factory"
          />

          <DetailLine
            label="Part number"
            value={entry.partNumber}
            icon="layers"
          />

          <DetailLine
            label="Operator"
            value={entry.operatorName}
            icon="user"
          />
        </section>

        <section className="panel detail-quality-card">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">QUALITY & DOWNTIME</div>
              <h3>Exceptions</h3>
            </div>
          </div>

          <div className="exception-grid">
            <ExceptionCard
              label="Rejection"
              value={formatPercent(entry.rejectionPercentage)}
              detail={
                entry.rejectionReason || "No rejection reason recorded"
              }
              tone={
                Number(entry.rejectionPercentage || 0) > 10
                  ? "red"
                  : "blue"
              }
              icon="warning"
            />

            <ExceptionCard
              label="Downtime"
              value={`${entry.downtimeMinutes || 0} min`}
              detail={entry.downtimeReason || "No downtime"}
              tone={entry.downtimeMinutes > 0 ? "amber" : "lime"}
              icon="clock"
            />
          </div>
        </section>

        <section className="panel detail-remarks-card">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">OPERATOR NOTES</div>
              <h3>Remarks</h3>
            </div>
          </div>

          <div className="remarks-box">
            {entry.remarks ? (
              <p>{entry.remarks}</p>
            ) : (
              <span>No remarks were added to this entry.</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DetailMetric({ label, value, unit, tone }) {
  return (
    <div className={`detail-metric detail-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}

function DetailLine({ icon, label, value }) {
  return (
    <div className="detail-line">
      <div className="detail-line-icon">
        <Icon name={icon} size={16} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value || "—"}</strong>
      </div>
    </div>
  );
}

function ExceptionCard({ icon, label, value, detail, tone }) {
  return (
    <div className={`exception-card exception-${tone}`}>
      <div className="exception-card-top">
        <div className="exception-card-icon">
          <Icon name={icon} size={17} />
        </div>

        <span>{label}</span>
      </div>

      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function shiftHours(shift) {
  return {
    A: "06:00–14:00",
    B: "14:00–22:00",
    C: "22:00–06:00",
  }[shift] || "—";
}

/* ============================================================
   HISTORY DRAWER
   ============================================================ */

function HistoryDrawer({ entry, history, loading, onClose }) {
  if (!entry) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="history-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="panel-kicker">AUDIT TRAIL</span>
            <h3>Workflow history</h3>
            <p>Entry #{entry.id}</p>
          </div>

          <button className="icon-button" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="drawer-summary">
          <div className="drawer-summary-icon">
            <Icon name="activity" size={19} />
          </div>
          <div>
            <strong>
              {entry.machine} / {entry.partNumber}
            </strong>
            <span>
              {formatDate(entry.entryDate)} · Shift {entry.shift}
            </span>
          </div>
        </div>

        <div className="timeline">
          {loading ? (
            <div className="drawer-loading">
              <span className="spinner" />
              Loading audit trail...
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon="activity"
              title="No history found"
              description="Workflow changes will appear here."
            />
          ) : (
            history.map((item, index) => (
              <div className="timeline-item" key={item.id || index}>
                <div className="timeline-marker">
                  <span />
                </div>

                <div className="timeline-content">
                  <div className="timeline-top">
                    <StatusTransition
                      from={item.fromStatus}
                      to={item.toStatus}
                    />

                    <span>{formatDateTime(item.changedAt)}</span>
                  </div>

                  <div className="timeline-person">
                    <span className="mini-avatar">
                      {initials(item.changedBy)}
                    </span>

                    <span>
                      <strong>{item.changedBy}</strong>
                      <small>Workflow action</small>
                    </span>
                  </div>

                  {item.remark && (
                    <div className="timeline-remark">
                      <Icon name="message" size={14} />
                      {item.remark}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function StatusTransition({ from, to }) {
  return (
    <div className="status-transition">
      <span>{from || "Created"}</span>
      <Icon name="arrow" size={13} />
      <strong>{to}</strong>
    </div>
  );
}

/* ============================================================
   RETURN MODAL
   ============================================================ */

function ReturnModal({ entry, onClose, onSubmit, loading }) {
  const [remark, setRemark] = useState("");

  if (!entry) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-icon modal-warning">
          <Icon name="rotate" size={22} />
        </div>

        <div className="modal-header">
          <span className="panel-kicker">RETURN FOR REVISION</span>
          <h3>What should the operator review?</h3>
          <p>
            Entry #{entry.id} for {entry.machine} / {entry.partNumber} will be
            returned to the operator.
          </p>
        </div>

        <label className="field modal-field">
          <span className="field-label">
            Supervisor remark <b>*</b>
          </span>

          <div className="input-shell textarea-shell">
            <textarea
              autoFocus
              rows={5}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Explain what should be corrected before resubmission..."
            />
          </div>
        </label>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="primary-button button-amber"
            onClick={() => onSubmit(remark)}
            disabled={!remark.trim() || loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner-dark" />
                Returning...
              </>
            ) : (
              <>
                <Icon name="rotate" size={16} />
                Return entry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GENERIC CONFIRM MODAL
   ============================================================ */

function ConfirmModal({
  title,
  description,
  confirmLabel,
  tone = "primary",
  icon = "check",
  onClose,
  onConfirm,
  loading,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card confirm-card">
        <div className={`modal-icon modal-${tone}`}>
          <Icon name={icon} size={22} />
        </div>

        <div className="modal-header">
          <span className="panel-kicker">CONFIRM ACTION</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className={`primary-button ${tone === "amber" ? "button-amber" : ""}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner-dark" />
                Processing...
              </>
            ) : (
              <>
                <Icon name={icon} size={16} />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   OFFLINE QUEUE DRAWER
   ============================================================ */

function OfflineQueueDrawer({ queue, onClose, onRetry }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="history-drawer offline-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="panel-kicker">LOCAL-FIRST QUEUE</span>
            <h3>Unsynced entries</h3>
            <p>{queue.length} waiting to synchronize</p>
          </div>

          <button className="icon-button" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {queue.length === 0 ? (
          <EmptyState
            icon="check"
            title="Everything is synchronized"
            description="There are no local records waiting to be uploaded."
          />
        ) : (
          <>
            <div className="offline-drawer-intro">
              <div className="offline-drawer-icon">
                <Icon name="wifiOff" size={18} />
              </div>

              <p>
                Entries created while offline remain safely in this browser.
                They will be pushed to the production server when a connection
                is available.
              </p>
            </div>

            <div className="offline-list">
              {queue.map((item) => (
                <div className="offline-item" key={item.localId}>
                  <div className="offline-item-icon">
                    <Icon name="document" size={16} />
                  </div>

                  <div>
                    <strong>
                      {item.payload.machine || "Unspecified machine"}
                    </strong>
                    <span>
                      {item.payload.partNumber || "Part pending"} · Shift{" "}
                      {item.payload.shift} · Hour {item.payload.hourSlot}
                    </span>
                    <small>
                      Created locally {formatDateTime(item.createdAt)}
                    </small>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="primary-button full-button"
              onClick={onRetry}
            >
              <Icon name="refresh" size={16} />
              Try synchronization
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

/* ============================================================
   REFERENCE
   ============================================================ */

const FALLBACK_REFERENCE = {
  machines: [
    "PPW-CNC-01",
    "PPW-CNC-02",
    "PPW-VMC-03",
    "PPW-LATHE-04",
    "PPW-GRIND-05",
  ],
  parts: [
    "PN-4471-A",
    "PN-4471-B",
    "PN-8802",
    "PN-9130-X",
    "PN-2256",
  ],
  rejectionReasons: [
    "Dimensional",
    "Surface finish",
    "Burr",
    "Material defect",
    "Setup error",
    "Other",
  ],
  hourSlots: [1, 2, 3, 4, 5, 6, 7, 8],
};

/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getSavedUser());

  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [entries, setEntries] = useState([]);
  const [reference, setReference] = useState(FALLBACK_REFERENCE);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  const [historyEntry, setHistoryEntry] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [returnEntry, setReturnEntry] = useState(null);
  const [returnLoading, setReturnLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [online, setOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(getSavedQueue());
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);

  const [toast, setToast] = useState(null);

  const [theme, setTheme] = useState(
    localStorage.getItem(STORAGE.theme) || "dark"
  );

  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedShift, setSelectedShift] = useState("A");

  /* ==========================================================
     INITIAL SESSION
     ========================================================== */

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
      setEntries([]);
      setActiveView("dashboard");
    };

    window.addEventListener("apexflow:logout", handleLogout);

    return () => {
      window.removeEventListener("apexflow:logout", handleLogout);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE.theme, theme);
  }, [theme]);

  useEffect(() => {
    const onlineHandler = () => {
      setOnline(true);

      setTimeout(() => {
        syncOfflineQueue();
      }, 500);
    };

    const offlineHandler = () => {
      setOnline(false);
    };

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    loadReference();
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (navigator.onLine && token) {
        syncOfflineQueue();
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    const handler = () => {
      setToast(null);
    };

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        handler();
      }
    });

    return () => {};
  }, []);

  /* ==========================================================
     AUTH
     ========================================================== */

  const login = async (username, password) => {
    setLoading(true);

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: {
          username,
          password,
        },
      });

      const receivedToken =
        result.token ||
        result.accessToken ||
        result.jwt ||
        result.access_token;

      if (!receivedToken) {
        throw new Error("Login succeeded but no token was returned.");
      }

      const payload = decodeJwtPayload(receivedToken);

      const role =
        result.role ||
        payload?.role ||
        payload?.roles?.[0] ||
        "OPERATOR";

      const usernameFromResponse =
        result.username ||
        payload?.sub ||
        username;

      const name =
        result.name ||
        result.operatorName ||
        usernameFromResponse;

      const normalizedRole = String(role)
        .replace("ROLE_", "")
        .toUpperCase();

      const nextUser = {
        username: usernameFromResponse,
        name,
        role: normalizedRole,
      };

      localStorage.setItem(STORAGE.token, receivedToken);
      saveUser(nextUser);

      setToken(receivedToken);
      setUser(nextUser);
      setActiveView("dashboard");

      showToast(
        "success",
        "Welcome back",
        `Signed in as ${normalizedRole.toLowerCase()}.`
      );
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setUser(null);
    setEntries([]);
    setSelectedEntry(null);
    setEditingEntry(null);

    showToast("success", "Signed out", "Your session has been closed.");
  };

  /* ==========================================================
     DATA
     ========================================================== */

  const loadReference = async () => {
    try {
      const data = await apiRequest("/api/reference");

      setReference({
        ...FALLBACK_REFERENCE,
        ...(data || {}),
      });
    } catch {
      setReference(FALLBACK_REFERENCE);
    }
  };

  const loadEntries = async (silent = false) => {
    if (!token) return;

    if (!silent) setRefreshing(true);

    try {
      const data = await apiRequest("/api/entries");

      const list = Array.isArray(data)
        ? data
        : data?.content || data?.entries || [];

      setEntries(
        [...list].sort((a, b) => {
          const first = new Date(
            b.updatedAt || b.createdAt || 0
          ).getTime();

          const second = new Date(
            a.updatedAt || a.createdAt || 0
          ).getTime();

          return first - second;
        })
      );
    } catch (error) {
      if (!isNetworkError(error)) {
        showToast(
          "error",
          "Could not load production",
          error.message
        );
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  /* ==========================================================
     TOAST
     ========================================================== */

  const showToast = (type, title, message) => {
    setToast({
      id: uid(),
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  /* ==========================================================
     OFFLINE QUEUE
     ========================================================== */

  const queueOfflineEntry = (payload) => {
    const item = {
      localId: uid(),
      createdAt: new Date().toISOString(),
      payload,
    };

    const nextQueue = [...offlineQueue, item];

    setOfflineQueue(nextQueue);
    saveQueue(nextQueue);

    showToast(
      "success",
      "Saved locally",
      "The entry is safely queued and will sync when the connection returns."
    );

    return item;
  };

  const syncOfflineQueue = async () => {
    const queue = getSavedQueue();

    if (!queue.length || !navigator.onLine || !getToken()) return;

    const workingQueue = [...queue];
    const successfulIds = [];

    for (const item of workingQueue) {
      try {
        /*
          The backend exposes /api/entries/sync.

          The sync payload below intentionally sends one entry at a time.
          This keeps retry/idempotency semantics straightforward on the
          client while preserving clientId for server-side deduplication.
        */
        await apiRequest("/api/entries/sync", {
          method: "POST",
          body: [item.payload],
        });

        successfulIds.push(item.localId);
      } catch (error) {
        if (isNetworkError(error)) break;

        /*
          A conflict or already-synced response should not keep a record
          permanently stuck in the browser queue.
        */

        const message = String(error.message || "").toLowerCase();

        if (
          message.includes("already") ||
          message.includes("conflict") ||
          message.includes("duplicate")
        ) {
          successfulIds.push(item.localId);
        } else {
          break;
        }
      }
    }

    if (successfulIds.length > 0) {
      const remaining = workingQueue.filter(
        (item) => !successfulIds.includes(item.localId)
      );

      setOfflineQueue(remaining);
      saveQueue(remaining);

      await loadEntries(true);

      showToast(
        "success",
        "Synchronization complete",
        `${successfulIds.length} local ${
          successfulIds.length === 1 ? "entry was" : "entries were"
        } synchronized.`
      );
    }
  };

  /* ==========================================================
     CREATE / UPDATE
     ========================================================== */

  const saveEntry = async (payload, mode = "create") => {
    setLoading(true);

    try {
      if (!navigator.onLine) {
        queueOfflineEntry(payload);
        setActiveView("entries");
        setEditingEntry(null);
        return;
      }

      let result;

      if (mode === "edit" && editingEntry?.id) {
        result = await apiRequest(`/api/entries/${editingEntry.id}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        result = await apiRequest("/api/entries", {
          method: "POST",
          body: payload,
        });
      }

      await loadEntries(true);

      setSelectedEntry(result);
      setEditingEntry(null);
      setActiveView("entries");

      showToast(
        "success",
        mode === "edit" ? "Entry updated" : "Entry saved",
        mode === "edit"
          ? "Your production record has been updated."
          : "The production entry is now saved as a draft."
      );
    } catch (error) {
      if (isNetworkError(error)) {
        queueOfflineEntry(payload);
        setEditingEntry(null);
        setActiveView("entries");
      } else {
        showToast("error", "Could not save entry", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     SUBMIT
     ========================================================== */

  const submitEntry = async (entry) => {
    setConfirmAction({
      type: "submit",
      entry,
    });
  };

  const confirmSubmit = async () => {
    if (!confirmAction?.entry?.id) return;

    setConfirmLoading(true);

    try {
      const updated = await apiRequest(
        `/api/entries/${confirmAction.entry.id}/submit`,
        {
          method: "POST",
        }
      );

      await loadEntries(true);

      setSelectedEntry(updated);

      showToast(
        "success",
        "Entry submitted",
        "The record is now waiting for supervisor review."
      );

      setConfirmAction(null);
    } catch (error) {
      showToast(
        "error",
        "Submission failed",
        error.message
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /* ==========================================================
     APPROVE
     ========================================================== */

  const approveEntry = async (entry) => {
    setConfirmAction({
      type: "approve",
      entry,
    });
  };

  const confirmApprove = async () => {
    if (!confirmAction?.entry?.id) return;

    setConfirmLoading(true);

    try {
      const updated = await apiRequest(
        `/api/entries/${confirmAction.entry.id}/approve`,
        {
          method: "POST",
        }
      );

      await loadEntries(true);

      setSelectedEntry(updated);

      showToast(
        "success",
        "Entry approved",
        "The production record is now complete."
      );

      setConfirmAction(null);
    } catch (error) {
      showToast(
        "error",
        "Approval failed",
        error.message
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /* ==========================================================
     RETURN
     ========================================================== */

  const openReturnModal = (entry) => {
  setReturnEntry(entry);
};

  const confirmReturn = async (remark) => {
    if (!returnEntry?.id) return;

    setReturnLoading(true);

    try {
      const updated = await apiRequest(
        `/api/entries/${returnEntry.id}/return`,
        {
          method: "POST",
          body: {
            remark,
          },
        }
      );

      await loadEntries(true);

      setSelectedEntry(updated);
      setReturnEntry(null);

      showToast(
        "success",
        "Entry returned",
        "The operator can now review and resubmit the record."
      );
    } catch (error) {
      showToast(
        "error",
        "Could not return entry",
        error.message
      );
    } finally {
      setReturnLoading(false);
    }
  };

  /* ==========================================================
     HISTORY
     ========================================================== */

  const openHistory = async (entry) => {
    setHistoryEntry(entry);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const data = await apiRequest(
        `/api/entries/${entry.id}/history`
      );

      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(
        "error",
        "Could not load history",
        error.message
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ==========================================================
     EXPORT
     ========================================================== */

  const exportExcel = async (date = today(), shift = "A") => {
    try {
      const blob = await apiRequest(
        `/api/export/excel?date=${encodeURIComponent(
          date
        )}&shift=${encodeURIComponent(shift)}`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `production-${date}-shift-${shift}.xlsx`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);

      showToast(
        "success",
        "Export ready",
        `Excel report generated for ${formatDate(date)} · Shift ${shift}.`
      );
    } catch (error) {
      showToast(
        "error",
        "Export failed",
        error.message
      );
    }
  };

  /* ==========================================================
     NAVIGATION HELPERS
     ========================================================== */

  const goNewEntry = () => {
    setEditingEntry(null);
    setSelectedEntry(null);
    setActiveView("new-entry");
  };

  const openEntry = (entry) => {
    if (entry === "list") {
      setActiveView("entries");
      return;
    }

    setSelectedEntry(entry);
    setEditingEntry(null);
    setActiveView("detail");
  };

  const editEntry = (entry) => {
    setEditingEntry(entry);
    setSelectedEntry(null);
    setActiveView("edit-entry");
  };

  const refresh = async () => {
    await loadEntries();
    await syncOfflineQueue();
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  /* ==========================================================
     DERIVED
     ========================================================== */

  const role = user?.role || "OPERATOR";
  const pendingCount = offlineQueue.length;

  let pageTitle = "Overview";
  let pageSubtitle = "A live view of your production workspace.";

  if (activeView === "entries") {
    pageTitle =
      role === "OPERATOR"
        ? "My production"
        : role === "SUPERVISOR"
          ? "Production queue"
          : "Production data";

    pageSubtitle =
      role === "OPERATOR"
        ? "Review every production record you have captured."
        : "Track production records across the plant.";
  }

  if (activeView === "new-entry") {
    pageTitle = "New production entry";
    pageSubtitle = "Capture the current production hour.";
  }

  if (activeView === "edit-entry") {
    pageTitle = "Edit production entry";
    pageSubtitle = "Update the record before it moves forward.";
  }

  if (activeView === "detail") {
    pageTitle = "Entry detail";
    pageSubtitle = "Production data, quality signals and workflow state.";
  }

  if (activeView === "history") {
    pageTitle = "Workflow history";
    pageSubtitle = "Review the audit trail across production records.";
  }

  /* ==========================================================
     HISTORY PAGE
     ========================================================== */

  const historyPage =
    activeView === "history" ? (
      <div className="entries-page">
        <PageHeader
          eyebrow="AUDIT TRAIL"
          title="Workflow history"
          description="Select a record to inspect every status transition."
        />

        <section className="table-panel panel">
          <div className="table-toolbar">
            <div className="result-count">
              {entries.length} records available
            </div>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Operator</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Last changed</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <button
                        className="table-primary"
                        onClick={() => openHistory(entry)}
                      >
                        <strong>
                          {entry.machine} / {entry.partNumber}
                        </strong>
                        <span>Entry #{entry.id}</span>
                      </button>
                    </td>

                    <td>{entry.operatorName || "—"}</td>

                    <td>
                      {formatDate(entry.entryDate)} · Shift{" "}
                      {entry.shift}
                    </td>

                    <td>
                      <StatusBadge status={entry.status} />
                    </td>

                    <td>
                      {formatDateTime(
                        entry.latestChangedAt || entry.updatedAt
                      )}
                    </td>

                    <td>
                      <button
                        className="table-action"
                        onClick={() => openHistory(entry)}
                      >
                        <Icon name="activity" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length === 0 && (
            <EmptyState
              icon="activity"
              title="No records available"
              description="Workflow history will appear as production records move through the system."
            />
          )}
        </section>
      </div>
    ) : null;

  /* ==========================================================
     MAIN RENDER
     ========================================================== */

  if (!token || !user) {
    return (
      <>
        <LoginScreen onLogin={login} loading={loading} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        activeView={activeView}
        setActiveView={(view) => {
          setSelectedEntry(null);
          setEditingEntry(null);
          setActiveView(view);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={logout}
        online={online}
        pendingCount={pendingCount}
      />

      <main className="main-shell">
        <Topbar
          user={user}
          title={pageTitle}
          subtitle={pageSubtitle}
          onRefresh={refresh}
          refreshing={refreshing}
          online={online}
          pendingCount={pendingCount}
          theme={theme}
          toggleTheme={toggleTheme}
          onNewEntry={goNewEntry}
          canCreate={role === "OPERATOR"}
        />

        <div className="page-container">
          {activeView === "dashboard" && role === "OPERATOR" && (
            <OperatorDashboard
              entries={entries}
              user={user}
              onNewEntry={goNewEntry}
              onOpenEntry={openEntry}
              onSubmit={submitEntry}
              pendingCount={pendingCount}
              online={online}
              refreshing={refreshing}
            />
          )}

          {activeView === "dashboard" &&
            (role === "SUPERVISOR" || role === "MANAGER") && (
              <ReviewDashboard
                entries={entries}
                role={role}
                onReview={openEntry}
                onExport={exportExcel}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedShift={selectedShift}
                setSelectedShift={setSelectedShift}
              />
            )}

          {activeView === "entries" && (
            <EntriesTable
              entries={entries}
              role={role}
              onOpen={openEntry}
              onEdit={editEntry}
              onSubmit={submitEntry}
              onApprove={approveEntry}
              onReturn={openReturnModal}
              onHistory={openHistory}
              onNewEntry={goNewEntry}
            />
          )}

          {activeView === "new-entry" && (
            <EntryForm
              mode="create"
              initialData={null}
              reference={reference}
              onCancel={() => setActiveView("dashboard")}
              onSave={saveEntry}
              saving={loading}
            />
          )}

          {activeView === "edit-entry" && editingEntry && (
            <EntryForm
              mode="edit"
              initialData={editingEntry}
              reference={reference}
              onCancel={() => {
                setEditingEntry(null);
                setActiveView("entries");
              }}
              onSave={saveEntry}
              saving={loading}
            />
          )}

          {activeView === "detail" && selectedEntry && (
            <EntryDetail
              entry={selectedEntry}
              role={role}
              onBack={() => {
                setSelectedEntry(null);
                setActiveView("entries");
              }}
              onEdit={editEntry}
              onSubmit={submitEntry}
              onApprove={approveEntry}
              onReturn={openReturnModal}
              onHistory={openHistory}
            />
          )}

          {historyPage}
        </div>
      </main>

      <button
        className={`floating-sync ${pendingCount > 0 ? "has-items" : ""}`}
        onClick={() => setQueueDrawerOpen(true)}
        title="Offline queue"
      >
        <Icon name={pendingCount > 0 ? "wifiOff" : "wifi"} size={18} />

        {pendingCount > 0 && (
          <span>{pendingCount}</span>
        )}
      </button>

      {historyEntry && (
        <HistoryDrawer
          entry={historyEntry}
          history={history}
          loading={historyLoading}
          onClose={() => setHistoryEntry(null)}
        />
      )}

      {returnEntry && (
        <ReturnModal
          entry={returnEntry}
          loading={returnLoading}
          onClose={() => setReturnEntry(null)}
          onSubmit={confirmReturn}
        />
      )}

      {confirmAction?.type === "submit" && (
        <ConfirmModal
          title="Submit this production entry?"
          description="Once submitted, the record moves to the supervisor review queue."
          confirmLabel="Submit entry"
          icon="send"
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmSubmit}
          loading={confirmLoading}
        />
      )}

      {confirmAction?.type === "approve" && (
        <ConfirmModal
          title="Approve this production entry?"
          description="This will mark the production record as approved and complete its current workflow."
          confirmLabel="Approve entry"
          icon="check"
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmApprove}
          loading={confirmLoading}
        />
      )}

      {queueDrawerOpen && (
        <OfflineQueueDrawer
          queue={offlineQueue}
          onClose={() => setQueueDrawerOpen(false)}
          onRetry={syncOfflineQueue}
        />
      )}

      <Toast
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}