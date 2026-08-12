import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshCurrentUser } from '../store/slices/authSlice';

// Keeps the signed-in admin's role + permissions fresh so page-level access (the sidebar
// gating) reflects permission edits WITHOUT a manual reload — including edits made by another
// admin in a different session. Re-fetches the profile on a light interval and every time the
// tab regains focus; pauses while the tab is hidden so a backgrounded tab never polls.
const INTERVAL = 45_000;

export default function useProfileRefresh() {
  const dispatch = useDispatch();
  const isAuthed = useSelector((s) => !!s.auth.accessToken && s.auth.step === 4);

  useEffect(() => {
    if (!isAuthed) return undefined;

    let timer = null;
    const refresh = () => dispatch(refreshCurrentUser());
    const start = () => { if (!timer) timer = setInterval(refresh, INTERVAL); };
    const stop  = () => { clearInterval(timer); timer = null; };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else { refresh(); start(); }   // refresh at once on return, then resume the interval
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [dispatch, isAuthed]);
}
