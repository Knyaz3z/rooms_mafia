import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../App'
import { QRCodeSVG } from 'qrcode.react'

const AVATARS = ['🙂', '😎', '😈', '🤡', '👽', '🤖', '🎭', '🦊', '🐼', '🦁', '🦄', '🐸', '🐯', '🦅', '🐙']

export default function Room() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isHost, setIsHost] = useState(false)
  
  const [joinData, setJoinData] = useState({ name: '', avatar: '' })
  const [joined, setJoined] = useState(false)
  
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayer, setNewPlayer] = useState({ name: '', avatar: '' })
  
  const [editingScores, setEditingScores] = useState(false)
  const [scores, setScores] = useState({})
  const [round, setRound] = useState(1)
  
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    fetchRoom()
  }, [code])

  useEffect(() => {
    if (joined || isHost) {
      const newSocket = io(window.location.origin, {
        transports: ['websocket', 'polling']
      })
      
      newSocket.on('connect', () => {
        if (isHost) {
          newSocket.emit('host-join', { roomCode: code, hostId: user.id })
        } else {
          newSocket.emit('join-room', { roomCode: code, playerName: joinData.name })
        }
      })

      newSocket.on('room-state', (data) => {
        setPlayers(data.players)
        if (data.room) {
          setRoom(prev => prev ? { ...prev, ...data.room } : data.room)
        }
      })

      newSocket.on('scores-updated', (data) => {
        setPlayers(data.players)
        setEditingScores(false)
        setScores({})
      })

      newSocket.on('player-joined', (data) => {
        fetchRoom()
      })

      newSocket.on('error', (data) => {
        setError(data.message)
      })

      setSocket(newSocket)

      return () => newSocket.close()
    }
  }, [joined, isHost])

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error)
      }
      
      setRoom(data)
      setPlayers(data.players)
      setIsHost(user && data.host.id === user.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async (e) => {
    e.preventDefault()
    
    try {
      const res = await fetch(`/api/players/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setJoined(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const addPlayer = async (e) => {
    e.preventDefault()
    
    try {
      await fetch(`/api/players/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayer)
      })
      
      setShowAddPlayer(false)
      setNewPlayer({ name: '', avatar: '' })
      fetchRoom()
    } catch (err) {
      alert(err.message)
    }
  }

  const deletePlayer = async (playerId) => {
    if (!confirm('Удалить игрока?')) return
    
    try {
      await fetch(`/api/players/${playerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      fetchRoom()
    } catch (err) {
      alert('Ошибка')
    }
  }

  const publishScores = () => {
    if (socket) {
      socket.emit('update-scores', { roomCode: code, scores, round: parseInt(round) })
    }
  }

  const updateStatus = async (status) => {
    try {
      await fetch(`/api/rooms/${room.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      })
      fetchRoom()
    } catch (err) {
      alert('Ошибка')
    }
  }

  if (loading) {
    return <div className="container">Загрузка...</div>
  }

  if (error) {
    return <div className="container" style={{ color: 'var(--danger)' }}>{error}</div>
  }

  if (!room) {
    return <div className="container">Комната не найдена</div>
  }

  if (!joined && !isHost) {
    return (
      <div className="container" style={{ maxWidth: 400, paddingTop: 40 }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: 16 }}>{room.name}</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 20 }}>
            {new Date(room.gameDate).toLocaleDateString('ru')}
          </p>
          
          <form onSubmit={joinRoom}>
            <div className="form-group">
              <label>Ваше имя</label>
              <input
                value={joinData.name}
                onChange={e => setJoinData({ ...joinData, name: e.target.value })}
                required
              />
            </div>
            
            <label>Выберите аватар</label>
            <div className="avatar-grid">
              {AVATARS.map(avatar => (
                <div
                  key={avatar}
                  className={`avatar-option ${joinData.avatar === avatar ? 'selected' : ''}`}
                  onClick={() => setJoinData({ ...joinData, avatar })}
                >
                  {avatar}
                </div>
              ))}
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!joinData.name || !joinData.avatar}>
              Войти в комнату
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>{room.name}</h1>
          <span style={{ color: 'var(--text-secondary)' }}>
            {new Date(room.gameDate).toLocaleDateString('ru')}
          </span>
        </div>
        {!isHost && <button onClick={() => navigate('/')} className="btn btn-secondary">На главную</button>}
        {isHost && (
          <div style={{ display: 'flex', gap: 12 }}>
            <select 
              value={room.status} 
              onChange={e => updateStatus(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="WAITING">Ожидание</option>
              <option value="IN_PROGRESS">Игра</option>
              <option value="FINISHED">Завершена</option>
            </select>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">Назад</button>
          </div>
        )}
      </div>

      {isHost && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Приглашение</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Код комнаты</div>
              <div className="room-code" style={{ margin: 0, fontSize: 32, letterSpacing: 4 }}>{room.code}</div>
            </div>
            <div className="qr-container">
              <QRCodeSVG value={`${window.location.origin}/room/${room.code}`} size={120} />
            </div>
          </div>
        </div>
      )}

      {isHost && (
        <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
          <button onClick={() => setShowAddPlayer(true)} className="btn btn-primary">
            + Добавить игрока
          </button>
          <button 
            onClick={() => setEditingScores(true)} 
            className="btn btn-secondary"
            disabled={players.length === 0}
          >
            Начислить баллы
          </button>
        </div>
      )}

      <h3 style={{ marginBottom: 16 }}>Рейтинг игроков</h3>

      <div className="players-list">
        {players.map((player, index) => (
          <div key={player.id} className="player-item">
            <span className={`rank rank-${index + 1}`}>{index + 1}</span>
            <span className="avatar">{player.avatar}</span>
            <span className="name">{player.name}</span>
            <span className="score">{player.score} pts</span>
            {isHost && (
              <button onClick={() => deletePlayer(player.id)} className="btn btn-danger" style={{ padding: '8px 12px' }}>
                ×
              </button>
            )}
          </div>
        ))}
        
        {players.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
            Нет игроков в комнате
          </p>
        )}
      </div>

      {showAddPlayer && (
        <div className="modal-overlay" onClick={() => setShowAddPlayer(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Добавить игрока</h2>
            <form onSubmit={addPlayer}>
              <div className="form-group">
                <label>Имя</label>
                <input
                  value={newPlayer.name}
                  onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  required
                />
              </div>
              <label>Аватар</label>
              <div className="avatar-grid">
                {AVATARS.map(avatar => (
                  <div
                    key={avatar}
                    className={`avatar-option ${newPlayer.avatar === avatar ? 'selected' : ''}`}
                    onClick={() => setNewPlayer({ ...newPlayer, avatar })}
                  >
                    {avatar}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setShowAddPlayer(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!newPlayer.name || !newPlayer.avatar}>
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingScores && (
        <div className="modal-overlay" onClick={() => setEditingScores(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>Начислить баллы</h2>
            
            <div className="form-group">
              <label>Номер раунда</label>
              <input
                type="number"
                value={round}
                onChange={e => setRound(e.target.value)}
                min={1}
                style={{ width: 100 }}
              />
            </div>

            <div className="players-list" style={{ marginBottom: 16 }}>
              {players.map(player => (
                <div key={player.id} className="player-item">
                  <span className="avatar">{player.avatar}</span>
                  <span className="name">{player.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Текущие: {player.score}</span>
                  <input
                    type="number"
                    className="score-input"
                    placeholder="+баллы"
                    value={scores[player.id] || ''}
                    onChange={e => setScores({ ...scores, [player.id]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setEditingScores(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Отмена
              </button>
              <button onClick={publishScores} className="btn btn-primary" style={{ flex: 1 }}>
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}