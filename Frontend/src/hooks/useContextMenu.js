import { useState, useEffect } from 'react';

export function useContextMenu({ containerRef }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [contextItem, setContextItem] = useState(null);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    let x = e.clientX;
    let y = e.clientY;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuWidth = 220; 
      const menuHeight = 350; 
      
      if (x + menuWidth > rect.right) {
        x = rect.right - menuWidth - 10;
      }
      if (y + menuHeight > rect.bottom) {
        y = rect.bottom - menuHeight - 10;
      }
      
      x = x - rect.left;
      y = y - rect.top;
    }

    setContextMenu({ x, y });
    setContextItem(item);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setContextItem(null);
  };

  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleClickOutside, true);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleClickOutside, true);
    };
  }, []);

  return {
    contextMenu,
    contextItem,
    handleContextMenu,
    closeContextMenu
  };
}
