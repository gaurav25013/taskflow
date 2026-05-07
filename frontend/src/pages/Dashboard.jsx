import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { FolderKanban, CheckSquare, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { format, isAfter, parseISO } from 'date-fns'

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
const PRIORITY_COLORS = { low: 'var(--text-3)', medium: 'var(--blue)', high: 'var(--orange)', urgent: 'var(--red)' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading dashboard…</span></div>
  if (!data) return null

  const { stats, recentTasks, overdueTasks, projectStats } = data

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Good {greeting()}, {user.name.split(' ')[0]} 👋</div>
          <div className="page-subtitle">Here's what's happening across your projects.</div>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon={<FolderKanban size={20} />} number={stats.projects} label="Projects" color="var(--accent)" />
          <StatCard icon={<CheckSquare size={20} />} number={stats.tasks?.total || 0} label="Total Tasks" color="var(--blue)" />
          <StatCard icon={<TrendingUp size={20} />} number={stats.tasks?.in_progress || 0} label="In Progress" color="var(--yellow)" />
          <StatCard icon={<Clock size={20} />} number={stats.tasks?.done || 0} label="Completed" color="var(--green)" />
          <StatCard icon={<AlertTriangle size={20} />} number={stats.tasks?.overdue || 0} label="Overdue" color="var(--red)" />
        </div>

        <div className="grid-2">
          {/* Recent Tasks */}
          <div>
            <div className="section-header">
              <div className="section-title">Recent Tasks</div>
            </div>
            {recentTasks.length === 0
              ? <EmptyState message="No tasks yet" />
              : recentTasks.map(task => (
                <div key={task.id} className="task-item"
                  onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}>
                  <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  <span className={`task-title${task.status === 'done' ? ' done' : ''}`}>{task.title}</span>
                  <span style={{ fontSize: '0.75rem', color: PRIORITY_COLORS[task.priority], flexShrink: 0 }}>
                    {task.priority}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', flexShrink: 0 }}>{task.project_name}</span>
                </div>
              ))
            }
          </div>

          <div>
            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="section-header">
                  <div className="section-title" style={{ color: 'var(--red)' }}>⚠ Overdue Tasks</div>
                </div>
                {overdueTasks.map(task => (
                  <div key={task.id} className="task-item" style={{ borderColor: 'rgba(231,76,60,0.3)' }}
                    onClick={() => navigate(`/projects/${task.project_id}/tasks/${task.id}`)}>
                    <span className="task-title">{task.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--red)', flexShrink: 0 }}>
                      {task.due_date && format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Project Progress */}
            <div className="section-header">
              <div className="section-title">Project Progress</div>
            </div>
            {projectStats.length === 0
              ? <EmptyState message="No projects yet" />
              : projectStats.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0
                return (
                  <div key={p.id} className="card" style={{ marginBottom: 10, padding: '14px 16px', cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${p.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                        {p.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{pct}%</span>
                    </div>
                    <div className="project-progress">
                      <div className="project-progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.done_tasks}/{p.total_tasks} tasks done</div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ icon, number, label, color }) {
  return (
    <div className="stat-card" style={{ '--accent': color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function EmptyState({ message }) {
  return <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', padding: '16px 0' }}>{message}</div>
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
