/**
 * ConfirmDialog Component
 *
 * Accessible confirmation dialog that replaces window.confirm().
 * Uses the native alertdialog ARIA role for screen reader announcements.
 *
 * Features:
 * - alertdialog role with aria-labelledby / aria-describedby
 * - ESC key dismissal
 * - Focus trap: auto-focuses the cancel button on open, restores focus on close
 * - Click-outside-to-dismiss on the backdrop
 * - Supports multi-line messages via the message prop
 *
 * Usage:
 *   const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
 *
 *   // Trigger:
 *   setConfirm({ message: 'Delete this item?', onConfirm: () => doDelete() });
 *
 *   // Render:
 *   {confirm && (
 *     <ConfirmDialog
 *       title="Confirm Delete"
 *       message={confirm.message}
 *       onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
 *       onCancel={() => setConfirm(null)}
 *     />
 *   )}
 */

import React, { useEffect, useRef, useCallback, useId } from 'react';
import Button from './Button';
import '../../styles/confirm-dialog.css';

export interface ConfirmDialogProps {
  /** Dialog heading shown in the header */
  title?: string;
  /** Body text. Newlines (\n) are rendered as line breaks. */
  message: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual variant for the confirm button (danger for destructive actions) */
  confirmVariant?: 'primary' | 'danger' | 'warning';
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels (ESC, backdrop click, or Cancel button) */
  onCancel: () => void;
}

/** State shape for the confirm dialog pattern used by consuming components */
export interface ConfirmDialogState {
  message: string;
  onConfirm: () => void;
  title?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel
}) => {
  const instanceId = useId();
  const titleId = `confirm-dialog-title-${instanceId}`;
  const descId = `confirm-dialog-desc-${instanceId}`;
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Save the previously focused element and auto-focus the cancel button on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    cancelBtnRef.current?.focus();

    return () => {
      // Restore focus to the element that was focused before the dialog opened
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Handle ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }

    // Focus trap: Tab cycles between the two action buttons
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click on backdrop dismisses
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Render message with line-break support
  const renderMessage = () => {
    const lines = message.split('\n');
    if (lines.length === 1) {
      return <p id={descId} className="confirm-dialog-message">{message}</p>;
    }
    return (
      <div id={descId} className="confirm-dialog-message">
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="confirm-dialog-header">
          <h3 id={titleId} className="confirm-dialog-title">
            {title}
          </h3>
        </div>

        <div className="confirm-dialog-body">
          {renderMessage()}
        </div>

        <div className="confirm-dialog-footer">
          <button
            ref={cancelBtnRef}
            className="btn btn-secondary btn-medium"
            onClick={onCancel}
            type="button"
          >
            <span className="btn-text">{cancelLabel}</span>
          </button>
          <Button
            variant={confirmVariant}
            size="medium"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
