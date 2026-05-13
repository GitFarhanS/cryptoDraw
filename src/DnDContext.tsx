import { createContext, useContext, useState } from 'react';

type DnDContextType = [string | null, (type: string | null) => void];

const DnDContext = createContext<DnDContextType>([null, () => {}]);

export const DnDProvider = ({ children }: { children: React.ReactNode }) => {
  const [type, setType] = useState<string | null>(null);

  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

export default DnDContext;
export const useDnD = () => useContext(DnDContext);