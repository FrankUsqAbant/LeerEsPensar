/**
 * Luz de la sala: modo claro/oscuro (la lámpara) y matiz según la hora local.
 * Se aplica como atributos en <html> para que todo el CSS reaccione a la vez.
 */
export type RoomTheme = 'light' | 'dark';
export type RoomAmbient = 'day' | 'dusk' | 'night';

const THEME_KEY = 'lep:theme';

export function ambientForHour(hour: number): RoomAmbient {
  if (hour >= 6 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export function readSavedTheme(): RoomTheme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: RoomTheme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento: la elección dura solo esta visita.
  }
}

export function initialTheme(): RoomTheme {
  if (typeof window === 'undefined') return 'light';
  const saved = readSavedTheme();
  if (saved) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyRoomLight(theme: RoomTheme, ambient: RoomAmbient = ambientForHour(new Date().getHours())): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.ambient = ambient;
  root.classList.toggle('dark', theme === 'dark');
}
