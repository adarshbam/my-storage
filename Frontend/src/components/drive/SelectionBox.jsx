import React from 'react';

export default function SelectionBox({ isDragging, selectionBox }) {
  if (!isDragging || !selectionBox) return null;
  return (
    <div
      className="absolute bg-blue-500/20 border border-blue-500/50 z-50 pointer-events-none rounded-sm"
      style={{
        left: selectionBox.x,
        top: selectionBox.y,
        width: selectionBox.width,
        height: selectionBox.height,
      }}
    />
  );
}
