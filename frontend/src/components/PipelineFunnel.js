import React, { useEffect, useState } from 'react';

const PipelineFunnel = ({ data = [] }) => {
  const [animated, setAnimated] = useState(false);
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const totalAll = data.reduce((s, d) => s + d.count, 0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No pipeline data.</p>;
  }

  return (
    <div>
      {data.map((item, i) => {
        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const sharePct = totalAll > 0 ? Math.round((item.count / totalAll) * 100) : 0;
        const prevCount = i > 0 ? data[i - 1].count : null;
        const dropOff = prevCount !== null && prevCount > item.count ? prevCount - item.count : null;

        return (
          <div key={item.stage}>
            {/* Drop-off indicator */}
            {dropOff !== null && dropOff > 0 && (
              <div style={{ textAlign: 'center', padding: '2px 0', fontSize: '10px', color: 'var(--color-danger)', fontWeight: 600 }}>
                ↓ {dropOff} drop-off
              </div>
            )}
            <div className="funnel-row">
              <div className="funnel-dot" style={{ background: 'var(--color-primary)' }} />
              <span className="funnel-label">{item.stage}</span>
              <div className="funnel-bar-track-new">
                <div className="funnel-bar-fill-new" style={{
                  width: animated ? `${Math.max(pct, item.count > 0 ? 3 : 0)}%` : '0%',
                  transitionDelay: `${i * 60}ms`,
                }} />
              </div>
              <span className="funnel-count">{item.count}</span>
              <span className="funnel-pct">{sharePct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineFunnel;
