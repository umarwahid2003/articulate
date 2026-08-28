/**
 * Robust, timezone-safe streak and practice habit calculations
 */

export function toLocalDateString(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPracticedDateSet(sessions: Array<{ timestamp?: string }>): Set<string> {
  const practicedDates = new Set<string>();
  if (!sessions || !Array.isArray(sessions)) return practicedDates;

  for (const s of sessions) {
    if (s && s.timestamp) {
      const dateKey = toLocalDateString(s.timestamp);
      if (dateKey) {
        practicedDates.add(dateKey);
      }
    }
  }
  return practicedDates;
}

export function getUniquePracticedDays(sessions: Array<{ timestamp?: string }>): number {
  return getPracticedDateSet(sessions).size;
}

export function hasPracticedToday(sessions: Array<{ timestamp?: string }>): boolean {
  const practicedDates = getPracticedDateSet(sessions);
  const todayStr = toLocalDateString(new Date());
  return practicedDates.has(todayStr);
}

/**
 * Calculates current active consecutive day streak.
 * Streak remains active if user practiced today OR yesterday.
 */
export function calculateStreak(sessions: Array<{ timestamp?: string }>): number {
  if (!sessions || sessions.length === 0) return 0;

  const practicedDates = getPracticedDateSet(sessions);
  if (practicedDates.size === 0) return 0;

  const today = new Date();
  const todayStr = toLocalDateString(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  const practicedToday = practicedDates.has(todayStr);
  const practicedYesterday = practicedDates.has(yesterdayStr);

  // If user practiced neither today nor yesterday, streak is reset
  if (!practicedToday && !practicedYesterday) {
    return 0;
  }

  let streak = 0;
  // If practiced today, start counting from today backward.
  // Otherwise, start counting from yesterday backward.
  const checkDate = new Date(practicedToday ? today : yesterday);

  while (true) {
    const checkStr = toLocalDateString(checkDate);
    if (practicedDates.has(checkStr)) {
      streak++;
      // Move back 1 calendar day
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
