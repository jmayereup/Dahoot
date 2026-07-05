import { useState, useCallback, useRef } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

export function useConfirm() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText === null || options.cancelText === false || options.cancelText === '' ? null : (options.cancelText || 'Cancel'),
        variant: options.variant || 'danger',
        icon: options.icon || null
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setState(null);
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setState(null);
  }, []);

  const ConfirmDialog = state ? (
    <ConfirmModal
      isOpen={true}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      icon={state.icon}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
