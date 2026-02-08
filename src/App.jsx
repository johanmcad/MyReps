import { useState, useEffect, useRef, useCallback } from 'react'

// ── Helpers ──────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10)
const STORAGE_KEY = 'workout-sessions-v1'
const fmt = (s) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── SVG Icons ────────────────────────────────────────────
const DumbbellIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <rect x="4" y="18" width="6" height="12" rx="2" fill="#e63946" />
    <rect x="10" y="14" width="5" height="20" rx="2" fill="#e63946" />
    <rect x="33" y="14" width="5" height="20" rx="2" fill="#e63946" />
    <rect x="38" y="18" width="6" height="12" rx="2" fill="#e63946" />
    <rect x="15" y="21" width="18" height="6" rx="1" fill="#e63946" />
  </svg>
)

const BackArrow = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" />
  </svg>
)

const PlayIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

const SkipNext = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
  </svg>
)

const SkipPrev = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
)

const RestartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
)

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
  </svg>
)

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
)

// ── Audio ────────────────────────────────────────────────
const audioCtxRef = { current: null }
function getAudioCtx() {
  if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtxRef.current
}

function beep(count = 1, freq = 520) {
  const ctx = getAudioCtx()
  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = ctx.currentTime + i * 0.25
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.15, t + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.25)
  }
}

// ── Shared Styles ────────────────────────────────────────
const colors = {
  bg: '#0f0f0f',
  card: '#1a1a2e',
  cardBorder: '#2a2a3e',
  accent: '#e63946',
  accentGradient: 'linear-gradient(135deg, #e63946, #ff6b6b)',
  work: '#4ade80',
  rest: '#60a5fa',
  text: '#ffffff',
  textMuted: '#888',
  textDim: '#555',
}

const fontHeading = "'Archivo Black', sans-serif"
const fontBody = "'DM Sans', sans-serif"

// ── Exercise Templates ──────────────────────────────────
const PEXELS = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`

const EXERCISE_TEMPLATES = {
  Glutes: [
    { name: 'Kettlebell Swing', equipment: 'Kettlebell', sets: 4, workDuration: 30, restDuration: 20, imageUrl: PEXELS(2417488) },
    { name: 'Goblet Squat', equipment: 'Kettlebell', sets: 3, workDuration: 40, restDuration: 20, imageUrl: PEXELS(6539865) },
    { name: 'Dumbbell Hip Thrust', equipment: 'Dumbbell', sets: 4, workDuration: 35, restDuration: 20, imageUrl: PEXELS(2774181) },
    { name: 'Dumbbell Glute Bridge', equipment: 'Dumbbell', sets: 3, workDuration: 35, restDuration: 15, imageUrl: PEXELS(416778) },
    { name: 'Kettlebell Single Leg Deadlift', equipment: 'Kettlebell', sets: 3, workDuration: 30, restDuration: 20, imageUrl: PEXELS(416809) },
    { name: 'Dumbbell Step-Up', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 15, imageUrl: PEXELS(4853325) },
  ],
  Quads: [
    { name: 'Dumbbell Front Squat', equipment: 'Dumbbell', sets: 4, workDuration: 35, restDuration: 20, imageUrl: PEXELS(4662333) },
    { name: 'Kettlebell Front Rack Squat', equipment: 'Kettlebell', sets: 3, workDuration: 35, restDuration: 20, imageUrl: PEXELS(4720230) },
    { name: 'Dumbbell Bulgarian Split Squat', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 20, imageUrl: PEXELS(7690849) },
    { name: 'Dumbbell Walking Lunge', equipment: 'Dumbbell', sets: 3, workDuration: 40, restDuration: 20, imageUrl: PEXELS(2011384) },
    { name: 'Kettlebell Goblet Pulse Squat', equipment: 'Kettlebell', sets: 3, workDuration: 30, restDuration: 15, imageUrl: PEXELS(5163854) },
    { name: 'Dumbbell Reverse Lunge', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 15, imageUrl: PEXELS(14604685) },
  ],
  Hamstrings: [
    { name: 'Dumbbell Romanian Deadlift', equipment: 'Dumbbell', sets: 4, workDuration: 35, restDuration: 20, imageUrl: PEXELS(13822300) },
    { name: 'Kettlebell Deadlift', equipment: 'Kettlebell', sets: 4, workDuration: 35, restDuration: 20, imageUrl: PEXELS(14623670) },
    { name: 'Dumbbell Stiff-Leg Deadlift', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 20, imageUrl: PEXELS(4944313) },
    { name: 'Kettlebell Good Morning', equipment: 'Kettlebell', sets: 3, workDuration: 30, restDuration: 15, imageUrl: PEXELS(4164849) },
    { name: 'Dumbbell Single Leg Romanian Deadlift', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 20, imageUrl: PEXELS(2247179) },
  ],
  'Inner Thighs': [
    { name: 'Dumbbell Sumo Squat', equipment: 'Dumbbell', sets: 4, workDuration: 35, restDuration: 20, imageUrl: PEXELS(6551104) },
    { name: 'Kettlebell Sumo Deadlift', equipment: 'Kettlebell', sets: 3, workDuration: 35, restDuration: 20, imageUrl: PEXELS(20379171) },
    { name: 'Dumbbell Cossack Squat', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 20, imageUrl: PEXELS(17898139) },
    { name: 'Kettlebell Lateral Lunge', equipment: 'Kettlebell', sets: 3, workDuration: 30, restDuration: 15, imageUrl: PEXELS(14591541) },
    { name: 'Dumbbell Sumo Squat Pulse', equipment: 'Dumbbell', sets: 3, workDuration: 25, restDuration: 15, imageUrl: PEXELS(16952731) },
    { name: 'Dumbbell Curtsy Lunge', equipment: 'Dumbbell', sets: 3, workDuration: 30, restDuration: 15, imageUrl: PEXELS(18812272) },
  ],
}

const TEMPLATE_CATEGORIES = Object.keys(EXERCISE_TEMPLATES)

const baseBtn = {
  border: 'none',
  cursor: 'pointer',
  fontFamily: fontBody,
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 12,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'opacity .15s, transform .1s',
}

// ── HomeScreen ───────────────────────────────────────────
function HomeScreen({ sessions, onNew, onEdit, onDelete, onPlay }) {
  const totalTime = (session) => {
    return session.exercises.reduce((t, ex) => {
      return t + ex.sets * ex.workDuration + (ex.sets - 1) * ex.restDuration
    }, 0)
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <DumbbellIcon />
        <h1 style={{
          fontFamily: fontHeading,
          fontSize: 32,
          color: colors.accent,
          letterSpacing: 4,
          marginTop: 8,
        }}>MYREPS</h1>
        <p style={{
          fontFamily: fontBody,
          fontSize: 13,
          color: colors.textMuted,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginTop: 4,
        }}>Training Timer</p>
      </div>

      {/* Session Cards */}
      {sessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: colors.textDim,
          fontFamily: fontBody,
          fontSize: 15,
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>&#128170;</p>
          <p>No sessions yet.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Create your first workout below!</p>
        </div>
      )}

      {sessions.map((s) => (
        <div key={s.id} style={{
          background: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{
                fontFamily: fontHeading,
                fontSize: 18,
                color: colors.text,
                marginBottom: 6,
              }}>{s.name}</h3>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: colors.textMuted }}>
                {s.exercises.length} exercise{s.exercises.length !== 1 ? 's' : ''} &middot; ~{fmt(totalTime(s))}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onEdit(s)}
                style={{ ...baseBtn, background: '#2a2a3e', color: colors.textMuted, padding: '8px 10px', borderRadius: 10 }}
              ><EditIcon /></button>
              <button
                onClick={() => { if (window.confirm(`Delete "${s.name}"?`)) onDelete(s.id) }}
                style={{ ...baseBtn, background: '#2a2a3e', color: '#ff6b6b', padding: '8px 10px', borderRadius: 10 }}
              ><TrashIcon /></button>
            </div>
          </div>

          {/* Exercise tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {s.exercises.map((ex) => (
              <span key={ex.id} style={{
                fontFamily: fontBody,
                fontSize: 11,
                color: colors.textMuted,
                background: '#252540',
                padding: '4px 10px',
                borderRadius: 20,
              }}>{ex.name}</span>
            ))}
          </div>

          <button
            onClick={() => onPlay(s)}
            style={{
              ...baseBtn,
              width: '100%',
              marginTop: 16,
              padding: '14px 0',
              background: colors.accentGradient,
              color: '#fff',
              fontSize: 15,
              borderRadius: 12,
              letterSpacing: 1,
            }}
          >Start Workout</button>
        </div>
      ))}

      {/* New Session Button */}
      <button
        onClick={onNew}
        style={{
          ...baseBtn,
          width: '100%',
          padding: '16px 0',
          background: 'transparent',
          color: colors.accent,
          border: `2px dashed ${colors.accent}`,
          fontSize: 15,
          borderRadius: 14,
          marginTop: 8,
        }}
      ><PlusIcon /> New Session</button>
    </div>
  )
}

// ── ExerciseTemplatePicker ───────────────────────────────
function ExerciseTemplatePicker({ onAdd, onClose }) {
  const [category, setCategory] = useState(TEMPLATE_CATEGORIES[0])

  return (
    <div style={{
      background: colors.card,
      border: `1px solid ${colors.accent}40`,
      borderRadius: 14,
      padding: 20,
      marginTop: 10,
    }}>
      {/* Category tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 16,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 4,
      }}>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              ...baseBtn,
              padding: '8px 14px',
              fontSize: 12,
              borderRadius: 20,
              flexShrink: 0,
              background: category === cat ? colors.accent : '#252540',
              color: category === cat ? '#fff' : colors.textMuted,
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Exercise cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {EXERCISE_TEMPLATES[category].map((tmpl) => (
          <div
            key={tmpl.name}
            style={{
              background: '#151525',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ fontFamily: fontBody, fontSize: 14, color: colors.text, fontWeight: 600, marginBottom: 6 }}>{tmpl.name}</p>
              <span style={{
                fontFamily: fontBody,
                fontSize: 11,
                color: tmpl.equipment === 'Kettlebell' ? '#fbbf24' : '#a78bfa',
                background: tmpl.equipment === 'Kettlebell' ? '#fbbf2418' : '#a78bfa18',
                padding: '2px 8px',
                borderRadius: 10,
              }}>{tmpl.equipment}</span>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                {tmpl.sets} sets &middot; {tmpl.workDuration}s work &middot; {tmpl.restDuration}s rest
              </p>
            </div>
            <button
              onClick={() => onAdd(tmpl)}
              style={{
                ...baseBtn,
                padding: '8px 14px',
                background: colors.accentGradient,
                color: '#fff',
                fontSize: 12,
                borderRadius: 10,
                flexShrink: 0,
              }}
            ><PlusIcon /> Add</button>
          </div>
        ))}
      </div>

      {/* Close button */}
      <button onClick={onClose} style={{
        ...baseBtn,
        width: '100%',
        padding: '12px 0',
        background: '#2a2a3e',
        color: colors.textMuted,
        marginTop: 12,
      }}>Close</button>
    </div>
  )
}

// ── BuilderScreen ────────────────────────────────────────
function BuilderScreen({ session, onSave, onBack }) {
  const [name, setName] = useState(session ? session.name : '')
  const [exercises, setExercises] = useState(session ? [...session.exercises] : [])
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [form, setForm] = useState({ name: '', sets: 3, workDuration: 30, restDuration: 15 })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const addExercise = () => {
    if (!form.name.trim()) return
    setExercises([...exercises, { id: uid(), ...form, name: form.name.trim() }])
    setForm({ name: '', sets: 3, workDuration: 30, restDuration: 15 })
    setShowForm(false)
  }

  const addFromTemplate = (tmpl) => {
    setExercises([...exercises, {
      id: uid(),
      name: tmpl.name,
      sets: tmpl.sets,
      workDuration: tmpl.workDuration,
      restDuration: tmpl.restDuration,
      imageUrl: tmpl.imageUrl,
    }])
  }

  const removeExercise = (id) => setExercises(exercises.filter((e) => e.id !== id))

  const startEdit = (ex) => {
    setEditingId(ex.id)
    setEditForm({ name: ex.name, sets: ex.sets, workDuration: ex.workDuration, restDuration: ex.restDuration })
  }

  const saveEdit = () => {
    if (!editForm.name.trim()) return
    setExercises(exercises.map((ex) =>
      ex.id === editingId ? { ...ex, ...editForm, name: editForm.name.trim() } : ex
    ))
    setEditingId(null)
    setEditForm(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const canSave = name.trim() && exercises.length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: session ? session.id : uid(),
      name: name.trim(),
      exercises,
    })
  }

  const inputStyle = {
    fontFamily: fontBody,
    fontSize: 15,
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${colors.cardBorder}`,
    background: '#151525',
    color: colors.text,
    width: '100%',
    outline: 'none',
  }

  const numberInputStyle = {
    ...inputStyle,
    width: 80,
    textAlign: 'center',
    padding: '10px 8px',
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <button onClick={onBack} style={{
        ...baseBtn,
        background: 'transparent',
        color: colors.textMuted,
        padding: '8px 0',
        marginBottom: 16,
        fontSize: 14,
      }}><BackArrow /> Back</button>

      <h2 style={{
        fontFamily: fontHeading,
        fontSize: 22,
        color: colors.text,
        marginBottom: 20,
      }}>{session ? 'Edit Session' : 'New Session'}</h2>

      {/* Session Name */}
      <input
        placeholder="Session name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ ...inputStyle, marginBottom: 24 }}
      />

      {/* Exercises List */}
      <h3 style={{
        fontFamily: fontBody,
        fontSize: 13,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 12,
      }}>Exercises</h3>

      {exercises.map((ex) => (
        <div key={ex.id} style={{
          background: colors.card,
          border: `1px solid ${editingId === ex.id ? colors.accent + '60' : colors.cardBorder}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 10,
        }}>
          {editingId === ex.id ? (
            <div>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                style={{ ...inputStyle, marginBottom: 12 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  ['Sets', 'sets'],
                  ['Work (s)', 'workDuration'],
                  ['Rest (s)', 'restDuration'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label style={{ fontFamily: fontBody, fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>{label}</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: Math.max(1, parseInt(e.target.value) || 1) })}
                      style={numberInputStyle}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={saveEdit} style={{
                  ...baseBtn, flex: 1, padding: '10px 0',
                  background: colors.accentGradient, color: '#fff',
                }}>Save</button>
                <button onClick={cancelEdit} style={{
                  ...baseBtn, flex: 1, padding: '10px 0',
                  background: '#2a2a3e', color: colors.textMuted,
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: fontBody, fontSize: 15, color: colors.text, fontWeight: 600 }}>{ex.name}</p>
                <p style={{ fontFamily: fontBody, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  {ex.sets} sets &middot; {ex.workDuration}s work &middot; {ex.restDuration}s rest
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => startEdit(ex)}
                  style={{ ...baseBtn, background: 'transparent', color: colors.textMuted, padding: 8 }}
                ><EditIcon /></button>
                <button
                  onClick={() => removeExercise(ex.id)}
                  style={{ ...baseBtn, background: 'transparent', color: '#ff6b6b', padding: 8 }}
                ><TrashIcon /></button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Exercise: Template Picker */}
      {showTemplates && (
        <ExerciseTemplatePicker
          onAdd={addFromTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Add Exercise: Custom Form */}
      {showForm && (
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.accent}40`,
          borderRadius: 14,
          padding: 20,
          marginTop: 10,
        }}>
          <input
            placeholder="Exercise name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ ...inputStyle, marginBottom: 16 }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              ['Sets', 'sets'],
              ['Work (s)', 'workDuration'],
              ['Rest (s)', 'restDuration'],
            ].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontFamily: fontBody, fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type="number"
                  min="1"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={numberInputStyle}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addExercise} style={{
              ...baseBtn,
              flex: 1,
              padding: '12px 0',
              background: colors.accentGradient,
              color: '#fff',
            }}>Add</button>
            <button onClick={() => setShowForm(false)} style={{
              ...baseBtn,
              flex: 1,
              padding: '12px 0',
              background: '#2a2a3e',
              color: colors.textMuted,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add Exercise Buttons */}
      {!showForm && !showTemplates && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button onClick={() => { setShowTemplates(true); setShowForm(false) }} style={{
            ...baseBtn,
            flex: 1,
            padding: '14px 0',
            background: 'transparent',
            color: colors.accent,
            border: `1px dashed ${colors.accent}60`,
          }}>Browse Templates</button>
          <button onClick={() => { setShowForm(true); setShowTemplates(false) }} style={{
            ...baseBtn,
            flex: 1,
            padding: '14px 0',
            background: 'transparent',
            color: colors.textMuted,
            border: `1px dashed ${colors.cardBorder}`,
          }}><PlusIcon /> Custom Exercise</button>
        </div>
      )}

      {/* Save Button */}
      <button onClick={handleSave} disabled={!canSave} style={{
        ...baseBtn,
        width: '100%',
        padding: '16px 0',
        background: canSave ? colors.accentGradient : '#2a2a3e',
        color: canSave ? '#fff' : colors.textDim,
        fontSize: 16,
        marginTop: 24,
        borderRadius: 14,
        cursor: canSave ? 'pointer' : 'not-allowed',
      }}>Save Session</button>
    </div>
  )
}

// ── PlayerScreen ─────────────────────────────────────────
function PlayerScreen({ session, onQuit }) {
  const [exIdx, setExIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0)
  const [phase, setPhase] = useState('ready') // ready, work, rest, done
  const [timeLeft, setTimeLeft] = useState(3)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)
  const wakeLockRef = useRef(null)
  const prevTimeRef = useRef(3)
  const stripRef = useRef(null)

  const exercises = session.exercises
  const currentEx = exercises[exIdx]
  const totalSetsAll = exercises.reduce((t, ex) => t + ex.sets, 0)
  const completedSets = exercises.slice(0, exIdx).reduce((t, ex) => t + ex.sets, 0) + setIdx + (phase === 'rest' ? 1 : 0)
  const progress = phase === 'done' ? 100 : Math.round((completedSets / totalSetsAll) * 100)

  const phaseDuration = phase === 'ready' ? 3 : phase === 'work' ? currentEx?.workDuration : phase === 'rest' ? currentEx?.restDuration : 0

  // Wake lock
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch (e) { /* ignore */ }
    }
    requestWakeLock()
    return () => { if (wakeLockRef.current) wakeLockRef.current.release() }
  }, [])

  // Scroll exercise strip
  useEffect(() => {
    if (stripRef.current) {
      const child = stripRef.current.children[exIdx]
      if (child) child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [exIdx])

  // Timer tick
  useEffect(() => {
    if (paused || phase === 'done') {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        // Warning beep at 3 seconds
        if (t === 4) beep(1, 440)
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [paused, phase, exIdx, setIdx])

  // Phase transitions when timer hits 0
  useEffect(() => {
    if (timeLeft !== 0 || paused) return

    if (phase === 'ready') {
      beep(2)
      setPhase('work')
      setTimeLeft(currentEx.workDuration)
    } else if (phase === 'work') {
      // Check if this is the last set of the last exercise
      const isLastSet = setIdx === currentEx.sets - 1
      const isLastExercise = exIdx === exercises.length - 1
      if (isLastSet && isLastExercise) {
        beep(3, 620)
        setPhase('done')
      } else {
        beep(2)
        setPhase('rest')
        setTimeLeft(currentEx.restDuration)
      }
    } else if (phase === 'rest') {
      beep(2)
      const isLastSet = setIdx === currentEx.sets - 1
      if (isLastSet) {
        // Next exercise
        setExIdx(exIdx + 1)
        setSetIdx(0)
      } else {
        setSetIdx(setIdx + 1)
      }
      setPhase('work')
      setTimeLeft(exercises[isLastSet ? exIdx + 1 : exIdx]?.workDuration || 30)
    }
  }, [timeLeft, paused])

  const handlePrev = () => {
    if (exIdx === 0) return
    setExIdx(exIdx - 1)
    setSetIdx(0)
    setPhase('work')
    setTimeLeft(exercises[exIdx - 1].workDuration)
    setPaused(false)
  }

  const handleNext = () => {
    if (exIdx >= exercises.length - 1) {
      beep(3, 620)
      setPhase('done')
      return
    }
    setExIdx(exIdx + 1)
    setSetIdx(0)
    setPhase('work')
    setTimeLeft(exercises[exIdx + 1].workDuration)
    setPaused(false)
  }

  const handleRestart = () => {
    setSetIdx(0)
    setPhase('work')
    setTimeLeft(currentEx.workDuration)
    setPaused(false)
  }

  // Phase color
  const phaseColor = phase === 'work' ? colors.work : phase === 'rest' ? colors.rest : phase === 'ready' ? '#fbbf24' : colors.work

  // SVG ring
  const radius = 108
  const circumference = 2 * Math.PI * radius
  const strokeDash = phaseDuration > 0 ? circumference * (1 - timeLeft / phaseDuration) : 0

  // Last exercise image for done screen
  const lastExImage = exercises[exercises.length - 1]?.imageUrl

  // ── Done Screen ──
  if (phase === 'done') {
    return (
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {lastExImage && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${lastExImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '24px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}>
          <p style={{ fontSize: 72, marginBottom: 16 }}>&#128170;</p>
          <h1 style={{
            fontFamily: fontHeading,
            fontSize: 28,
            color: colors.work,
            letterSpacing: 2,
            marginBottom: 12,
          }}>WORKOUT COMPLETE!</h1>
          <p style={{ fontFamily: fontBody, fontSize: 16, color: colors.text, marginBottom: 4 }}>{session.name}</p>
          <p style={{ fontFamily: fontBody, fontSize: 14, color: colors.textMuted, marginBottom: 40 }}>
            {totalSetsAll} sets &middot; {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
          </p>
          <button onClick={onQuit} style={{
            ...baseBtn,
            padding: '16px 48px',
            background: colors.accentGradient,
            color: '#fff',
            fontSize: 16,
            borderRadius: 14,
          }}>Done</button>
        </div>
      </div>
    )
  }

  // ── Player UI ──
  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background image layer */}
      {currentEx.imageUrl && (
        <div key={currentEx.imageUrl} style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${currentEx.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
      )}
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '0 16px 24px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0 8px',
      }}>
        <button onClick={onQuit} style={{
          ...baseBtn,
          background: 'transparent',
          color: colors.textMuted,
          padding: 0,
          fontSize: 14,
        }}><BackArrow /> Quit</button>
        <span style={{ fontFamily: fontBody, fontSize: 14, color: colors.textMuted, fontWeight: 600 }}>{progress}%</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#1a1a2e', borderRadius: 2, marginBottom: 32 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: phaseColor,
          borderRadius: 2,
          transition: 'width .3s',
        }} />
      </div>

      {/* Phase label */}
      <p style={{
        fontFamily: fontHeading,
        fontSize: 14,
        color: phaseColor,
        textAlign: 'center',
        letterSpacing: 6,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>{phase === 'ready' ? 'GET READY' : phase.toUpperCase()}</p>

      {/* Exercise name */}
      <h2 style={{
        fontFamily: fontHeading,
        fontSize: 24,
        color: colors.text,
        textAlign: 'center',
        marginBottom: 6,
      }}>{currentEx.name}</h2>

      {/* Set counter */}
      <p style={{
        fontFamily: fontBody,
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
      }}>
        {phase !== 'ready' && <>Set {setIdx + 1} of {currentEx.sets} &middot; </>}
        Exercise {exIdx + 1}/{exercises.length}
      </p>

      {/* Timer ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <div style={{ position: 'relative', width: 240, height: 240 }}>
          <svg width="240" height="240" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="120" cy="120" r={radius} stroke="#1a1a2e" strokeWidth="6" fill="none" />
            <circle
              cx="120" cy="120" r={radius}
              stroke={phaseColor}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              style={{ transition: 'stroke-dashoffset .3s linear' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <span style={{
              fontFamily: fontHeading,
              fontSize: 52,
              color: colors.text,
            }}>{fmt(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        marginTop: 24,
        marginBottom: 24,
      }}>
        <button
          onClick={handlePrev}
          disabled={exIdx === 0}
          style={{
            ...baseBtn,
            width: 48, height: 48,
            borderRadius: 24,
            background: '#1a1a2e',
            color: exIdx === 0 ? colors.textDim : colors.text,
            cursor: exIdx === 0 ? 'not-allowed' : 'pointer',
          }}
        ><SkipPrev /></button>

        <button onClick={handleRestart} style={{
          ...baseBtn,
          width: 48, height: 48,
          borderRadius: 24,
          background: '#1a1a2e',
          color: '#fb923c',
        }}><RestartIcon /></button>

        <button onClick={() => setPaused(!paused)} style={{
          ...baseBtn,
          width: 64, height: 64,
          borderRadius: 32,
          background: phaseColor,
          color: '#111',
        }}>{paused ? <PlayIcon /> : <PauseIcon />}</button>

        <button onClick={handleNext} style={{
          ...baseBtn,
          width: 48, height: 48,
          borderRadius: 24,
          background: '#1a1a2e',
          color: colors.text,
        }}><SkipNext /></button>
      </div>

      {/* Exercise strip */}
      <div ref={stripRef} style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        scrollbarWidth: 'none',
      }}>
        {exercises.map((ex, i) => (
          <div key={ex.id} style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 10,
            background: i === exIdx ? `${phaseColor}22` : '#1a1a2e',
            border: i === exIdx ? `1px solid ${phaseColor}` : '1px solid transparent',
            fontFamily: fontBody,
            fontSize: 12,
            color: i === exIdx ? phaseColor : colors.textMuted,
            whiteSpace: 'nowrap',
          }}>{ex.name}</div>
        ))}
      </div>
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home')
  const [sessions, setSessions] = useState(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch { return [] }
  })
  const [editSession, setEditSession] = useState(null)
  const [playSession, setPlaySession] = useState(null)

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Sans:wght@400;500;600;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [])

  // Save sessions to localStorage (skip initial mount)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const handleNewSession = () => {
    setEditSession(null)
    setScreen('build')
  }

  const handleEditSession = (s) => {
    setEditSession(s)
    setScreen('build')
  }

  const handleDeleteSession = (id) => {
    setSessions(sessions.filter((s) => s.id !== id))
  }

  const handleSaveSession = (session) => {
    if (editSession) {
      setSessions(sessions.map((s) => (s.id === session.id ? session : s)))
    } else {
      setSessions([...sessions, session])
    }
    setScreen('home')
  }

  const handlePlaySession = (s) => {
    setPlaySession(s)
    setScreen('play')
  }

  const handleQuit = () => {
    setPlaySession(null)
    setScreen('home')
  }

  if (screen === 'build') {
    return <BuilderScreen session={editSession} onSave={handleSaveSession} onBack={() => setScreen('home')} />
  }

  if (screen === 'play' && playSession) {
    return <PlayerScreen session={playSession} onQuit={handleQuit} />
  }

  return (
    <HomeScreen
      sessions={sessions}
      onNew={handleNewSession}
      onEdit={handleEditSession}
      onDelete={handleDeleteSession}
      onPlay={handlePlaySession}
    />
  )
}
