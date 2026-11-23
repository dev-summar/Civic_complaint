import {useEffect, useState} from 'react';

let collapsed = false;
const listeners = new Set<(value: boolean) => void>();

export function useSidebarCollapsed() {
  const [value, setValue] = useState(collapsed);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  const toggle = () => {
    collapsed = !collapsed;
    listeners.forEach(listener => listener(collapsed));
  };
  return {collapsed: value, toggle, width: value ? 56 : 232};
}
