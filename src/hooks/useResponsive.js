import { useState, useEffect } from 'react';

const BREAKPOINTS = { mobile: 0, tablet: 640, desktop: 1024, large: 1440 };

export function useResponsive() {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        let timeout;
        const handleResize = () => { clearTimeout(timeout); timeout = setTimeout(() => setWidth(window.innerWidth), 100); };
        window.addEventListener('resize', handleResize);
        return () => { clearTimeout(timeout); window.removeEventListener('resize', handleResize); };
    }, []);

    return {
        width,
        isMobile: width < BREAKPOINTS.tablet,
        isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
        isDesktop: width >= BREAKPOINTS.desktop && width < BREAKPOINTS.large,
        isLarge: width >= BREAKPOINTS.large,
        isTouch: width < BREAKPOINTS.desktop,
        breakpoint: width < BREAKPOINTS.tablet ? 'mobile' : width < BREAKPOINTS.desktop ? 'tablet' : width < BREAKPOINTS.large ? 'desktop' : 'large',
    };
}
