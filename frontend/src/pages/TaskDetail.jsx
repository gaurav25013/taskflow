import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Edit2, Trash2, Send } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function TaskDetail() {
  const { projectId, taskId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [members, setMembers] = useState([])

  useEffect(() => {
    Promise.all([
      axios.get(`/api/projects/${projectId}/tasks/${taskId}`),
      axios.get(`/api/projects/${projectId}`)
    ]).then(([taskRes, projRes]) => {
      setTask(taskRes.data)
      setProject(projRes.data)
      setMembers(projRes.data.members || [])
      setEditForm({
        title: taskRes.data.title, description: taskRes.data.description || '',
        status: taskRes.data.status, priority: taskRes.data.priority,
        assignee_id: taskRes.data.assignee_id || '', due_date: taskRes.data.due_date || ''
      })
    }).finally(() => setLoading(false))
  }, [projectId, taskId])

  const isAdmin = project?.my_role === 'admin' || user?.role === 'admin'
  const canEdit = isAdmin || task?.created_by === user?.id || task?.assignee_id === user?.id

  const saveEdit = async () => {
    const r = await axios.put(`/api/projects/${projectId}/tasks/${taskId}`, {
      ...editForm,
      assignee_id: editForm.assignee_id || null,
      due_date: editForm.due_date || null
    })
    setTask(prev => ({ ...prev, ...r.data }))
    setEditing(false)
  }

  const deleteTask = async () => {
    if (!confirm('Delete this task permanently?')) return
    await axios.delete(`/api/projects/${projectId}/tasks/${taskId}`)
    navigate(`/projects/${projectId}`)
  }

  const postComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const r = await axios.post(`/api/projects/${projectId}/tasks/${taskId}/comments`, { content: comment })
      setTask(prev => ({ ...prev, comments: [...(prev.comments || []), r.data] }))
      setComment('')
    } finally { setPosting(false) }
  }

  const updateStatus = async (status) => {
    const r = await axios.put(`/api/projects/${projectId}/tasks/${taskId}`, { status })
    setTask(prev => ({ ...prev, ...r.data }))
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!task) return <div className="page-body"><div className="alert alert-error">Task not found</div></div>

  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-ghost" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 2 }}>{project?.name}</div>
            <div className="page-title" style={{ fontSize: '1.4rem' }}>{task.title}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit && <button className="btn btn-ghost" onClick={() => setEditing(!editing)}><Edit2 size={15} /> Edit</button>}
          {(isAdmin || task.created_by === user.id) && (
            <button className="btn btn-danger" onClick={deleteTask}><Trash2 size={15} /> Delete</button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Main */}
          <div>
            {editing ? (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={editForm.description} rows={4}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select className="form-select" value={editForm.assignee_id} onChange={e => setEditForm(f => ({ ...f, assignee_id: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={editForm.due_date}
                      onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>DESCRIPTION</div>
                  {task.description
                    ? <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: '0.9rem' }}>{task.description}</p>
                    : <p style={{ color: 'var(--text-3)', fontStyle: 'italic', fontSize: '0.875rem' }}>No description provided.</p>
                  }
                </div>

                {/* Quick status update */}
                <div className="divider" />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 8 }}>QUICK STATUS UPDATE</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <button key={v} className={`badge badge-${v}`}
                      style={{ cursor: 'pointer', border: task.status === v ? '1px solid currentColor' : '1px solid transparent', padding: '5px 12px' }}
                      onClick={() => updateStatus(v)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 16 }}>Comments ({task.comments?.length || 0})</div>
              {task.comments?.length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 16 }}>No comments yet.</div>
              )}
              {task.comments?.map(c => (
                <div key={c.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div className="member-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                      {c.user_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <strong style={{ fontSize: '0.85rem' }}>{c.user_name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {format(parseISO(c.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, paddingLeft: 36 }}>{c.content}</p>
                </div>
              ))}

              <form onSubmit={postComment} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input className="form-input" placeholder="Add a comment…" value={comment}
                  onChange={e => setComment(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={posting || !comment.trim()}>
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar info */}
          <div>
            <div className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <InfoRow label="Status"><span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span></InfoRow>
                <InfoRow label="Priority"><span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></InfoRow>
                <InfoRow label="Assignee">
                  {task.assignee_name
                    ? <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{task.assignee_name}</span>
                    : <span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Unassigned</span>
                  }
                </InfoRow>
                <InfoRow label="Created By">
                  <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{task.created_by_name}</span>
                </InfoRow>
                <InfoRow label="Due Date">
                  {task.due_date
                    ? <span style={{ fontSize: '0.875rem', color: overdue ? 'var(--red)' : 'var(--text)' }}>
                        {overdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </span>
                    : <span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>No due date</span>
                  }
                </InfoRow>
                <InfoRow label="Created">
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                    {format(parseISO(task.created_at), 'MMM d, yyyy')}
                  </span>
                </InfoRow>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}
