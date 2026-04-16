import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

const AVATARS = ['🙂', '😎', '😈', '🤡', '👽', '🤖', '🎭', '🦊', '🐼', '🦁', '🦄', '🐸', '🐯', '🦅', '🐙']

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [rooms, setRooms] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', gameDate: '' })
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRooms(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async (e) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setShowCreate(false)
      setForm({ name: '', gameDate: '' })
      fetchRooms()
      navigate(`/room/${data.code}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteRoom = async (roomId) => {
    if (!confirm('Удалить комнату?')) return

    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      fetchRooms()
    } catch (err) {
      alert('Ошибка при удалении')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      WAITING: { label: 'Ожидание', color: '#f39c12' },
      IN_PROGRESS: { label: 'Игра', color: '#27ae60' },
      FINISHED: { label: 'Завершена', color: '#95a5a6' }
    }
    const s = styles[status]
    return <span style={{ 
      padding: '4px 8px', 
      borderRadius: 4, 
      background: s.color, 
      color: '#fff',
      fontSize: 12 
    }}>{s.label}</span>
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Mafia Fix</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>{user.name}</span>
          <button onClick={logout} className="btn btn-secondary">Выход</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          + Создать комнату
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Создать комнату</h2>
            <form onSubmit={createRoom}>
              <div className="form-group">
                <label>Название игры</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Турнир по мафии"
                  required
                />
              </div>
              <div className="form-group">
                <label>Дата игры</label>
                <input
                  type="date"
                  value={form.gameDate}
                  onChange={e => setForm({ ...form, gameDate: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
                  {creating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: 16 }}>Мои комнаты</h2>

      {loading ? (
        <p>Загрузка...</p>
      ) : rooms.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Нет комнат. Создайте первую!</p>
      ) : (
        <div className="players-list">
          {rooms.map(room => (
            <div key={room.id} className="player-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>{room.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  {new Date(room.gameDate).toLocaleDateString('ru')} • Код: {room.code}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {getStatusBadge(room.status)}
                <span style={{ color: 'var(--text-secondary)' }}>{room.players.length} игроков</span>
                <button onClick={() => navigate(`/room/${room.code}`)} className="btn btn-primary">
                  Открыть
                </button>
                <button onClick={() => deleteRoom(room.id)} className="btn btn-danger">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}