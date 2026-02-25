import { useState, useRef } from 'react';

export function useDragDrop(items, onReorder) {
    const [dragIdx, setDragIdx] = useState(null);
    const [overIdx, setOverIdx] = useState(null);
    const dragNode = useRef(null);

    const handleDragStart = (e, idx) => {
        setDragIdx(idx);
        dragNode.current = e.target;
        e.target.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
            const reordered = [...items];
            const [removed] = reordered.splice(dragIdx, 1);
            reordered.splice(overIdx, 0, removed);
            onReorder(reordered);
        }
        setDragIdx(null);
        setOverIdx(null);
        dragNode.current = null;
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOverIdx(idx);
    };

    const getDragProps = (idx) => ({
        draggable: true,
        onDragStart: (e) => handleDragStart(e, idx),
        onDragEnd: handleDragEnd,
        onDragOver: (e) => handleDragOver(e, idx),
        style: {
            cursor: 'grab',
            transition: 'transform 0.15s ease, background 0.15s ease',
            transform: overIdx === idx && dragIdx !== idx ? (dragIdx < idx ? 'translateY(4px)' : 'translateY(-4px)') : 'translateY(0)',
            background: overIdx === idx && dragIdx !== idx ? '#eef6fb' : undefined,
            borderLeft: overIdx === idx && dragIdx !== idx ? '3px solid #2E86AB' : '3px solid transparent',
        }
    });

    const DragHandle = null;

    return { getDragProps, DragHandle, isDragging: dragIdx !== null };
}
