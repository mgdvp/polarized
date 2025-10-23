// Localized time-ago formatter using i18next if available
// Usage:
//   timeAgo(new Date());            // "5 minutes ago" (localized)
//   timeAgo(date, { short: true }); // "5m" (short units localized)
import i18n from '../i18n';

const UNITS = [
  { label: 'year', short: 'y', ms: 365 * 24 * 60 * 60 * 1000 },
  { label: 'month', short: 'mo', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: 'week', short: 'w', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'day', short: 'd', ms: 24 * 60 * 60 * 1000 },
  { label: 'hour', short: 'h', ms: 60 * 60 * 1000 },
  { label: 'minute', short: 'm', ms: 60 * 1000 },
  { label: 'second', short: 's', ms: 1000 },
];

function normalizeDate(input) {
  if (!input) return null;
  // Firestore Timestamp support
  if (typeof input?.toDate === 'function') return input.toDate();
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') {
    const d = new Date(input);
    return isNaN(d) ? null : d;
  }
  return null;
}

export function timeAgo(dateInput, opts = {}) {
  const { short = false } = opts;
  const date = normalizeDate(dateInput);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return short ? '0s' : (i18n.t('time.justNow') || 'just now');

  for (const u of UNITS) {
    if (diff >= u.ms) {
      const v = Math.floor(diff / u.ms);
      if (short) {
        const shortUnit = i18n.t(`time.units.${u.label}.short`) || u.short;
        return `${v}${shortUnit}`;
      }
      const one = i18n.t(`time.units.${u.label}.one`) || u.label;
      const other = i18n.t(`time.units.${u.label}.other`) || `${u.label}s`;
      const unitWord = v === 1 ? one : other;
      const agoWord = i18n.t('time.ago') || 'ago';
      return `${v} ${unitWord} ${agoWord}`;
    }
  }
  return short ? '0s' : (i18n.t('time.justNow') || 'just now');
}

export function fromTimestamp(ts, opts) {
  return timeAgo(ts, opts);
}

export default timeAgo;
