import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import cn from 'classnames';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  width = 'max-w-lg',
  showCloseButton = true,
  closeOnOverlayClick = true,
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open, onClose]);

  if (!isVisible) return null;

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-200',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/*
       * ── Scroll + centering wrapper ──
       * Using `fixed` with explicit positioning to ensure modal stays centered
       * regardless of scroll position.
       */}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          {/* Modal Card */}
          <div
            className={cn(
              `relative w-full ${width} glass-card rounded-2xl shadow-2xl shadow-black/40 transition-all duration-200`,
              isAnimating
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-4'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-700/30">
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                {description && (
                  <p className="text-sm text-slate-400 mt-0.5">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {children}
            </div>
          </div>
      </div>
    </>,
    document.body
  );
}

// Confirm Dialog
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    warning: 'bg-orange-600 hover:bg-orange-500 text-white',
    info: 'bg-blue-600 hover:bg-blue-500 text-white',
  };

  return (
    <Modal open={open} title={title} onClose={onCancel} width="max-w-sm">
      <p className="text-sm text-slate-300">{message}</p>
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50',
            buttonStyles[variant]
          )}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : confirmText}
        </button>
      </div>
    </Modal>
  );
}
