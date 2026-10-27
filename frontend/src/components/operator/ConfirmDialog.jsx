import React, { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * ConfirmDialog — Modal de Confirmação Explícita para Ações Críticas.
 * 
 * Utilizado para exclusão de projetos com salvaguarda visual e bloqueio anti-duplo clique.
 */
export function ConfirmDialog({
  isOpen,
  title = 'Confirmar Ação',
  message = 'Tem certeza que deseja prosseguir com esta ação?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen || isLoading) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#0a0a12] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-semibold text-white truncate">{title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
