import { h } from 'preact';
import { OperatorStatus } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  operatorStatus: OperatorStatus;
  primaryColor: string;
  onClose: () => void;
  onMinimize: () => void;
}

export function Header({
  title,
  subtitle,
  operatorStatus,
  primaryColor,
  onClose,
  onMinimize,
}: HeaderProps) {
  return (
    <div className="nexvo-header" style={{ backgroundColor: primaryColor }}>
      <div className="nexvo-header-content">
        {operatorStatus.avatar && (
          <div className="nexvo-header-avatar">
            <img src={operatorStatus.avatar} alt={operatorStatus.name} />
            {operatorStatus.online && <span className="nexvo-status-dot"></span>}
          </div>
        )}

        <div className="nexvo-header-text">
          <h3 className="nexvo-header-title">{title}</h3>
          {subtitle && <p className="nexvo-header-subtitle">{subtitle}</p>}
          {!subtitle && operatorStatus.online && (
            <p className="nexvo-header-subtitle">
              {operatorStatus.name ? `${operatorStatus.name} is online` : 'Online'}
            </p>
          )}
          {!subtitle && !operatorStatus.online && (
            <p className="nexvo-header-subtitle">Offline - We'll reply soon</p>
          )}
        </div>
      </div>

      <div className="nexvo-header-actions">
        <button
          className="nexvo-header-btn"
          onClick={onMinimize}
          aria-label="Minimize chat"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8H12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          className="nexvo-header-btn"
          onClick={onClose}
          aria-label="Close chat"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
