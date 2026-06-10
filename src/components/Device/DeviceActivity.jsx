import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDeviceActivity, setActivityFilters, clearActivityState } from '../../store/slices/deviceSlice';
import '../AppUsers/UserActivityPage.css'; // reuse same styles

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

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
const typeClass  = (t) => ({ live:'live', vod:'vod', series:'series' }[t]||'other');
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
  const dispatch = useDispatch();
  const { activityItems, activityTotal, activityPage, activityPageSize, activityLoading, activityError, activityFilters } = useSelector(s => s.devices);
  const totalPages = Math.max(1, Math.ceil(activityTotal / (activityPageSize||1)));

  useEffect(() => {
    const p = {};
    if (activityFilters.content_type !== 'all') p.content_type = activityFilters.content_type;
    if (activityFilters.date_from) p.date_from = activityFilters.date_from;
    if (activityFilters.date_to)   p.date_to   = activityFilters.date_to;
    p.page = activityFilters.page; p.page_size = activityFilters.page_size;
    dispatch(fetchDeviceActivity({ deviceId, params: p }));
  }, [dispatch, deviceId, activityFilters.content_type, activityFilters.date_from, activityFilters.date_to, activityFilters.page, activityFilters.page_size]);

  useEffect(() => () => dispatch(clearActivityState()), [dispatch]);

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
          <select className="ua-select" value={activityFilters.content_type} onChange={e=>dispatch(setActivityFilters({content_type:e.target.value,page:1}))}>
            <option value="all">All</option><option value="live">Live</option><option value="vod">VOD</option><option value="series">Series</option>
          </select>
        </div>
        <div className="ua-filter"><label>From</label><input type="date" className="ua-date-input" value={activityFilters.date_from} onChange={e=>dispatch(setActivityFilters({date_from:e.target.value,page:1}))}/></div>
        <div className="ua-filter"><label>To</label><input type="date" className="ua-date-input" value={activityFilters.date_to} onChange={e=>dispatch(setActivityFilters({date_to:e.target.value,page:1}))}/></div>
        {(activityFilters.content_type!=='all'||activityFilters.date_from||activityFilters.date_to) && (
          <button className="ua-clear-btn" onClick={()=>dispatch(clearActivityState())}>Clear</button>
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
                {activityItems.length ? activityItems.map(row=>(
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
        {!activityLoading&&!activityError&&<Pagination current={activityPage} totalPages={totalPages} totalItems={activityTotal} pageSize={activityPageSize} onPage={p=>dispatch(setActivityFilters({page:p}))}/>}
      </div>
    </div>
  );
}
