import { useMemo, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useAppDispatch } from '../../store/hooks';
import { DrillController } from './DrillController';

export function useDrillController() {
  const dispatch = useAppDispatch();
  const reactFlow = useReactFlow();

  const getViewport = useCallback(() => {
    try {
      return reactFlow.getViewport();
    } catch {
      return { x: 0, y: 0, zoom: 1 };
    }
  }, [reactFlow]);

  const controller = useMemo(
    () => new DrillController(dispatch, getViewport),
    [dispatch, getViewport],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        controller.handleEscape();
      }
      // Ctrl+Z or Backspace for back navigation (when not in input)
      if (
        (e.key === 'Backspace' || (e.ctrlKey && e.key === 'z')) &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        controller.handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controller]);

  return controller;
}
