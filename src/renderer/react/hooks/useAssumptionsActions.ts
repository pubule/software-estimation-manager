/**
 * useAssumptionsActions Hook
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - Hook connector per AssumptionsActions class
 * - ZERO business logic qui (tutto in Actions)
 * - Singleton pattern per performance
 */

import { useMemo } from 'react';
import { AssumptionsActions } from '../actions/AssumptionsActions';

/**
 * Hook per accesso alla AssumptionsActions class
 * Segue pattern State/Actions/Dispatcher:
 * Component -> useAssumptionsActions -> AssumptionsActions -> Store -> Re-render
 */
export const useAssumptionsActions = () => {
  return useMemo(() => new AssumptionsActions(), []);
};

export default useAssumptionsActions;