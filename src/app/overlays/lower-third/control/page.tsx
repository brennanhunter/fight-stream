'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';

interface LowerThirdState {
  fighter_name: string;
  record: string;
  weight_class: string;
  visible: boolean;
}

const DEFAULT: LowerThirdState = {
  fighter_name: '',
  record: '',
  weight_class: '',
  visible: false,
};

async function postState(update: Partial<LowerThirdState>) {
  const res = await fetch('/api/overlay/lower-third', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update overlay');
  return res.json() as Promise<LowerThirdState>;
}

// ── Mini preview of the lower third (scaled down)
function LowerThirdPreview({
  state,
  previewVisible,
}: {
  state: LowerThirdState;
  previewVisible: boolean;
}) {
  const subline = [state.record, state.weight_class].filter(Boolean).join('   ·   ');

  return (
    // 16:9 wrapper scaled to fit the control panel
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Mock stream background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(45deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 20px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '9%',
          left: 0,
          display: 'flex',
          alignItems: 'stretch',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: previewVisible ? 'translateX(0)' : 'translateX(-110%)',
          opacity: previewVisible ? 1 : 0,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
        }}
      >
        <div
          style={{
            width: 3,
            flexShrink: 0,
            background: '#ffffff',
            boxShadow: '0 0 8px rgba(255,255,255,0.8)',
          }}
        />
        <div
          style={{
            background: 'rgba(7, 7, 7, 0.94)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Image
              src="/logos/BoxStreamThumbnail.png"
              alt="BoxStreamTV"
              width={24}
              height={24}
              style={{ display: 'block', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
            />
          </div>
          <div
            style={{
              width: 1,
              alignSelf: 'stretch',
              background: 'rgba(255,255,255,0.15)',
              margin: '6px 0',
              flexShrink: 0,
            }}
          />
          <div
            style={{
              padding: '8px 16px 8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div
              style={{
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: 18,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {state.fighter_name || 'FIGHTER NAME'}
            </div>
            {subline && (
              <div
                style={{
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  fontSize: 7,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {subline}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LowerThirdControl() {
  const [live, setLive] = useState<LowerThirdState>(DEFAULT);
  const [draft, setDraft] = useState<LowerThirdState>(DEFAULT);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch('/api/overlay/lower-third')
      .then((r) => r.json())
      .then((data: LowerThirdState) => {
        setLive(data);
        setDraft(data);
        setPreviewVisible(data.visible);
      })
      .catch(() => {});
  }, []);

  function handleField(field: keyof LowerThirdState, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await postState({
          fighter_name: draft.fighter_name,
          record: draft.record,
          weight_class: draft.weight_class,
        });
        setLive(updated);
        setDraft(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError('Failed to save. Check your connection.');
      }
    });
  }

  function handleToggleVisible() {
    const next = !live.visible;
    setError(null);
    setPreviewVisible(next);
    startTransition(async () => {
      try {
        const updated = await postState({ visible: next });
        setLive(updated);
        setDraft((prev) => ({ ...prev, visible: updated.visible }));
      } catch {
        setPreviewVisible(live.visible);
        setError('Failed to update visibility.');
      }
    });
  }

  const isDirty =
    draft.fighter_name !== live.fighter_name ||
    draft.record !== live.record ||
    draft.weight_class !== live.weight_class;

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#0d0d0d',
        color: '#ffffff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Image
          src="/logos/BoxStreamThumbnail.png"
          alt="BoxStreamTV"
          width={32}
          height={32}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffffff' }}>
            BoxStreamTV
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Lower Third Control
          </div>
        </div>

        {/* Live indicator */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: live.visible ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${live.visible ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.1)'}`,
            transition: 'all 0.3s',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: live.visible ? '#ef4444' : 'rgba(255,255,255,0.2)',
              boxShadow: live.visible ? '0 0 6px #ef4444' : 'none',
              transition: 'all 0.3s',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: live.visible ? '#fca5a5' : 'rgba(255,255,255,0.35)',
            }}
          >
            {live.visible ? 'On Air' : 'Off Air'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 0,
        }}
      >
        {/* ── Left: controls */}
        <div
          style={{
            borderRight: '1px solid rgba(255,255,255,0.08)',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                Fighter Name
              </label>
              <input
                type="text"
                value={draft.fighter_name}
                onChange={(e) => handleField('fighter_name', e.target.value)}
                placeholder="e.g. MIKE TYSON"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: 22,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.35)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  Record
                </label>
                <input
                  type="text"
                  value={draft.record}
                  onChange={(e) => handleField('record', e.target.value)}
                  placeholder="20-0-0"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 600,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.35)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  Weight Class
                </label>
                <input
                  type="text"
                  value={draft.weight_class}
                  onChange={(e) => handleField('weight_class', e.target.value)}
                  placeholder="Heavyweight"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 600,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.35)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isPending || !isDirty}
            style={{
              padding: '12px 20px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.18)',
              background: isDirty ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: isDirty ? '#ffffff' : 'rgba(255,255,255,0.25)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: isDirty && !isPending ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            {isPending ? 'Saving…' : saved ? '✓ Saved' : isDirty ? 'Save Fighter Info' : 'No Changes'}
          </button>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: 'rgba(220,38,38,0.12)',
                border: '1px solid rgba(220,38,38,0.3)',
                color: '#fca5a5',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

          {/* Show / Hide toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              Broadcast
            </div>
            <button
              onClick={handleToggleVisible}
              disabled={isPending}
              style={{
                padding: '18px 20px',
                borderRadius: 8,
                border: 'none',
                background: live.visible
                  ? 'rgba(220,38,38,0.85)'
                  : 'rgba(255,255,255,0.92)',
                color: live.visible ? '#ffffff' : '#0d0d0d',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: isPending ? 'default' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: live.visible
                  ? '0 0 24px rgba(220,38,38,0.4)'
                  : '0 0 24px rgba(255,255,255,0.15)',
              }}
            >
              {live.visible ? '■  Hide Overlay' : '▶  Show Overlay'}
            </button>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              {live.visible
                ? 'Lower third is live on stream'
                : 'Overlay is hidden — save info first, then show'}
            </div>
          </div>
        </div>

        {/* ── Right: preview */}
        <div
          style={{
            padding: '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            Preview
          </div>
          <LowerThirdPreview state={draft} previewVisible={previewVisible} />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
            Preview reflects unsaved edits. OBS displays the last saved + shown state.
          </div>

          {/* Keyboard hint */}
          <div
            style={{
              marginTop: 'auto',
              padding: '14px 18px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
              Workflow
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              1. Fill in fighter info → Save<br />
              2. Hit Show Overlay at walkout<br />
              3. Hit Hide Overlay when done<br />
              4. Update info for next fighter → Save → Show
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
