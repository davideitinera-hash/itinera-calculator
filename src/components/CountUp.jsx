import { useState, useEffect, useRef } from 'react';

export default function CountUp({ value, duration = 800, prefix = '', suffix = '', style = {} }) {
    const [display, setDisplay] = useState(0);
    const prevValue = useRef(0);
    const frameRef = useRef(null);

    useEffect(() => {
        const start = prevValue.current;
        const end = typeof value === 'number' ? value : 0;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (end - start) * eased);
            setDisplay(current);
            if (progress < 1) { frameRef.current = requestAnimationFrame(animate); }
            else { prevValue.current = end; }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, [value, duration]);

    return <span style={style}>{prefix}{display.toLocaleString('it-IT')}{suffix}</span>;
}
