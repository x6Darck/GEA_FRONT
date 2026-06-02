import React from 'react';

const EmptyState = ({
  icon: Icon,
  title = 'Sin resultados',
  description,
  action,
  actionLabel,
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    gap: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  }}>
    {Icon && <Icon size={44} style={{ opacity: 0.25, flexShrink: 0 }} />}
    <p style={{ fontSize: '15px', fontWeight: '600', color: '#64748b', margin: 0 }}>{title}</p>
    {description && (
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '360px', lineHeight: 1.5 }}>{description}</p>
    )}
    {action && actionLabel && (
      <button
        onClick={action}
        style={{
          marginTop: '8px',
          padding: '8px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--primary)',
          background: 'white',
          color: 'var(--primary)',
          fontWeight: '600',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary)'; }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
