import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotificationUnreadCount, fetchNotificationSummary } from '../store/slices/notificationsSlice';

// Two independent client timers per logged-in session (spec: "Live" = polling, not push):
//   • unread-count every ~18s → bell badge
//   • summary     every ~45s → dropdown per-category breakdown
// Both pause while the tab is hidden (visibilitychange) so backgrounded tabs don't poll,
// and fire once immediately on (re)becoming visible so a returning admin sees fresh counts.
const COUNT_INTERVAL   = 18_000;
const SUMMARY_INTERVAL = 45_000;

export default function useNotificationPolling() {
  const dispatch = useDispatch();
  const isAuthed = useSelector((s) => !!s.auth.accessToken && s.auth.step === 4);

  useEffect(() => {
    if (!isAuthed) return undefined;

    let countTimer = null;
    let summaryTimer = null;

    const pollCount = () => dispatch(fetchNotificationUnreadCount());
    const pollSummary = () => dispatch(fetchNotificationSummary());

    const start = () => {
      if (countTimer || summaryTimer) return;   // already running
      pollCount();                                // immediate refresh on start/return
      pollSummary();
      countTimer = setInterval(pollCount, COUNT_INTERVAL);
      summaryTimer = setInterval(pollSummary, SUMMARY_INTERVAL);
    };

    const stop = () => {
      clearInterval(countTimer);
      clearInterval(summaryTimer);
      countTimer = null;
      summaryTimer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [dispatch, isAuthed]);
}
