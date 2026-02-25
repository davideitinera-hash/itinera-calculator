export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
    return <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />;
}

export function SkeletonCard() {
    return (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <SkeletonLine width="60%" height={16} />
                <SkeletonLine width={60} height={20} style={{ borderRadius: 10 }} />
            </div>
            <SkeletonLine width="40%" height={12} style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <SkeletonLine width={60} height={12} />
                <SkeletonLine width={80} height={12} />
                <SkeletonLine width={70} height={12} />
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <SkeletonLine width={100} height={10} />
                <SkeletonLine width={80} height={24} style={{ borderRadius: 4 }} />
            </div>
        </div>
    );
}

export function SkeletonDashboard({ isMobile }) {
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '10px 16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <SkeletonLine width={40} height={24} style={{ margin: '0 auto 4px' }} />
                        <SkeletonLine width={60} height={10} style={{ margin: '0 auto' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
        </div>
    );
}
