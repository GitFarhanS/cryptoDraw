import { createContext, useContext, useState } from 'react';

export const REACTFLOW_DRAG_TYPE = 'application/reactflow';

type DnDContextValue = {
  type: string | null;
  setType: (type: string | null) => void;
  isDraggingFromSidebar: boolean;
  setIsDraggingFromSidebar: (value: boolean) => void;
};

const DnDContext = createContext<DnDContextValue | null>(null);

export const DnDProvider = ({ children }: { children: React.ReactNode }) => {
  const [type, setType] = useState<string | null>(null);
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);

  return (
    <DnDContext.Provider
      value={{ type, setType, isDraggingFromSidebar, setIsDraggingFromSidebar }}
    >
      {children}
    </DnDContext.Provider>
  );
};

export default DnDContext;

export const useDnD = () => {
  const ctx = useContext(DnDContext);
  if (!ctx) {
    throw new Error('useDnD must be used within DnDProvider');
  }
  return ctx;
};
