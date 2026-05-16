import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { normalizeVarName } from './bits';

type VariableMap = Record<string, string | null>;

type VariableStoreValue = {
  variables: VariableMap;
  setVariable: (name: string, value: string | null) => void;
  clearVariable: (name: string) => void;
  resetVariables: () => void;
};

const VariableStoreContext = createContext<VariableStoreValue | null>(null);

export function VariableStoreProvider({ children }: { children: ReactNode }) {
  const [variables, setVariables] = useState<VariableMap>({});

  const setVariable = useCallback((name: string, value: string | null) => {
    const key = normalizeVarName(name);
    setVariables((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const clearVariable = useCallback((name: string) => {
    const key = normalizeVarName(name);
    setVariables((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetVariables = useCallback(() => {
    setVariables((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const value = useMemo(
    () => ({ variables, setVariable, clearVariable, resetVariables }),
    [variables, setVariable, clearVariable, resetVariables],
  );

  return (
    <VariableStoreContext.Provider value={value}>
      {children}
    </VariableStoreContext.Provider>
  );
}

export function useVariableStore() {
  const ctx = useContext(VariableStoreContext);
  if (!ctx) {
    throw new Error('useVariableStore must be used within VariableStoreProvider');
  }
  return ctx;
}
