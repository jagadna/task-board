import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const statusOptions = [
  "Considered",
  "Investigation",
  "Ready To Development",
  "Under Development",
  "Code Review",
  "Development Completed",
];

const priorityOptions = ["Low", "Medium", "High", "Urgent"];
const priorityFilters = ["All", ...priorityOptions];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    task_name: "",
    status: statusOptions[0],
    assigned_to: "",
    start_date: "",
    end_date: "",
    priority: "Medium",
  });
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({
    task_name: "",
    status: statusOptions[0],
    assigned_to: "",
    start_date: "",
    end_date: "",
    priority: "Medium",
  });
  const [priorityFilter, setPriorityFilter] = useState("All");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setErr("");
      const res = await fetch(`${API}/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setErr(e.message || "Failed to load tasks");
    }
  }

  async function createTask(e) {
    e.preventDefault();
    setErr("");
    try {
      const body = {
        task_name: f.task_name,
        status: f.status,
        assigned_to: f.assigned_to || null,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        priority: f.priority,
      };
      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      setTasks((cur) => [created, ...cur]);
      setF({
        task_name: "",
        status: statusOptions[0],
        assigned_to: "",
        start_date: "",
        end_date: "",
        priority: "Medium",
      });
    } catch (e) {
      setErr(e.message || "Failed to create");
    }
  }

  async function viewTask(id) {
    try {
      const res = await fetch(`${API}/tasks/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const t = await res.json();
      alert(JSON.stringify(t, null, 2));
    } catch (e) {
      setErr(e.message || "Failed to fetch task");
    }
  }

  function startEdit(t) {
    setEditId(t.id);
    setEf({
      task_name: t.task_name || "",
      status: t.status || statusOptions[0],
      assigned_to: t.assigned_to || "",
      start_date: t.start_date || "",
      end_date: t.end_date || "",
      priority: t.priority || "Medium",
    });
  }

  async function saveEdit() {
    try {
      const body = {
        task_name: ef.task_name.trim(),
        status: ef.status,
        assigned_to: ef.assigned_to || null,
        start_date: ef.start_date || null,
        end_date: ef.end_date || null,
        priority: ef.priority,
      };
      const res = await fetch(`${API}/tasks/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setTasks((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
      setEditId(null);
    } catch (e) {
      setErr(e.message || "Failed to update");
    }
  }

  async function deleteTask(id) {
    if (!confirm(`Delete task #${id}?`)) return;
    try {
      const res = await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks((cur) => cur.filter((t) => t.id !== id));
      if (editId === id) setEditId(null);
    } catch (e) {
      setErr(e.message || "Failed to delete");
    }
  }

  const onChange = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const onEditChange = (e) => setEf({ ...ef, [e.target.name]: e.target.value });

  function fmt(d) {
    if (!d) return "--";
    try {
      const x = new Date(d);
      return Number.isNaN(x.getTime()) ? d : x.toISOString().slice(0, 10);
    } catch {
      return d;
    }
  }

  const statusTone = {
    Considered: "badge badge-soft-purple",
    Investigation: "badge badge-soft-sky",
    "Ready To Development": "badge badge-soft-teal",
    "Under Development": "badge badge-soft-indigo",
    "Code Review": "badge badge-soft-amber",
    "Development Completed": "badge badge-soft-emerald",
  };

  const priorityTone = {
    Low: "badge badge-outline",
    Medium: "badge badge-soft-indigo",
    High: "badge badge-soft-rose",
    Urgent: "badge badge-solid-rose",
  };

  const visibleTasks =
    priorityFilter === "All"
      ? tasks
      : tasks.filter((t) => (t.priority ?? "Medium") === priorityFilter);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="hero-eyebrow">Productivity Suite</p>
          <h1 className="hero-title">Task Board</h1>
          <p className="hero-subtitle">
            Organize your backlog, track progress, and deliver work on time.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-card-label">Total tasks</p>
          <p className="hero-card-value">{tasks.length}</p>
        </div>
      </header>

      {err && <div className="alert">Error: {err}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Create a new task</h2>
          <p>Add work items and assign owners in seconds.</p>
        </div>
        <form onSubmit={createTask} className="form-grid">
          <input
            name="task_name"
            value={f.task_name}
            onChange={onChange}
            placeholder="Task name"
            className="field"
            required
          />
          <select name="status" value={f.status} onChange={onChange} className="field">
            {statusOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select name="priority" value={f.priority} onChange={onChange} className="field">
            {priorityOptions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <input
            name="assigned_to"
            value={f.assigned_to}
            onChange={onChange}
            placeholder="Assigned to"
            className="field"
          />
          <input type="date" name="start_date" value={f.start_date} onChange={onChange} className="field" />
          <input type="date" name="end_date" value={f.end_date} onChange={onChange} className="field" />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Add task
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Current pipeline</h2>
          <p>Monitor every task as it moves through your delivery stages.</p>
        </div>
        <div className="filter-bar" role="group" aria-label="Filter tasks by priority">
          <span className="filter-label">Filter by priority</span>
          <div className="filter-chips">
            {priorityFilters.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip${priorityFilter === option ? " chip-active" : ""}`}
                onClick={() => setPriorityFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Start</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    {tasks.length === 0
                      ? "Start by creating your first task."
                      : "No tasks match this priority yet."}
                  </td>
                </tr>
              ) : (
                visibleTasks.map((t) =>
                  editId === t.id ? (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>
                        <input name="task_name" value={ef.task_name} onChange={onEditChange} className="field" />
                      </td>
                      <td>
                        <select name="status" value={ef.status} onChange={onEditChange} className="field">
                          {statusOptions.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select name="priority" value={ef.priority} onChange={onEditChange} className="field">
                          {priorityOptions.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input name="assigned_to" value={ef.assigned_to} onChange={onEditChange} className="field" />
                      </td>
                      <td>
                        <input type="date" name="start_date" value={ef.start_date || ""} onChange={onEditChange} className="field" />
                      </td>
                      <td>
                        <input type="date" name="end_date" value={ef.end_date || ""} onChange={onEditChange} className="field" />
                      </td>
                      <td className="actions">
                        <button onClick={saveEdit} className="btn btn-primary">
                          Save
                        </button>
                        <button onClick={() => setEditId(null)} className="btn btn-ghost">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>{t.task_name}</td>
                      <td>
                        <span className={statusTone[t.status] ?? "badge"}>{t.status}</span>
                      </td>
                      <td>
                        <span className={priorityTone[t.priority ?? "Medium"] ?? "badge"}>{t.priority ?? "Medium"}</span>
                      </td>
                      <td>{t.assigned_to ?? "--"}</td>
                      <td>{fmt(t.start_date)}</td>
                      <td>{fmt(t.end_date)}</td>
                      <td className="actions">
                        <button onClick={() => viewTask(t.id)} className="btn btn-ghost">
                          View
                        </button>
                        <button onClick={() => startEdit(t)} className="btn btn-secondary">
                          Edit
                        </button>
                        <button onClick={() => deleteTask(t.id)} className="btn btn-danger">
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
