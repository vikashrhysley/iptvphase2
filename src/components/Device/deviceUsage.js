// A device is "signed in" when its Activity reads Online now or Idle — the only rows that get a
// Force logout action (Remote Device Logout build guide C1). Signed-out, blocked and
// out-of-service rows never carry these usage states.
export const isSignedIn = (usageState) => usageState === 'online_now' || usageState === 'logged_in_idle';
