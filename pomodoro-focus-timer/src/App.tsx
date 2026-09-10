import { useEffect, useMemo, useRef, useState } from 'react';
import { usePomodoro } from './hooks/usePomodoro';
import {
  LIMITS,
  positionInCycle,
  validateSettingValue,
  type Phase,
  type SettingsKey,
} from './lib/pomodoro';
import { playChime, unlockAudio } from './lib/sound';

/* SOBA-23 — Cinematic Focus Dashboard (approved spec SOBA-22).
   DOM/CSS/structure only. Timer engine (usePomodoro, lib/pomodoro,
   lib/sound APIs) is used as-is; no engine logic lives here. */

const PHASE_OPTIONS: Array<{ value: Phase; label: string }> = [
  { value: 'work', label: 'Focus' },
  { value: 'short-break', label: 'Short Break' },
  { value: 'long-break', label: 'Long Break' },
];

const QUOTES = [
  'Deep work is a superpower in a distracted world.',
  'Starve your distractions, feed your focus.',
  'One pomodoro at a time.',
  'Attention is the rarest form of generosity.',
  'What gets scheduled gets done.',
  'Small sessions, compounded daily.',
  'Stay with the hard part a little longer.',
  'Calm mind, sharp focus.',
];

const FOCUS_PLACEHOLDER = 'What are you focusing on?';

const SETTING_FIELDS: Array<{
  key: SettingsKey;
  label: string;
  suffix: string | null;
  inputId: string;
}> = [
  { key: 'workMinutes', label: 'Work duration', suffix: 'min', inputId: 'setting-work' },
  { key: 'shortBreakMinutes', label: 'Short break', suffix: 'min', inputId: 'setting-short' },
  { key: 'longBreakMinutes', label: 'Long break', suffix: 'min', inputId: 'setting-long' },
  {
    key: 'pomodorosBeforeLongBreak',
    label: 'Pomodoros before long break',
    suffix: 'sessions',
    inputId: 'setting-count',
  },
];

interface Mote {
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
}

function useMotes(): Mote[] {
  return useMemo(() => {
    // Deterministic pseudo-random layout (index-hashed) — stable across renders.
    const rand = (i: number, salt: number) => {
      const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 24 }, (_, i) => ({
      left: `${Math.round(rand(i, 1) * 100)}%`,
      top: `${Math.round(30 + rand(i, 2) * 70)}%`,
      size: 2 + Math.round(rand(i, 3) * 2),
      duration: `${40 + Math.round(rand(i, 4) * 50)}s`,
      delay: `-${Math.round(rand(i, 5) * 80)}s`,
    }));
  }, []);
}

export default function App() {
  const {
    settings,
    soundOn,
    completedWork,
    phase,
    status,
    display,
    progress,
    announcement,
    settingsNote,
    isIdle,
    actions,
  } = usePomodoro();

  const primaryLabel =
    status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';
  const primaryAction = status === 'running' ? actions.pause : actions.start;

  // --- Local-only presentation state (spec-allowed) ---
  const [focusText, setFocusText] = useState('');
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState('');
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<HTMLDivElement | null>(null);
  const motes = useMotes();

  // Quote rotation: advance on phase change + every 10 minutes.
  useEffect(() => {
    setQuoteIdx((i) => (i + 1) % QUOTES.length);
  }, [phase]);
  useEffect(() => {
    const id = window.setInterval(
      () => setQuoteIdx((i) => (i + 1) % QUOTES.length),
      10 * 60 * 1000,
    );
    return () => window.clearInterval(id);
  }, []);

  // Fullscreen state mirror.
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      } else {
        void document.documentElement.requestFullscreen().catch(() => undefined);
      }
    } catch {
      // Fullscreen unavailable — safe no-op.
    }
  };

  // Keyboard shortcuts: Space = Start/Pause/Resume, R = Reset, S = Skip.
  // Ignored while typing in inputs (extends to prompt + drawer inputs);
  // native button activation is not hijacked.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space') {
        if (target && target.tagName === 'BUTTON') return;
        e.preventDefault();
        (status === 'running' ? actions.pause : actions.start)();
      } else if (e.code === 'KeyR') {
        actions.reset();
      } else if (e.code === 'KeyS') {
        actions.skip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, actions]);

  const n = settings.pomodorosBeforeLongBreak;
  const position = positionInCycle(completedWork, n);
  const filledDots = completedWork % n;

  const [mm, ss] = display.split(':');

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => {
    setDrawerOpen(false);
    // Focus return to trigger (§10).
    settingsTriggerRef.current?.focus();
  };

  const focusHero = () => {
    timerRef.current?.scrollIntoView({ block: 'center' });
    timerRef.current?.focus({ preventScroll: true });
  };

  const commitFocus = () => {
    const trimmed = focusDraft.trim().slice(0, 80);
    setFocusText(trimmed);
    setEditingFocus(false);
  };
  const cancelFocus = () => {
    setEditingFocus(false);
  };

  return (
    <div className="stage" data-phase={phase}>
      {/* Environment layers (§2) */}
      <div className="env-l0" aria-hidden="true" />
      <div className="env-l1" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {/* Bookshelf silhouettes, left + right edges */}
          <g fill="#0b0705">
            <rect x="0" y="120" width="150" height="780" rx="8" />
            <rect x="1290" y="120" width="150" height="780" rx="8" />
          </g>
          <g fill="#2b1d10" opacity="0.8">
            {Array.from({ length: 8 }, (_, i) => (
              <g key={`l${i}`}>
                <rect x={12 + i * 16} y={140 + (i % 3) * 40} width={10} height={220 - (i % 3) * 30} rx="2" />
                <rect x={1302 + i * 16} y={160 + (i % 2) * 60} width={10} height={200 - (i % 2) * 40} rx="2" />
              </g>
            ))}
          </g>
          {/* Arched window glow, center-top */}
          <ellipse className="breathe" cx="720" cy="60" rx="260" ry="220" fill="#e8b26a" opacity="0.2" />
          <ellipse cx="720" cy="40" rx="130" ry="120" fill="#f0c078" opacity="0.16" />
          {/* Fireplace glow, lower-right */}
          <ellipse className="breathe" cx="1150" cy="760" rx="220" ry="160" fill="#d6783c" opacity="0.16" />
        </svg>
      </div>
      <div className="env-l2" aria-hidden="true">
        <div className="grain" />
        {motes.map((m, i) => (
          <span
            key={i}
            className="mote"
            style={{
              left: m.left,
              top: m.top,
              width: m.size,
              height: m.size,
              animationDuration: m.duration,
              animationDelay: m.delay,
            }}
          />
        ))}
      </div>
      {/* L3 readability overlays (mandatory) + phase tint */}
      <div className="readability" aria-hidden="true" />
      <div className="phase-tint" aria-hidden="true" />

      {/* UI layer */}
      <div className="ui">
        <header className="topbar">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
              <defs>
                <linearGradient id="brand-amber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f0c078" />
                  <stop offset="1" stopColor="#b9743c" />
                </linearGradient>
              </defs>
              <path
                d="M7 3h14c.6 0 1 .4 1 1 0 4.5-3.6 7.2-5.6 9-.6.6-.6 1.4 0 2 2 1.8 5.6 4.5 5.6 9 0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1 0-4.5 3.6-7.2 5.6-9 .6-.6.6-1.4 0-2-2-1.8-5.6-4.5-5.6-9 0-.6.4-1 1-1z"
                fill="none"
                stroke="url(#brand-amber)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="14" cy="17.5" r="1.6" fill="url(#brand-amber)" />
            </svg>
            <span className="brand-text">
              <span className="brand-name">Pomodoro</span>
              <span className="brand-sub">FOCUS TIMER</span>
            </span>
          </div>

          <div className="focus-prompt">
            {editingFocus ? (
              <input
                autoFocus
                className="focus-input"
                aria-label="Current focus. Activate to edit."
                value={focusDraft}
                maxLength={80}
                placeholder={FOCUS_PLACEHOLDER}
                onChange={(e) => setFocusDraft(e.target.value)}
                onBlur={commitFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitFocus();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelFocus();
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="focus-prompt-text"
                aria-label="Current focus. Activate to edit."
                title={focusText || FOCUS_PLACEHOLDER}
                onClick={() => {
                  setFocusDraft(focusText);
                  setEditingFocus(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setFocusDraft(focusText);
                    setEditingFocus(true);
                  }
                }}
              >
                {focusText || FOCUS_PLACEHOLDER}
              </button>
            )}
            <svg className="focus-pencil" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="quote" aria-hidden="true">
            {QUOTES[quoteIdx]}
          </p>
        </header>

        <main className="hero">
          {/* Phase selector: display-only (§6). Clicking does NOT switch phase. */}
          <div
            className="phase-selector"
            role="group"
            aria-label="Current phase (follows the timer)"
          >
            {PHASE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`phase-option${value === phase ? ' active' : ''}`}
                aria-pressed={value === phase}
                disabled
                title="Phase follows the timer"
                tabIndex={-1}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            ref={timerRef}
            id="hero-timer"
            className="hero-timer phase-changed"
            key={phase}
            role="timer"
            aria-label="Time remaining"
            tabIndex={-1}
          >
            {mm}
            <span className="colon">:</span>
            {ss}
          </div>

          <div className="controls">
            <button
              type="button"
              className="btn-primary"
              onClick={primaryAction}
              aria-label={primaryLabel === 'Start' ? 'Start timer' : primaryLabel === 'Pause' ? 'Pause timer' : 'Resume timer'}
            >
              <span className="btn-primary-label">{primaryLabel}</span>
            </button>
            <button
              type="button"
              className="btn-ghost-circle"
              title="Restart current phase (R)"
              aria-label="Restart current phase"
              disabled={isIdle}
              onClick={actions.reset}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M3.5 10a6.5 6.5 0 1 1 1.9 4.6M3.5 10V5.5M3.5 10h4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="btn-ghost-circle"
              title="Skip to next phase (S)"
              aria-label="Skip to next phase"
              disabled={isIdle}
              onClick={actions.skip}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M5 4.5v11l7-5.5-7-5.5zM13.5 4.5v11"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <p className="hint-row">Space Start/Pause · R Reset · S Skip</p>
          <p className="status-line" data-status={status} role="status" aria-live="polite">
            {status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : 'Idle'} —{' '}
            {announcement}
          </p>

          <div className="progress-wrap">
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="progress-dots" aria-hidden="true">
              {Array.from({ length: n }, (_, i) => (
                <span
                  key={i}
                  className={i < filledDots ? 'progress-dot filled' : 'progress-dot'}
                />
              ))}
            </div>
            <div className="session-strip">
              <span className="session-pill">
                Pomodoro {position} of {n}
              </span>
              <span className="session-pill">Completed: {completedWork}</span>
              <span className="session-pill session-pill-condensed">
                {position}/{n} · ✓{completedWork}
              </span>
            </div>
          </div>
          <div className="bottom-spacer" />
        </main>
      </div>

      {/* Sidebar rail (§3) */}
      <nav className="rail" aria-label="Quick actions">
        <button
          type="button"
          className="rail-btn active"
          aria-label="Focus timer"
          aria-current="true"
          title="Focus timer"
          onClick={focusHero}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="10" cy="10" r="2" fill="currentColor" />
            <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className={`rail-btn${soundOn ? ' active' : ''}`}
          aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
          aria-pressed={soundOn}
          title={soundOn ? 'Mute sound' : 'Unmute sound'}
          onClick={actions.toggleSound}
        >
          {soundOn ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 7.5v5h3l4 3.5v-12L6 7.5H3zM13 7c1.2 1.4 1.2 4.6 0 6M15.5 5c1.9 2.3 1.9 7.7 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 7.5v5h3l4 3.5v-12L6 7.5H3zM13.5 8.5l4 4M17.5 8.5l-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className={`rail-btn${isFullscreen ? ' active' : ''}`}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={toggleFullscreen}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          ref={settingsTriggerRef}
          type="button"
          className={`rail-btn${drawerOpen ? ' active' : ''}`}
          aria-label="Open settings"
          aria-haspopup="dialog"
          title="Settings"
          onClick={openDrawer}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM15.6 10c0-.4 0-.7-.1-1l1.7-1.3-1.6-2.8-2 .8c-.5-.4-1-.7-1.6-.9L11.7 2h-3.4l-.3 2.1c-.6.2-1.1.5-1.6.9l-2-.8-1.6 2.8L4.5 8.4c-.1.3-.1.7-.1 1s0 .7.1 1l-1.7 1.3 1.6 2.8 2-.8c.5.4 1 .7 1.6.9l.3 2.1h3.4l.3-2.1c.6-.2 1.1-.5 1.6-.9l2 .8 1.6-2.8-1.7-1.3c.1-.3.1-.6.1-1z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>

      {/* Settings drawer (§10) */}
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        aria-hidden={!drawerOpen}
        onClick={closeDrawer}
      />
      <SettingsDrawer
        open={drawerOpen}
        settings={settings}
        soundOn={soundOn}
        settingsNote={settingsNote}
        onUpdate={actions.updateSetting}
        onToggleSound={actions.toggleSound}
        onResetCounter={actions.resetCounter}
        onClose={closeDrawer}
      />
    </div>
  );
}

interface SettingsDrawerProps {
  open: boolean;
  settings: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    pomodorosBeforeLongBreak: number;
  };
  soundOn: boolean;
  settingsNote: string | null;
  onUpdate: <K extends SettingsKey>(key: K, value: number) => void;
  onToggleSound: () => void;
  onResetCounter: () => void;
  onClose: () => void;
}

function SettingsDrawer({
  open,
  settings,
  soundOn,
  settingsNote,
  onUpdate,
  onToggleSound,
  onResetCounter,
  onClose,
}: SettingsDrawerProps) {
  const [drafts, setDrafts] = useState<Record<SettingsKey, string>>({
    workMinutes: String(settings.workMinutes),
    shortBreakMinutes: String(settings.shortBreakMinutes),
    longBreakMinutes: String(settings.longBreakMinutes),
    pomodorosBeforeLongBreak: String(settings.pomodorosBeforeLongBreak),
  });
  const [errors, setErrors] = useState<Record<SettingsKey, string | null>>({
    workMinutes: null,
    shortBreakMinutes: null,
    longBreakMinutes: null,
    pomodorosBeforeLongBreak: null,
  });
  const [counterArmed, setCounterArmed] = useState(false);
  const armTimer = useRef<number | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Keep drafts in sync when settings change from elsewhere (e.g. restore).
  useEffect(() => {
    setDrafts({
      workMinutes: String(settings.workMinutes),
      shortBreakMinutes: String(settings.shortBreakMinutes),
      longBreakMinutes: String(settings.longBreakMinutes),
      pomodorosBeforeLongBreak: String(settings.pomodorosBeforeLongBreak),
    });
  }, [settings]);

  useEffect(() => {
    return () => {
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
    };
  }, []);

  // Focus trap + Escape + initial focus (§10, §16).
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCounterArmed(false);
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled)',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const commit = (key: SettingsKey, raw: string) => {
    const result = validateSettingValue(key, raw);
    if (result.ok) {
      setErrors((prev) => ({ ...prev, [key]: null }));
      setDrafts((prev) => ({ ...prev, [key]: String(result.value) }));
      onUpdate(key, result.value);
    } else {
      // Rejected: inline error, last valid value retained, timer unaffected.
      setErrors((prev) => ({ ...prev, [key]: result.error }));
      setDrafts((prev) => ({ ...prev, [key]: String(settings[key]) }));
    }
  };

  const handleCounterReset = () => {
    if (!counterArmed) {
      setCounterArmed(true);
      if (armTimer.current !== null) window.clearTimeout(armTimer.current);
      armTimer.current = window.setTimeout(() => setCounterArmed(false), 5000);
      return;
    }
    if (armTimer.current !== null) window.clearTimeout(armTimer.current);
    setCounterArmed(false);
    onResetCounter();
  };

  return (
    <aside
      ref={drawerRef}
      className={`drawer${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="drawer-handle" aria-hidden="true" />
      <div className="drawer-header">
        <h2 className="drawer-title" id="settings-heading">
          Settings
        </h2>
        <button
          ref={closeRef}
          type="button"
          className="drawer-close"
          aria-label="Close settings"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {SETTING_FIELDS.map(({ key, label, suffix, inputId }) => {
        const errorId = `${inputId}-error`;
        const { min, max } = LIMITS[key];
        return (
          <div className="field" key={key}>
            <label htmlFor={inputId}>{label}</label>
            <div className="field-row">
              <input
                id={inputId}
                type="number"
                min={min}
                max={max}
                step={1}
                value={drafts[key]}
                aria-invalid={errors[key] ? 'true' : undefined}
                aria-describedby={errors[key] ? errorId : undefined}
                onChange={(e) => {
                  setDrafts((prev) => ({ ...prev, [key]: e.target.value }));
                }}
                onBlur={(e) => commit(key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commit(key, (e.target as HTMLInputElement).value);
                  }
                }}
              />
              {suffix && <span className="unit">{suffix}</span>}
            </div>
            {errors[key] && (
              <p className="field-error" id={errorId} role="alert">
                {errors[key]}
              </p>
            )}
          </div>
        );
      })}

      <div className="field-check">
        <label htmlFor="setting-sound">Sound on</label>
        <button
          type="button"
          id="setting-sound"
          className="switch"
          aria-pressed={soundOn}
          aria-label="Sound on"
          onClick={onToggleSound}
        >
          <span className="switch-track" aria-hidden="true">
            <span className="switch-knob" aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            unlockAudio();
            playChime();
          }}
        >
          Preview
        </button>
      </div>

      <button
        type="button"
        className="btn-danger"
        onClick={handleCounterReset}
        onBlur={() => setCounterArmed(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setCounterArmed(false);
        }}
      >
        {counterArmed ? 'Press again to confirm' : 'Reset counter'}
      </button>

      <p className="helper">
        Changes apply to future phases. The current phase keeps its time until you press
        Reset.
      </p>
      {settingsNote && (
        <p className="helper helper-note" role="status">
          {settingsNote}
        </p>
      )}
    </aside>
  );
}
