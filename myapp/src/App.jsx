import { useEffect, useMemo, useState } from "react";
import { Routes, Route, NavLink, Link } from "react-router-dom";
import TaskDetailsPage from "./pages/TaskDetailsPage";
import "./App.css";

const API = "http://127.0.0.1:8000";
const PRIORITY_FILTERS = ["All", "Low", "Medium", "High", "Urgent"];
const ACTIVE_STATUSES = [
  "Investigation",
  "Ready To Development",
  "Under Development",
  "Code Review",
];

function App() {
  // auth state
  const [token, setToken] = useState(() =>
    localStorage.getItem("taskboard_token")
  );
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("taskboard_user");
    return saved ? JSON.parse(saved) : null;
  });

  // tasks + ui
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [err, setErr] = useState("");

  // create form
  const [form, setForm] = useState({
    task_name: "",
    status: "Considered",
    assigned_to: "",
    start_date: "",
    end_date: "",
    priority: "Medium",
  });

  // edit state
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    task_name: "",
    status: "Considered",
    assigned_to: "",
    start_date: "",
    end_date: "",
    priority: "Medium",
  });

  // login form
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [priorityFilter, setPriorityFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // load tasks when user logs in
  useEffect(() => {
    if (user) {
      loadTasks();
    } else {
      setTasks([]);
    }
  }, [user]);

  async function loadTasks() {
    try {
      setErr("");
      setLoadingTasks(true);
      const res = await fetch(`${API}/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setErr(e.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    setErr("");

    try {
      if (!loginForm.username.trim()) {
        alert("Enter a username");
        return;
      }

      const body = new URLSearchParams();
      body.append("username", loginForm.username);
      body.append("password", loginForm.password);
      body.append("grant_type", "password");

      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      const data = await res.json();
      const accessToken = data.access_token;
      if (!accessToken) throw new Error("No access token received");

      const meRes = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!meRes.ok) throw new Error("Failed to load user info");
      const me = await meRes.json();

      setToken(accessToken);
      setUser(me);
      localStorage.setItem("taskboard_token", accessToken);
      localStorage.setItem("taskboard_user", JSON.stringify(me));

      setLoginForm({ username: "", password: "" });
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("taskboard_token");
    localStorage.removeItem("taskboard_user");
  }

  // helpers
  const onFormChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onEditChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  async function createTask(e) {
    e.preventDefault();
    setErr("");

    try {
      const body = {
        task_name: form.task_name,
        status: form.status,
        assigned_to: form.assigned_to || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        priority: form.priority,
      };

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const created = await res.json();
      setTasks((cur) => [created, ...cur]);

      setForm({
        task_name: "",
        status: "Considered",
        assigned_to: "",
        start_date: "",
        end_date: "",
        priority: "Medium",
      });
    } catch (e) {
      setErr(e.message || "Failed to create task");
    }
  }

  function startEdit(t) {
    setEditId(t.id);
    setEditForm({
      task_name: t.task_name || "",
      status: t.status || "Considered",
      assigned_to: t.assigned_to || "",
      start_date: t.start_date || "",
      end_date: t.end_date || "",
      priority: t.priority || "Medium",
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setErr("");

    try {
      const body = {
        task_name: editForm.task_name.trim(),
        status: editForm.status,
        assigned_to: editForm.assigned_to || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        priority: editForm.priority,
      };

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/tasks/${editId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const updated = await res.json();
      setTasks((cur) => cur.map((t) => (t.id === updated.id ? updated : t)));
      setEditId(null);
    } catch (e) {
      setErr(e.message || "Failed to update task");
    }
  }

  async function deleteTask(id) {
    if (!window.confirm(`Delete task #${id}?`)) return;
    setErr("");

    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/tasks/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setTasks((cur) => cur.filter((t) => t.id !== id));
      if (editId === id) setEditId(null);
    } catch (e) {
      setErr(e.message || "Failed to delete task");
    }
  }

  function fmt(dateStr) {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return d.toISOString().slice(0, 10);
    } catch {
      return dateStr;
    }
  }

  const normalizedQuery = q.trim().toLowerCase();
  const priorityFiltered =
    priorityFilter === "All"
      ? tasks
      : tasks.filter((t) => (t.priority ?? "Medium") === priorityFilter);

  const filteredTasks = [...priorityFiltered]
    .filter((t) => {
      if (!normalizedQuery) return true;
      const haystack = [t.task_name || "", t.assigned_to || "", t.status || ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return (
          (order[a.priority ?? "Medium"] ?? 99) -
          (order[b.priority ?? "Medium"] ?? 99)
        );
      }

      const dateA = new Date(a.created_at || a.end_date || a.start_date || 0);
      const dateB = new Date(b.created_at || b.end_date || b.start_date || 0);

      if (sortBy === "oldest") {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

  const activeCount = tasks.filter((t) =>
    ACTIVE_STATUSES.includes(t.status)
  ).length;
  const completedCount = tasks.filter(
    (t) => t.status === "Development Completed"
  ).length;
  const urgentCount = tasks.filter(
    (t) => (t.priority ?? "Medium") === "Urgent"
  ).length;

  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(
      (t) =>
        t.assigned_to &&
        t.assigned_to.toLowerCase() === user.username.toLowerCase()
    );
  }, [tasks, user]);

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => t.end_date)
      .sort((a, b) => {
        const aDate = new Date(a.end_date ?? 0).getTime();
        const bDate = new Date(b.end_date ?? 0).getTime();
        return aDate - bDate;
      })
      .slice(0, 4);
  }, [tasks]);

  // ---------- LOGIN SCREEN ----------
  if (!user) {
    return (
      <div className="page login-screen">
        <div className="login-card">
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>TaskBoard Login</h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Sign in to manage your project tasks.
          </p>
          {err && (
            <p
              style={{
                color: "#b91c1c",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              {err}
            </p>
          )}
          <form
            onSubmit={login}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <input
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
              className="field"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              className="field"
            />
            <button type="submit" className="btn btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- MAIN APP WHEN LOGGED IN ----------
  return (
    <div className="page">
      {/* Top bar */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <div className="logo">TB</div>
            <div className="app-brand-copy">
              <div>TaskBoard</div>
              <span>Manage work, ship faster</span>
            </div>
          </div>

          <nav className="app-nav">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/tasks"
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              Task Board
            </NavLink>

            <div className="app-user-meta">
              <span>
                {user.username}
                <small>({user.role})</small>
              </span>
              <button onClick={logout} className="nav-logout">
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="main-content">
        <Routes>
          <Route path="/kanban" element={<KanbanView tasks={tasks} />} />
          {/* Home */}
          <Route
            path="/"
            element={
              <div className="home-shell">
                <section className="home-hero">
                  <div className="home-hero-text">
                    <p className="home-eyebrow">Daily overview</p>
                    <h1>Welcome back, {user.username}</h1>
                    <p>
                      Keep stakeholders aligned with a single view of progress,
                      ownership, and what needs attention next.
                    </p>
                    <div className="home-hero-actions">
                      <Link to="/tasks" className="btn btn-primary">
                        Open task board
                      </Link>
                      <Link to="/kanban" className="btn btn-secondary">
                        View Kanban lanes
                      </Link>
                    </div>
                  </div>

                  <div className="home-hero-panel">
                    <p className="home-hero-panel-label">Active initiatives</p>
                    <p className="home-hero-panel-value">{activeCount}</p>
                    <p className="home-hero-panel-subtext">
                      {urgentCount} urgent • {completedCount} completed
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={loadTasks}
                    >
                      Refresh data
                    </button>
                  </div>
                </section>

                <div className="home-stats">
                  <SummaryCard
                    label="Total tasks"
                    value={tasks.length}
                    subtext="Across every swim lane"
                    accent="violet"
                  />
                  <SummaryCard
                    label="Assigned to me"
                    value={myTasks.length}
                    subtext="Waiting for your input"
                    accent="cyan"
                  />
                  <SummaryCard
                    label="Shipped this sprint"
                    value={completedCount}
                    subtext="Marked Development Completed"
                    accent="emerald"
                  />
                  <SummaryCard
                    label="Upcoming deadlines"
                    value={upcomingTasks.length}
                    subtext="Showing the next 4"
                    accent="amber"
                  />
                </div>

                <div className="home-layout">
                  <section className="home-card">
                    <header className="home-card-header">
                      <div>
                        <p className="home-card-eyebrow">My queue</p>
                        <h3>Assigned to you</h3>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={loadTasks}
                      >
                        Sync now
                      </button>
                    </header>

                    {myTasks.length === 0 ? (
                      <div className="home-empty">
                        You don&apos;t have any assigned tasks yet.
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="task-table home-table">
                          <thead>
                            <tr>
                              <th style={th}>ID</th>
                              <th style={th}>Task</th>
                              <th style={th}>Status</th>
                              <th style={th}>Priority</th>
                              <th style={th}>End</th>
                              <th style={th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myTasks.map((t) => (
                              <tr key={t.id}>
                                <td style={td}>{t.id}</td>
                                <td style={td}>{t.task_name}</td>
                                <td style={td}>
                                  <Badge label={t.status} type="status" />
                                </td>
                                <td style={td}>
                                  <Badge
                                    label={t.priority ?? "Medium"}
                                    type="priority"
                                  />
                                </td>
                                <td style={td}>{fmt(t.end_date)}</td>
                                <td style={td}>
                                  <Link
                                    to={`/tasks/${t.id}`}
                                    className="btn btn-secondary small"
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="home-card home-card--side">
                    <header className="home-card-header">
                      <div>
                        <p className="home-card-eyebrow">Planning radar</p>
                        <h3>Upcoming deadlines</h3>
                      </div>
                    </header>

                    {upcomingTasks.length === 0 ? (
                      <div className="home-empty">
                        No upcoming due dates yet.
                      </div>
                    ) : (
                      <ul className="milestone-list">
                        {upcomingTasks.map((task) => (
                          <li key={task.id} className="milestone-item">
                            <div>
                              <Link
                                to={`/tasks/${task.id}`}
                                className="milestone-link"
                              >
                                {task.task_name}
                              </Link>
                              <p>
                                Owner:{" "}
                                <strong>
                                  {task.assigned_to || "Unassigned"}
                                </strong>
                              </p>
                            </div>
                            <div className="milestone-meta">
                              <span
                                className={`due-pill ${dueTone(task.end_date)}`}
                              >
                                {describeDue(task.end_date)}
                              </span>
                              <span className="milestone-date">
                                {fmt(task.end_date)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            }
          />

          {/* Task Board */}
          <Route
            path="/tasks"
            element={
              <div className="taskboard-page">
                <section className="hero">
                  <div>
                    <p className="hero-eyebrow">Team operations</p>
                    <h1 className="hero-title">Task Board</h1>
                    <p className="hero-subtitle">
                      Keep everyone aligned with beautiful status tracking and
                      rich task context.
                    </p>
                    <div className="hero-metrics">
                      <span className="badge badge-outline">
                        {filteredTasks.length} visible items
                      </span>
                    </div>
                  </div>
                  <div className="hero-card">
                    <p className="hero-card-label">In progress</p>
                    <p className="hero-card-value">{activeCount}</p>
                    <p className="hero-card-subtext">
                      {urgentCount} urgent • {completedCount} completed
                    </p>
                  </div>
                </section>

                {err && <div className="alert">Error: {err}</div>}

                <div className="controls">
                  <div className="controls-left">
                    <input
                      className="search"
                      placeholder="Search tasks, owners, status..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                    <div className="chips">
                      {PRIORITY_FILTERS.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          className={`chip ${
                            priorityFilter === filter ? "chip-active" : ""
                          }`}
                          onClick={() => setPriorityFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="controls-right">
                    <select
                      className="field compact"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="priority">Priority</option>
                    </select>

                    <div
                      className="view-toggle"
                      role="toolbar"
                      aria-label="Toggle layout"
                    >
                      <button
                        type="button"
                        className={`btn-icon ${
                          viewMode === "table" ? "active" : ""
                        }`}
                        onClick={() => setViewMode("table")}
                        title="Table view"
                      >
                        ▤
                      </button>
                      <button
                        type="button"
                        className={`btn-icon ${
                          viewMode === "cards" ? "active" : ""
                        }`}
                        onClick={() => setViewMode("cards")}
                        title="Card view"
                      >
                        ▦
                      </button>
                    </div>
                  </div>
                </div>

                {user.role === "admin" && (
                  <section className="panel">
                    <div className="panel-header">
                      <h2>Create a task</h2>
                      <p>Add work items and assign owners in seconds.</p>
                    </div>
                    <form onSubmit={createTask} className="form-grid">
                      <input
                        className="field"
                        name="task_name"
                        value={form.task_name}
                        onChange={onFormChange}
                        placeholder="Task name"
                        required
                      />
                      <select
                        className="field"
                        name="status"
                        value={form.status}
                        onChange={onFormChange}
                      >
                        <option>Considered</option>
                        <option>Investigation</option>
                        <option>Ready To Development</option>
                        <option>Under Development</option>
                        <option>Code Review</option>
                        <option>Development Completed</option>
                      </select>
                      <select
                        className="field"
                        name="priority"
                        value={form.priority}
                        onChange={onFormChange}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Urgent</option>
                      </select>
                      <input
                        className="field"
                        name="assigned_to"
                        value={form.assigned_to}
                        onChange={onFormChange}
                        placeholder="Assigned To"
                      />
                      <input
                        className="field"
                        type="date"
                        name="start_date"
                        value={form.start_date}
                        onChange={onFormChange}
                      />
                      <input
                        className="field"
                        type="date"
                        name="end_date"
                        value={form.end_date}
                        onChange={onFormChange}
                      />
                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary">
                          Add task
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                <section className="panel">
                  <div className="panel-header">
                    <h2>Current pipeline</h2>
                    <p>
                      Monitor every task as it moves through your delivery
                      stages.
                    </p>
                  </div>

                  {loadingTasks ? (
                    <div className="empty-state">Loading tasks...</div>
                  ) : viewMode === "table" ? (
                    <div className="table-wrapper">
                      <table className="task-table">
                        <thead>
                          <tr>
                            <th style={th}>ID</th>
                            <th style={th}>Task Name</th>
                            <th style={th}>Status</th>
                            <th style={th}>Priority</th>
                            <th style={th}>Assigned To</th>
                            <th style={th}>Start</th>
                            <th style={th}>End</th>
                            <th style={th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTasks.length === 0 ? (
                            <tr>
                              <td style={td} colSpan={8}>
                                Start by creating your first task or clear
                                filters.
                              </td>
                            </tr>
                          ) : (
                            filteredTasks.map((t) =>
                              editId === t.id ? (
                                <tr key={t.id}>
                                  <td style={td}>{t.id}</td>
                                  <td style={td}>
                                    <input
                                      name="task_name"
                                      value={editForm.task_name}
                                      onChange={onEditChange}
                                      className="field"
                                      style={{ padding: "6px 8px" }}
                                    />
                                  </td>
                                  <td style={td}>
                                    <select
                                      name="status"
                                      value={editForm.status}
                                      onChange={onEditChange}
                                      className="field"
                                    >
                                      <option>Considered</option>
                                      <option>Investigation</option>
                                      <option>Ready To Development</option>
                                      <option>Under Development</option>
                                      <option>Code Review</option>
                                      <option>Development Completed</option>
                                    </select>
                                  </td>
                                  <td style={td}>
                                    <select
                                      name="priority"
                                      value={editForm.priority}
                                      onChange={onEditChange}
                                      className="field"
                                    >
                                      <option>Low</option>
                                      <option>Medium</option>
                                      <option>High</option>
                                      <option>Urgent</option>
                                    </select>
                                  </td>
                                  <td style={td}>
                                    <input
                                      name="assigned_to"
                                      value={editForm.assigned_to}
                                      onChange={onEditChange}
                                      className="field"
                                    />
                                  </td>
                                  <td style={td}>
                                    <input
                                      type="date"
                                      name="start_date"
                                      value={editForm.start_date || ""}
                                      onChange={onEditChange}
                                      className="field"
                                    />
                                  </td>
                                  <td style={td}>
                                    <input
                                      type="date"
                                      name="end_date"
                                      value={editForm.end_date || ""}
                                      onChange={onEditChange}
                                      className="field"
                                    />
                                  </td>
                                  <td style={td} className="actions">
                                    <button
                                      onClick={saveEdit}
                                      className="btn btn-primary small"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditId(null)}
                                      className="btn btn-secondary small"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                <tr key={t.id}>
                                  <td style={td}>{t.id}</td>
                                  <td style={td}>{t.task_name}</td>
                                  <td style={td}>
                                    <Badge label={t.status} type="status" />
                                  </td>
                                  <td style={td}>
                                    <Badge
                                      label={t.priority ?? "Medium"}
                                      type="priority"
                                    />
                                  </td>
                                  <td style={td}>{t.assigned_to ?? "—"}</td>
                                  <td style={td}>{fmt(t.start_date)}</td>
                                  <td style={td}>{fmt(t.end_date)}</td>
                                  <td style={td} className="actions">
                                    <Link
                                      to="/kanban"
                                      className="btn btn-ghost small"
                                    >
                                      Kanban
                                    </Link>
                                    <Link
                                      to={`/tasks/${t.id}`}
                                      className="btn btn-secondary small"
                                    >
                                      View
                                    </Link>
                                    <button
                                      onClick={() => startEdit(t)}
                                      className="btn btn-secondary small"
                                    >
                                      Edit
                                    </button>
                                    {user.role === "admin" && (
                                      <button
                                        onClick={() => deleteTask(t.id)}
                                        className="btn btn-danger small"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="cards-grid">
                      {filteredTasks.length === 0 ? (
                        <div className="empty-state">
                          No tasks match your current filters.
                        </div>
                      ) : (
                        filteredTasks.map((t) => (
                          <article key={t.id} className="task-card">
                            <div className="card-header">
                              <div>
                                <p className="card-id">#{t.id}</p>
                                <h3 className="card-title">{t.task_name}</h3>
                              </div>
                              <div className="card-badges">
                                <Badge label={t.status} type="status" />
                                <Badge
                                  label={t.priority ?? "Medium"}
                                  type="priority"
                                />
                              </div>
                            </div>
                            <div className="card-body">
                              <p className="muted">
                                Owner: {t.assigned_to ?? "—"}
                              </p>
                              <p className="muted">
                                Start {fmt(t.start_date)} · Due{" "}
                                {fmt(t.end_date)}
                              </p>
                            </div>
                            <div className="card-actions">
                              <Link
                                to={`/tasks/${t.id}`}
                                className="btn btn-ghost small"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => startEdit(t)}
                                className="btn btn-secondary small"
                              >
                                Edit
                              </button>
                              {user.role === "admin" && (
                                <button
                                  onClick={() => deleteTask(t.id)}
                                  className="btn btn-danger small"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  )}
                </section>
              </div>
            }
          />

          {/* Task details */}
          <Route path="/tasks/:id" element={<TaskDetailsPage />} />
        </Routes>
      </main>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
  fontSize: 13,
};

const td = {
  padding: "8px 12px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
};

function SummaryCard({ label, value, subtext, accent = "neutral" }) {
  return (
    <article className={`summary-card summary-card--${accent}`}>
      <p className="summary-card-label">{label}</p>
      <p className="summary-card-value">{value}</p>
      {subtext && <p className="summary-card-subtext">{subtext}</p>}
    </article>
  );
}

function KanbanView({ tasks }) {
  const columns = [
    "Considered",
    "Investigation",
    "Ready To Development",
    "Under Development",
    "Code Review",
    "Development Completed",
  ];

  const columnStyle = {
    flex: 1,
    minWidth: 220,
    background: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #eee",
  };

  const cardStyle = {
    background: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Kanban Board</h2>

      <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
        {columns.map((col) => (
          <div key={col} style={columnStyle}>
            <h4 style={{ marginTop: 0 }}>{col}</h4>

            {tasks
              .filter((t) => t.status === col)
              .map((t) => (
                <div key={t.id} style={cardStyle}>
                  <div style={{ fontWeight: 600 }}>{t.task_name}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Assigned: {t.assigned_to || "—"}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      padding: "3px 6px",
                      width: "fit-content",
                      borderRadius: 6,
                      background:
                        t.priority === "Urgent"
                          ? "#fee2e2"
                          : t.priority === "High"
                          ? "#fef3c7"
                          : t.priority === "Medium"
                          ? "#dbeafe"
                          : "#e5e7eb",
                    }}
                  >
                    {t.priority}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, type }) {
  // subtle color mapping for status and priority
  let bg = "#e5e7eb";
  let color = "#374151";

  if (type === "status") {
    if (label === "Under Development") {
      bg = "#dbeafe";
      color = "#1d4ed8";
    } else if (label === "Code Review") {
      bg = "#fef3c7";
      color = "#92400e";
    } else if (label === "Development Completed") {
      bg = "#dcfce7";
      color = "#166534";
    } else if (label === "Investigation") {
      bg = "#eef2ff";
      color = "#3730a3";
    }
  }

  if (type === "priority") {
    if (label === "High") {
      bg = "#fff7ed";
      color = "#b45309";
    } else if (label === "Urgent") {
      bg = "#ef4444";
      color = "#fff";
    } else if (label === "Medium") {
      bg = "#dbeafe";
      color = "#1e40af";
    } else if (label === "Low") {
      bg = "#f3f4f6";
      color = "#374151";
    }
  }

  return (
    <span
      style={{
        fontSize: 12,
        padding: "5px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontWeight: 600,
        display: "inline-block",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      {label}
    </span>
  );
}

function differenceInDays(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function describeDue(dateStr) {
  const diff = differenceInDays(dateStr);
  if (diff === null) return "No due date";
  if (diff === 0) return "Due today";
  if (diff > 0) return `Due in ${diff}d`;
  return `${Math.abs(diff)}d overdue`;
}

function dueTone(dateStr) {
  const diff = differenceInDays(dateStr);
  if (diff === null) return "";
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "";
}

export default App;
