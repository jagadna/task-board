import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = "http://127.0.0.1:8000";

export default function TaskDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [desc, setDesc] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const viewer = useMemo(() => {
    try {
      const stored = localStorage.getItem("taskboard_user");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn("Unable to parse stored user", error);
      return null;
    }
  }, []);

  const loadTask = useCallback(async () => {
    const res = await fetch(`${API}/tasks/${id}`);
    if (!res.ok) throw new Error("Failed to load task");
    const data = await res.json();
    setTask(data);
    setDesc(data.description || "");
    return data;
  }, [id]);

  const loadAttachments = useCallback(async () => {
    const res = await fetch(`${API}/tasks/${id}/attachments`);
    if (!res.ok) throw new Error("Failed to load attachments");
    const data = await res.json();
    setAttachments(data);
    return data;
  }, [id]);

  const loadComments = useCallback(async () => {
    const res = await fetch(`${API}/tasks/${id}/comments`);
    if (!res.ok) throw new Error("Failed to load comments");
    const data = await res.json();
    setComments(data);
    return data;
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setErr("");
      try {
        await loadTask();
      } catch (error) {
        if (!cancelled) {
          setErr(error.message || "Failed to load task data");
          setLoading(false);
        }
        return;
      }

      await Promise.allSettled([
        loadAttachments().catch(
          (error) =>
            !cancelled && console.warn("Attachments failed to load", error)
        ),
        loadComments().catch(
          (error) =>
            !cancelled && console.warn("Comments failed to load", error)
        ),
      ]);

      if (!cancelled) {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadTask, loadAttachments, loadComments]);

  async function saveDescription() {
    setSavingDesc(true);
    setErr("");
    try {
      const headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("taskboard_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/tasks/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ description: desc || null }),
      });

      if (!res.ok) throw new Error("Failed to save description");
      const updated = await res.json();
      setTask(updated);
      setDesc(updated.description || "");
    } catch (error) {
      setErr(error.message || "Unable to update description");
    } finally {
      setSavingDesc(false);
    }
  }

  async function uploadAttachment(e) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API}/tasks/${id}/attachments`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Failed to upload attachment");
      setFile(null);
      await loadAttachments();
    } catch (error) {
      setErr(error.message || "Unable to upload attachment");
    } finally {
      setUploading(false);
    }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API}/tasks/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newComment.trim(),
          author: viewer?.username || "Team Member",
        }),
      });

      if (!res.ok) throw new Error("Failed to add comment");
      setNewComment("");
      await loadComments();
    } catch (error) {
      setErr(error.message || "Unable to add comment");
    } finally {
      setCommentLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-shell">
          <p>Loading task…</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="detail-page">
        <div className="detail-shell">
          <p className="detail-alert-inline">{err || "Task not found"}</p>
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Back to board
          </button>
        </div>
      </div>
    );
  }

  const heroSummary = desc?.trim()
    ? desc.trim()
    : "Add context and expectations so the team knows exactly what success looks like.";

  const stats = [
    { label: "Attachments", value: attachments.length },
    { label: "Updates", value: comments.length },
    { label: "Priority", value: task.priority || "—" },
  ];

  return (
    <div className="detail-page">
      <div className="detail-shell">
        <button className="btn btn-link" onClick={() => navigate(-1)}>
          ← Back to board
        </button>

        {err && (
          <div className="detail-alert-inline" style={{ marginBottom: "1rem" }}>
            {err}
          </div>
        )}

        <section className="detail-hero">
          <div>
            <p className="detail-eyebrow">Task #{task.id}</p>
            <h1>{task.title}</h1>
            <div className="detail-badges">
              {task.status && <Badge type="status" label={task.status} />}
              {task.priority && <Badge type="priority" label={task.priority} />}
            </div>
            <p className="detail-summary">{heroSummary}</p>
          </div>

          <div className="detail-stats">
            {stats.map((stat) => (
              <StatPill
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </div>
        </section>

        <div className="details-layout">
          <div className="details-main">
            <section className="detail-card">
              <header className="detail-card-header">
                <div>
                  <h3>Project context</h3>
                  <p>Document assumptions, risks, and launch notes.</p>
                </div>
              </header>

              <textarea
                className="detail-textarea"
                rows={6}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe desired outcome, definition of done, and key checkpoints."
              />

              <div className="detail-card-actions">
                <span className="detail-hint">Autosave isn’t enabled</span>
                <button
                  className="btn btn-primary"
                  onClick={saveDescription}
                  disabled={savingDesc}
                >
                  {savingDesc ? "Saving…" : "Save"}
                </button>
              </div>
            </section>

            <section className="detail-card">
              <header className="detail-card-header">
                <div>
                  <h3>Attachments</h3>
                  <p>Drop final specs, QA notes, or design mocks.</p>
                </div>
              </header>

              {attachments.length === 0 ? (
                <p className="muted">Nothing uploaded yet.</p>
              ) : (
                <ul className="attachment-list">
                  {attachments.map((att) => (
                    <li key={att.id} className="attachment-item">
                      <div>
                        <strong>{att.filename}</strong>
                        <span>{fmtDateTime(att.uploaded_at)}</span>
                      </div>
                      <a
                        className="btn btn-secondary"
                        href={`${API}/attachments/${att.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <form className="attachment-form" onSubmit={uploadAttachment}>
                <label className="file-field">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? file.name : "Choose file"}
                </label>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!file || uploading}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </form>
            </section>

            <section className="detail-card">
              <header className="detail-card-header">
                <div>
                  <h3>Activity & Comments</h3>
                  <p>Use comments to log QA notes or quick decisions.</p>
                </div>
              </header>

              {comments.length === 0 ? (
                <p className="muted">Be the first to add an update.</p>
              ) : (
                <ul className="comment-list">
                  {comments.map((comment) => (
                    <li key={comment.id} className="comment-item">
                      <div className="comment-avatar">
                        {getInitials(comment.author || "Team")}
                      </div>
                      <div className="comment-body">
                        <div className="comment-meta">
                          <strong>{comment.author || "Anonymous"}</strong>
                          <span>{fmtDateTime(comment.created_at)}</span>
                        </div>
                        <p>{comment.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form className="comment-form" onSubmit={addComment}>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Document learnings, meeting notes, or next steps."
                />
                <div className="detail-card-actions">
                  <span className="detail-hint">
                    Posting as {viewer?.username || "guest"}
                  </span>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={commentLoading || !newComment.trim()}
                  >
                    {commentLoading ? "Posting…" : "Add comment"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <aside className="details-sidebar">
            <section className="sidebar-card">
              <h3>Logistics</h3>
              <DetailRow label="Status" value={task.status} />
              <DetailRow label="Priority" value={task.priority || "—"} />
              <DetailRow
                label="Assigned To"
                value={task.assigned_to || "Unassigned"}
              />
              <DetailRow label="Start Date" value={fmtDate(task.start_date)} />
              <DetailRow label="Target Date" value={fmtDate(task.end_date)} />
            </section>

            <section className="sidebar-card">
              <h3>Progress signals</h3>
              <ul className="timeline-list">
                <li className="timeline-item">
                  <span>Attachments</span>
                  <strong>{attachments.length}</strong>
                </li>
                <li className="timeline-item">
                  <span>Updates logged</span>
                  <strong>{comments.length}</strong>
                </li>
                <li className="timeline-item">
                  <span>Last activity</span>
                  <strong>
                    {comments[0]
                      ? fmtDateTime(comments[0].created_at)
                      : attachments[0]
                      ? fmtDateTime(attachments[0].uploaded_at)
                      : "No activity"}
                  </strong>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function getInitials(name) {
  if (!name) return "TM";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return date;
  }
}

function fmtDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({ label, type }) {
  let bg = "#e5e7eb";
  let color = "#374151";

  if (type === "status") {
    switch (label) {
      case "Under Development":
        bg = "#dbeafe";
        color = "#1d4ed8";
        break;
      case "Code Review":
        bg = "#fef3c7";
        color = "#92400e";
        break;
      case "Development Completed":
        bg = "#dcfce7";
        color = "#166534";
        break;
      case "Investigation":
        bg = "#eef2ff";
        color = "#3730a3";
        break;
      default:
        bg = "#f3f4f6";
        color = "#374151";
    }
  }

  if (type === "priority") {
    switch (label) {
      case "Urgent":
        bg = "#ef4444";
        color = "#fff";
        break;
      case "High":
        bg = "#fff7ed";
        color = "#b45309";
        break;
      case "Medium":
        bg = "#dbeafe";
        color = "#1e40af";
        break;
      case "Low":
        bg = "#f3f4f6";
        color = "#374151";
        break;
      default:
        bg = "#f3f4f6";
        color = "#374151";
    }
  }

  return (
    <span className="detail-badge" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <p>{value || "—"}</p>
    </div>
  );
}
