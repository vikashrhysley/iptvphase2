import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiFetchDeviceActivity } from '../../services/api';
import '../AppUsers/UserActivityPage.css'; // reuse same styles

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

const PAGE_SIZE = 20;

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return '—'; }
};
const eventClass = (t) => {
  if (!t) return 'other';
  const v = t.toLowerCase();
  if (v.includes('play') || v.includes('start') || v.includes('resume')) return 'start';
  if (v.includes('stop') || v.includes('end') || v.includes('complete')) return 'stop';
  if (v.includes('pause')) return 'pause';
  if (v.includes('error')) return 'error';
  if (v.includes('surf')) return 'surf';
  return 'other';
};
const fmtEvent  = (t) => (t||'—').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const typeClass  = (t) => ({ live:'live', vod:'vod', series:'series' }[(t||'').toLowerCase()]||'other');
const stateClass = (s) => {
  if (!s) return 'other';
  const v = s.toLowerCase();
  if (v.includes('play')) return 'start';
  if (v.includes('pause')) return 'pause';
  if (v.includes('stop') || v.includes('end')) return 'stop';
  return 'other';
};

function Pagination({ current, totalPages, totalItems, pageSize, onPage }) {
  if (!totalItems) return null;
  const start = (current-1)*pageSize+1, end = Math.min(current*pageSize, totalItems);
  const pages = Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-current)<=1).reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1) acc.push(`e${p}`); acc.push(p); return acc; },[]);
  return (
    <div className="ua-pagination">
      <span className="ua-dp-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> events</span>
      <div className="ua-dp-controls">
        <button className="ua-dp-nav" onClick={()=>onPage(Math.max(1,current-1))} disabled={current===1}><ChevLeft/> Prev</button>
        <div className="ua-dp-pages">{pages.map(p=>typeof p==='string'?<span key={p} className="ua-dp-ellipsis">…</span>:<button key={p} className={`ua-dp-page${p===current?' active':''}`} onClick={()=>onPage(p)}>{p}</button>)}</div>
        <button className="ua-dp-nav" onClick={()=>onPage(Math.min(totalPages,current+1))} disabled={current===totalPages}>Next <ChevRight/></button>
      </div>
    </div>
  );
}

export default function DeviceActivity({ deviceId, deviceName, onBack }) {
  const accessToken = useSelector(s => s.auth.accessToken);

  // Full activity set for this device (fetched once, all pages) — filtering is
  // done client-side because the server-side content_type filter on this
  // endpoint returns no rows.
  const [allRows, setAllRows] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  // Local filter + pagination state.
  const [contentType, setContentType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Fetch every page of this device's activity so client-side filtering sees all rows.
  useEffect(() => {
    let cancelled = false;
    const FETCH_SIZE = 100;
    (async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const collected = [];
        let current = 1;
        // Safety cap so a runaway total never loops forever.
        while (current <= 200) {
          const res = await apiFetchDeviceActivity(accessToken, deviceId, { page: current, page_size: FETCH_SIZE });
          const items = Array.isArray(res.items) ? res.items : [];
          collected.push(...items);
          const serverTotal = res.total ?? 0;
          if (items.length === 0 || items.length < FETCH_SIZE || collected.length >= serverTotal) break;
          current += 1;
        }
        if (!cancelled) setAllRows(collected);
      } catch (err) {
        if (!cancelled) setActivityError(err.message || 'Failed to load activity.');
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, deviceId]);

  // Reset to first page whenever a filter changes.
  useEffect(() => { setPage(1); }, [contentType, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs   = dateTo   ? new Date(`${dateTo}T23:59:59.999`).getTime() : null; // inclusive end of day
    return (allRows || []).filter(row => {
      if (contentType !== 'all' && (row.content_type || '').toLowerCase() !== contentType) return false;
      if (fromTs || toTs) {
        const ts = row.created_at ? new Date(row.created_at).getTime() : null;
        if (ts == null || Number.isNaN(ts)) return false;
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
      }
      return true;
    });
  }, [allRows, contentType, dateFrom, dateTo]);

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current    = Math.min(page, totalPages);
  const pageRows   = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const hasFilter = contentType !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setContentType('all'); setDateFrom(''); setDateTo(''); setPage(1); };

  return (
    <div className="ua-page">
      <div className="ua-topbar">
        <button className="ua-back-btn" onClick={onBack}><BackIcon/> Back to Device</button>
        <div className="ua-breadcrumb"><span>{deviceName}</span><span className="ua-bc-sep">/</span><span className="ua-bc-active">Activity</span></div>
      </div>
      <div className="ua-header">
        <h1 className="ua-title">Playback Activity</h1>
        <div className="ua-subtitle">Full playback event history for this device.</div>
      </div>
      <div className="ua-toolbar">
        <div className="ua-filter">
          <label>Content Type</label>
          <select className="ua-select" value={contentType} onChange={e=>setContentType(e.target.value)}>
            <option value="all">All</option><option value="live">Live</option><option value="vod">VOD</option><option value="series">Series</option>
          </select>
        </div>
        <div className="ua-filter"><label>From</label><input type="date" className="ua-date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
        <div className="ua-filter"><label>To</label><input type="date" className="ua-date-input" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
        {hasFilter && (
          <button className="ua-clear-btn" onClick={clearFilters}>Clear</button>
        )}
      </div>
      <div className="ua-table-wrap">
        {activityLoading ? <div className="ua-loading">Loading activity…</div>
          : activityError ? <div className="ua-error">{activityError}</div>
          : (
          <div className="ua-table-scroll">
            <table className="ua-table">
              <thead><tr><th>Date</th><th>Event</th><th>Content</th><th>Type</th><th>Playback State</th><th>App Version</th><th>IP Address</th><th>Location</th></tr></thead>
              <tbody>
                {pageRows.length ? pageRows.map(row=>(
                  <tr key={row.id}>
                    <td className="ua-date">{fmtDateTime(row.created_at)}</td>
                    <td><span className={`ua-event-pill ${eventClass(row.event_type)}`}>{fmtEvent(row.event_type)}</span></td>
                    <td className="ua-content"><div className="ua-content-title">{row.content_name||'—'}</div></td>
                    <td><span className={`ua-type-pill ${typeClass(row.content_type)}`}>{(row.content_type||'—').toUpperCase()}</span></td>
                    <td>
                      {row.playback_state
                        ? <span className={`ua-event-pill ${stateClass(row.playback_state)}`}>{fmtEvent(row.playback_state)}</span>
                        : <span className="ua-dim">—</span>}
                    </td>
                    <td className="ua-mono">{row.app_version || '—'}</td>
                    <td className="ua-mono">{row.ip_address || '—'}</td>
                    <td className="ua-location">
                      {row.country_name&&<span className="ua-city">{row.country_name}</span>}
                      {row.country_code&&<span className="ua-country-code">{row.country_code}</span>}
                      {!row.country_name&&!row.country_code&&'—'}
                    </td>
                  </tr>
                )) : <tr><td colSpan={8} className="ua-empty">No activity records found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!activityLoading&&!activityError&&<Pagination current={current} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPage={setPage}/>}
      </div>
    </div>
  );
}
