import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Plus, X, Trash2, UserPlus, ArrowLeft } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tasks')
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' })
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editTask, setEditTask] = useState(null)

  const loadProject = useCallback(() =>
    axios.get(`/api/projects/${id}`).then(r => setProject(r.data)), [id])

  const loadTasks = useCallback(() => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.search) params.search = filters.search
    return axios.get(`/api/projects/${id}/tasks`, { params }).then(r => setTasks(r.data))
  }, [id, filters])

  useEffect(() => {
    Promise.all([loadProject(), loadTasks()]).finally(() => setLoading(false))
  }, [loadProject, loadTasks])

  const isAdmin = project?.my_role === 'admin' || user?.role === 'admin'

  const deleteTask = async (taskId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this task?')) return
    await axios.delete(`/api/projects/${id}/tasks/${taskId}`)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return
    await axios.delete(`/api/projects/${id}/members/${userId}`)
    loadProject()
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!project) return <div className="page-body"><div className="alert alert-error">Project not found</div></div>

  const tasksByStatus = ['todo', 'in_progress', 'review', 'done'].reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {})

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-icon btn-ghost" onClick={() => navigate('/projects')}><ArrowLeft size={16} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: project.color, display: 'inline-block' }} />
              <div className="page-title">{project.name}</div>
            </div>
            {project.description && <div className="page-subtitle">{project.description}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button className="btn btn-ghost" onClick={() => setShowMemberModal(true)}>
              <UserPlus size={16} /> Add Member
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowTaskModal(true) }}>
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab${tab === 'tasks' ? ' active' : ''}`} onClick={() => setTab('tasks')}>
            Tasks ({tasks.length})
          </button>
          <button className={`tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>
            Members ({project.members?.length || 0})
          </button>
          <button className={`tab${tab === 'board' ? ' active' : ''}`} onClick={() => setTab('board')}>
            Board
          </button>
        </div>

        {tab === 'tasks' && (
          <>
            <div className="filters-bar">
              <input className="search-input" placeholder="Search tasks…"
                value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
              <select className="filter-select" value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Status</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="filter-select" value={filters.priority}
                onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
                <option value="">All Priority</option>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {tasks.length === 0
              ? <div className="empty-state"><h3>No tasks found</h3><p>Create your first task or adjust filters.</p></div>
              : tasks.map(task => (
                <TaskRow key={task.id} task={task} projectId={id}
                  onDelete={(e) => deleteTask(task.id, e)}
                  onClick={() => navigate(`/projects/${id}/tasks/${task.id}`)}
                  canDelete={isAdmin || task.created_by === user.id}
                />
              ))
            }
          </>
        )}

        {tab === 'board' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, overflowX: 'auto' }}>
            {['todo', 'in_progress', 'review', 'done'].map(status => (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{tasksByStatus[status].length}</span>
                </div>
                {tasksByStatus[status].map(task => (
                  <div key={task.id} className="card" style={{ marginBottom: 10, padding: '14px', cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${id}/tasks/${task.id}`)}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>{task.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.due_date && (
                        <span style={{ fontSize: '0.7rem', color: isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'var(--red)' : 'var(--text-3)' }}>
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    {task.assignee_name && (
                      <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                        → {task.assignee_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="members-list">
            {project.members?.map(m => (
              <div key={m.id} className="member-item">
                <div className="member-avatar">{m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{m.email}</div>
                </div>
                <span className={`badge badge-${m.project_role}`}>{m.project_role}</span>
                {isAdmin && m.id !== user.id && (
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeMember(m.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showTaskModal && (
        <TaskModal projectId={id} members={project.members} task={editTask}
          onClose={() => setShowTaskModal(false)}
          onSave={() => { setShowTaskModal(false); window.location.reload(); }} />
      )}

      {showMemberModal && (
        <AddMemberModal projectId={id}
          onClose={() => setShowMemberModal(false)}
          onAdd={() => { setShowMemberModal(false); loadProject() }} />
      )}
    </>
  )
}

function TaskRow({ task, onClick, onDelete, canDelete }) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'
  return (
    <div className="task-item" onClick={onClick}>
      <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
      <span className={`task-title${task.status === 'done' ? ' done' : ''}`}>{task.title}</span>
      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
      {task.assignee_name && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>→ {task.assignee_name}</span>
      )}
      {task.due_date && (
        <span style={{ fontSize: '0.75rem', color: overdue ? 'var(--red)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>
          {overdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d')}
        </span>
      )}
      {canDelete && (
        <button className="btn btn-icon btn-ghost btn-sm" onClick={onDelete} style={{ opacity: 0.5 }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function TaskModal({ projectId, members, task, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    status: task?.status || 'todo', priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '', due_date: task?.due_date || ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null }
      if (task) await axios.put(`/api/projects/${projectId}/tasks/${task.id}`, payload)
      else await axios.post(`/api/projects/${projectId}/tasks`, payload)
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save task')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{task ? 'Edit Task' : 'New Task'}</div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Task title" value={form.title}
              onChange={e => set('title', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Details…" value={form.description}
              onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
                <option value="">Unassigned</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due_date}
                onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`/api/projects/${projectId}/members`, { email, role })
      onAdd()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div className="modal-title">Add Member</div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="teammate@example.com"
              value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
          </div>
          <div className="form-group">
            <label className="form-label">Project Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
