const KEY = "adventure-card-game:settings";

/**
 * @typedef {{ arrows: boolean, swipe: boolean }} Settings
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = { arrows: true, swipe: true };

/** @returns {Settings} */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const arrows = typeof parsed.arrows === "boolean" ? parsed.arrows : true;
    const swipe = typeof parsed.swipe === "boolean" ? parsed.swipe : true;
    if (!arrows && !swipe) return { ...DEFAULT_SETTINGS };
    return { arrows, swipe };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** @param {Settings} settings */
export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private mode and the phone can refuse storage. The toggle still works this visit.
  }
}

/**
 * Never leave both movement controls off.
 * @param {Settings} settings
 * @param {keyof Settings} key
 * @returns {{ settings: Settings, blocked: boolean }}
 */
export function toggleSetting(settings, key) {
  const next = { ...settings, [key]: !settings[key] };
  if (!next.arrows && !next.swipe) return { settings, blocked: true };
  return { settings: next, blocked: false };
}

/**
 * The last remaining movement control cannot be switched off.
 * @param {Settings} settings
 * @param {keyof Settings} key
 */
export function controlLocked(settings, key) {
  const other = key === "arrows" ? settings.swipe : settings.arrows;
  return settings[key] && !other;
}
