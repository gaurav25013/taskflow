import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus, Users, CheckSquare, X } from 'lucide-react'

const COLORS = ['#7c6aff','#e74c3c','#2ecc71','#f1c40f','#3498db','#e67e22','#9b59b6','#1abc9c','#e91e63','#00bcd4']

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const load = () => axios.get('/api/projects').then(r => setProjects(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const onCreate = (p) => { setProjects(prev => [p, ...prev]); setShowCreate(false) }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <h3>No projects yet</h3>
            <p>Create your first project to get started.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={onCreate} />}
    </>
  )
}

function ProjectCard({ project: p, onClick }) {
  const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0
  return (
    <div className="project-card" style={{ '--project-color': p.color }} onClick={onClick}>
      <div className="project-card-name">{p.name}</div>
      <div className="project-card-desc">{p.description || 'No description'}</div>
      <div className="project-progress">
        <div className="project-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="project-meta">
        <span className="project-meta-item"><CheckSquare size={12} /> {p.done_count}/{p.task_count} tasks</span>
        <span className="project-meta-item"><Users size={12} /> {p.member_count} members</span>
        <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
      </div>
    </div>
  )
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#7c6aff' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Project name is required'); return }
    setSaving(true)
    try {
      const r = await axios.post('/api/projects', form)
      onCreate(r.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">New Project</div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="What's this project about?" value={form.description}
              onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => set('color', c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    outline: form.color === c ? `3px solid white` : '3px solid transparent',
                    outlineOffset: 2
                  }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
