import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function App() {
  // data + ui
  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState("");

  // create form state
  const [f, setF] = useState({
    task_name: "",
    status: "Considered",
    assigned_to: "",
    start_date: "",
    end_date: "",
  });

  // edit state
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({
    task_name: "",
    status: "Considered",
    assigned_to: "",
    start_date: "",
    end_date: "",
  });

  // load all tasks (GET /tasks)
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
  useEffect(() => {
    load();
  }, []);

  // create (POST /tasks)
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
        status: "Considered",
        assigned_to: "",
        start_date: "",
        end_date: "",
      });
    } catch (e) {
      setErr(e.message || "Failed to create");
    }
  }

  // view one (GET /tasks/{id})
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

  // start edit (prefill)
  function startEdit(t) {
    setEditId(t.id);
    setEf({
      task_name: t.task_name || "",
      status: t.status || "Considered",
      assigned_to: t.assigned_to || "",
      start_date: t.start_date || "",
      end_date: t.end_date || "",
    });
  }

  // update (PATCH /tasks/{id})
  async function saveEdit() {
    try {
      const body = {
        task_name: ef.task_name.trim(),
        status: ef.status,
        assigned_to: ef.assigned_to || null,
        start_date: ef.start_date || null,
        end_date: ef.end_date || null,
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

  // delete (DELETE /tasks/{id})
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

  // helpers
  const onChange = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const onEditChange = (e) => setEf({ ...ef, [e.target.name]: e.target.value });
  const th = {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
    fontWeight: 600,
    fontSize: 14,
  };
  const td = {
    padding: "10px 12px",
    borderBottom: "1px solid #f2f2f2",
    fontSize: 14,
  };
  const input = {
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 6,
  };
  function fmt(d) {
    if (!d) return "—";
    try {
      const x = new Date(d);
      return isNaN(x) ? d : x.toISOString().slice(0, 10);
    } catch {
      return d;
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 20 }}>
      <h1>Task Board</h1>

      {err && <p style={{ color: "#c0392b" }}>Error: {err}</p>}

      {/* Create form */}
      <form
        onSubmit={createTask}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <input
          name="task_name"
          value={f.task_name}
          onChange={onChange}
          placeholder="Task name"
          style={input}
          required
        />
        <select
          name="status"
          value={f.status}
          onChange={onChange}
          style={input}
        >
          <option>Considered</option>
          <option>Investigation</option>
          <option>Ready To Development</option>
          <option>Under Development</option>
          <option>Code Review</option>
          <option>Development Completed</option>
        </select>
        <input
          name="assigned_to"
          value={f.assigned_to}
          onChange={onChange}
          placeholder="Assigned To"
          style={input}
        />
        <input
          type="date"
          name="start_date"
          value={f.start_date}
          onChange={onChange}
          style={input}
        />
        <input
          type="date"
          name="end_date"
          value={f.end_date}
          onChange={onChange}
          style={input}
        />
        <button
          type="submit"
          style={{
            padding: "8px 12px",
            border: "1px solid #2563eb",
            borderRadius: 6,
            background: "#2563eb",
            color: "#fff",
          }}
        >
          Add Task
        </button>
      </form>

      {/* Table */}
      <div
        style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}
        >
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>ID</th>
              <th style={th}>Task Name</th>
              <th style={th}>Status</th>
              <th style={th}>Assigned To</th>
              <th style={th}>Start</th>
              <th style={th}>End</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td style={td} colSpan="7">
                  No tasks
                </td>
              </tr>
            ) : (
              tasks.map((t) =>
                editId === t.id ? (
                  <tr key={t.id}>
                    <td style={td}>{t.id}</td>
                    <td style={td}>
                      <input
                        name="task_name"
                        value={ef.task_name}
                        onChange={onEditChange}
                        style={{ ...input, width: "100%" }}
                      />
                    </td>
                    <td style={td}>
                      <select
                        name="status"
                        value={ef.status}
                        onChange={onEditChange}
                        style={input}
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
                      <input
                        name="assigned_to"
                        value={ef.assigned_to}
                        onChange={onEditChange}
                        style={input}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        name="start_date"
                        value={ef.start_date || ""}
                        onChange={onEditChange}
                        style={input}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        name="end_date"
                        value={ef.end_date || ""}
                        onChange={onEditChange}
                        style={input}
                      />
                    </td>
                    <td style={td}>
                      <button
                        onClick={saveEdit}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #2563eb",
                          borderRadius: 6,
                          background: "#2563eb",
                          color: "#fff",
                          marginRight: 8,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id}>
                    <td style={td}>{t.id}</td>
                    <td style={td}>{t.task_name}</td>
                    <td style={td}>{t.status}</td>
                    <td style={td}>{t.assigned_to ?? "—"}</td>
                    <td style={td}>{fmt(t.start_date)}</td>
                    <td style={td}>{fmt(t.end_date)}</td>
                    <td style={td}>
                      <button
                        onClick={() => viewTask(t.id)}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          marginRight: 6,
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => startEdit(t)}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          marginRight: 6,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                        }}
                      >
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
    </div>
  );
}
