// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: globe-americas;

// ============================================================================
//  FOREX · SESSION BOARD  —  Scriptable widget (visual redesign)
// ============================================================================
//
//  Shows which of the four major FX sessions (Sydney, Tokyo, London,
//  New York) are open right now, when the next open/close happens, a 24h
//  schedule in your local time, and the best / quiet / witching hours.
//
//  SETUP
//   1. Save this script in Scriptable.
//   2. Add a Scriptable widget to your Home Screen or Lock Screen and choose
//      this script. Supported: small, medium, large, plus the Lock Screen
//      circular / rectangular / inline widgets.
//   3. No parameters needed. Times follow your device's local time zone and
//      DST is handled automatically.
//
//  APPEARANCE
//   Colors follow the device's Light / Dark appearance automatically
//   (including "Automatic" switching at sunset). To preview one mode while
//   testing, set THEME_OVERRIDE below to 'light' or 'dark'.
//
//  STANDBY (iPhone on its side while charging)
//   StandBy shows the SMALL widget, scaled up, on a black screen. Scriptable
//   can't tell whether a widget is in StandBy, so the StandBy layout only
//   appears where you ask for it, and your Home Screen small widget is never
//   touched. Two ways, pick one:
//     1. Same script: edit the StandBy widget and set Parameter to: standby
//        (a widget with no parameter keeps the normal layout).
//     2. Separate script: duplicate this script, set STANDBY_ONLY_SCRIPT below
//        to true in the copy, and choose the copy for your StandBy widget.
//   The StandBy layout has a black background, a big live countdown, and
//   open/closed shown by shape (filled dot vs ring) so it still reads in
//   StandBy's red Night Mode.
//
//  NEXT EVENT COUNTDOWN
//   The "Next" block on the small, medium and large widgets has a live
//   ticking timer. It's a system timer, so it keeps counting between refreshes.
//
//  Running the script inside the Scriptable app shows a preview.
// ============================================================================

// Which size to preview when you run the script inside the Scriptable app:
// 'small' | 'medium' | 'large' | 'accessoryRectangular' | 'accessoryCircular' | 'accessoryInline'
const PREVIEW_FAMILY = 'small';

// null = follow the device | 'light' | 'dark' = force one appearance (testing)
const THEME_OVERRIDE = null;

// Leave false in your main script. Set true ONLY in a separate copy that you use
// for your StandBy widget: every small widget running a script with this set to
// true gets the black StandBy layout.
const STANDBY_ONLY_SCRIPT = true;

// Preview the StandBy layout when you run the script inside the Scriptable app
// (also set PREVIEW_FAMILY = 'small'). Has no effect on actual widgets.
const PREVIEW_STANDBY = false;

// ----------------------------------------------------------------------------
//  Session model
// ----------------------------------------------------------------------------
// Hours are LOCAL to each city, so DST shifts are handled automatically.
// `weight` is a rough share of daily FX volume, used to find the busiest and
// quietest hours.
const SESSIONS = [
  { name: 'Sydney',   code: 'SYD', flag: '🇦🇺', tz: 'Australia/Sydney', openLocal: 8, closeLocal: 17, weight: 0.06 },
  { name: 'Tokyo',    code: 'TYO', flag: '🇯🇵', tz: 'Asia/Tokyo',       openLocal: 9, closeLocal: 18, weight: 0.19 },
  { name: 'London',   code: 'LON', flag: '🇬🇧', tz: 'Europe/London',    openLocal: 8, closeLocal: 17, weight: 0.43 },
  { name: 'New York', code: 'NYC', flag: '🇺🇸', tz: 'America/New_York', openLocal: 8, closeLocal: 17, weight: 0.32 },
];

function zoneOffsetMinutes(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  fmt.formatToParts(date).forEach(x => { if (x.type !== 'literal') p[x.type] = x.value; });
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function isOpen(s, utcHourFloat) {
  if (s.startUTC < s.endUTC) return utcHourFloat >= s.startUTC && utcHourFloat < s.endUTC;
  return utcHourFloat >= s.startUTC || utcHourFloat < s.endUTC; // wraps midnight UTC
}

// FX is closed from Friday 17:00 to Sunday 17:00 New York time.
function isWeeklyMarketClosed(now) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hourCycle: 'h23',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(now).forEach(x => { if (x.type !== 'literal') p[x.type] = x.value; });
  const day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  const hour = +p.hour + (+p.minute) / 60;
  return (day === 5 && hour >= 17) || day === 6 || (day === 0 && hour < 17);
}

// The exact minute the weekly close lifts (Sunday 17:00 New York). Used for the
// live countdown. Coarse 30-minute steps, then refined to the minute.
function weekendReopenDate(from) {
  const STEP = 30 * 60000;
  let t = from.getTime();
  for (let i = 0; i < 110 && isWeeklyMarketClosed(new Date(t)); i++) t += STEP;
  if (isWeeklyMarketClosed(new Date(t))) return null;
  for (let k = 1; k <= 30; k++) {
    const probe = t - STEP + k * 60000;
    if (probe >= from.getTime() && !isWeeklyMarketClosed(new Date(probe))) return new Date(probe);
  }
  return new Date(t);
}

// Good Friday via the Meeus/Jones/Butcher Easter algorithm.
function goodFriday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day));
  easter.setUTCDate(easter.getUTCDate() - 2);
  return { month: easter.getUTCMonth() + 1, day: easter.getUTCDate() };
}

// Christmas Day and New Year's Day for everyone; Good Friday for London and Sydney.
function isHolidayClosed(def, now) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: def.tz, month: '2-digit', day: '2-digit', year: 'numeric',
  }).formatToParts(now).forEach(x => { if (x.type !== 'literal') p[x.type] = x.value; });
  const month = +p.month, day = +p.day, year = +p.year;
  if ((month === 12 && day === 25) || (month === 1 && day === 1)) return true;
  if (def.name === 'London' || def.name === 'Sydney') {
    const gf = goodFriday(year);
    return month === gf.month && day === gf.day;
  }
  return false;
}

function hoursToNextBoundary(s, utcHourFloat) {
  let boundary = s.openNow ? s.endUTC : s.startUTC;
  if (boundary <= utcHourFloat) boundary += 24;
  return boundary - utcHourFloat;
}

function fmtCountdown(hoursFloat) {
  const total = Math.max(0, Math.round(hoursFloat * 60));
  const h = Math.floor(total / 60), m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function fmtHM(totalMinutes) {
  const n = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

// Converts a UTC session window to 0–24 positions in the device's local day.
// A window crossing local midnight is split into two segments.
function utcSessionToLocalSegments(startUTC, endUTC, offsetMinutes) {
  const toLocal = h => ((((h * 60 + offsetMinutes) % 1440) + 1440) % 1440) / 60;
  const start = toLocal(startUTC);
  const duration = (endUTC - startUTC + 24) % 24 || 24;
  const end = start + duration;
  return end <= 24 ? [[start, end]] : [[start, 24], [0, end - 24]];
}

function volumeAt(utcHourFloat, sessions) {
  return sessions.reduce((v, s) => v + (isOpen(s, utcHourFloat) ? s.weight : 0), 0);
}

// ----------------------------------------------------------------------------
//  Market state (everything the layouts need, computed once)
// ----------------------------------------------------------------------------
const now = new Date();
const utcHourFloat = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
const marketClosedWeekend = isWeeklyMarketClosed(now);

const sessions = SESSIONS.map(def => {
  const offset = zoneOffsetMinutes(now, def.tz);
  const startUTC = ((((def.openLocal * 60 - offset) % 1440) + 1440) % 1440) / 60;
  const duration = (def.closeLocal - def.openLocal + 24) % 24 || 24;
  const s = {
    ...def,
    startUTC,
    endUTC: (startUTC + duration) % 24,
    holidayClosed: isHolidayClosed(def, now),
    openNow: false,
  };
  s.openNow = isOpen(s, utcHourFloat) && !marketClosedWeekend && !s.holidayClosed;
  return s;
});

const openSessions = sessions.filter(s => s.openNow);

const statusLine = marketClosedWeekend
  ? 'Closed for the weekend'
  : openSessions.length === 0
    ? (sessions.some(s => s.holidayClosed) ? 'Holiday closures in effect' : 'All sessions closed')
    : openSessions.length === 1
      ? `${openSessions[0].name} open`
      : `${openSessions.map(s => s.name).join(' + ')} Overlap`;

let boundaryLine = 'Holiday closures in effect';
let boundaryShort = 'Holiday closures';   // compact form for the small widget
let boundaryDate = null;                  // exact moment of the next open/close
let boundaryLabel = '';                   // e.g. 'NYC OPENS IN' (StandBy countdown caption)
let boundaryPrefix = '';                  // e.g. 'Sydney opens in'  (text before the live timer)
let boundaryPrefixShort = '';             // e.g. 'SYD opens'        (small widget)
if (marketClosedWeekend) {
  boundaryLine = 'Reopens Sunday 5pm NY time';
  boundaryShort = 'Opens Sun 5pm NY';
  boundaryDate = weekendReopenDate(now);
  boundaryLabel = 'REOPENS IN';
  boundaryPrefix = 'Reopens in';
  boundaryPrefixShort = 'Reopens';
} else {
  const nextEvent = sessions
    .filter(s => !s.holidayClosed)
    .map(s => ({ s, hours: hoursToNextBoundary(s, utcHourFloat) }))
    .sort((a, b) => a.hours - b.hours)[0];
  if (nextEvent) {
    const verb = nextEvent.s.openNow ? 'closes' : 'opens';
    boundaryLine = `${nextEvent.s.name} ${verb} in ${fmtCountdown(nextEvent.hours)}`;
    boundaryShort = `${nextEvent.s.code} ${verb} ${fmtCountdown(nextEvent.hours)}`;
    boundaryDate = new Date(now.getTime() + nextEvent.hours * 3600000);
    boundaryLabel = `${nextEvent.s.code} ${verb.toUpperCase()} IN`;
    boundaryPrefix = `${nextEvent.s.name} ${verb} in`;
    boundaryPrefixShort = `${nextEvent.s.code} ${verb}`;
  }
}

// Busiest / quietest local hour, and the NY-close "witching" hour.
const offsetMinutes = -now.getTimezoneOffset();
const volumeByLocalHour = Array.from({ length: 24 }, (_, localHour) => {
  const utcHour = ((((localHour * 60 - offsetMinutes) % 1440) + 1440) % 1440) / 60;
  return volumeAt(utcHour, sessions);
});
const bestIndex = volumeByLocalHour.indexOf(Math.max(...volumeByLocalHour));
const quietIndex = volumeByLocalHour.indexOf(Math.min(...volumeByLocalHour));
const newYork = sessions.find(s => s.name === 'New York');
const witchingSegs = utcSessionToLocalSegments((newYork.endUTC - 1 + 24) % 24, newYork.endUTC, offsetMinutes);

const bestRange = `${fmtHM(bestIndex * 60)}–${fmtHM((bestIndex + 1) * 60)}`;
const quietRange = `${fmtHM(quietIndex * 60)}–${fmtHM((quietIndex + 1) * 60)}`;
const witchingRange =
  `${fmtHM(Math.round(witchingSegs[0][0] * 60))}–${fmtHM(Math.round(witchingSegs[witchingSegs.length - 1][1] * 60))}`;

const asOfShort = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const asOfText = `As of ${asOfShort}`;
const localHourNow = now.getHours() + now.getMinutes() / 60;

function cityTime(s) {
  return now.toLocaleTimeString('en-US', { timeZone: s.tz, hour: '2-digit', minute: '2-digit', hour12: true });
}
function cityCountdown(s) {
  if (marketClosedWeekend) return 'Weekend';
  if (s.holidayClosed) return 'Holiday';
  return `${s.openNow ? 'Closes' : 'Opens'} in ${fmtCountdown(hoursToNextBoundary(s, utcHourFloat))}`;
}
const pad2 = n => String(n).padStart(2, '0');

// ----------------------------------------------------------------------------
//  Theme
// ----------------------------------------------------------------------------
// Every color is a light/dark pair, so the widget follows the device's
// appearance automatically. These are the design tokens from the Figma file.
// To restyle, edit only the hex values below.
function themed(lightHex, darkHex, lightAlpha = 1, darkAlpha = lightAlpha) {
  const l = new Color(lightHex, lightAlpha);
  const d = new Color(darkHex, darkAlpha);
  if (THEME_OVERRIDE === 'light') return l;
  if (THEME_OVERRIDE === 'dark') return d;
  return Color.dynamic(l, d);
}

const C = {
  //                       light      dark
  surface:       themed('#F5F3ED', '#191C1A'),              // widget background
  surfaceRaised: themed('#FBFAF6', '#1F2320'),              // small widget "Next" panel
  ink:           themed('#1D211F', '#EEECE4'),              // primary text
  inkSoft:       themed('#3F4441', '#C6C6BD'),              // secondary values
  muted:         themed('#777C77', '#90958F'),              // labels
  faint:         themed('#A4A7A1', '#666B66'),              // closed codes, scheduled bars
  line:          themed('#202622', '#EBEEE6', 0.10),        // hairlines and borders
  track:         themed('#DFDFD7', '#303530'),              // timeline track
  accent:        themed('#9A7135', '#C59A57'),              // open sessions, highlights
  accentSoft:    themed('#9A7135', '#C59A57', 0.11, 0.12),  // highlight fill
  accentBorder:  themed('#9A7135', '#C59A57', 0.32, 0.30),  // highlight outline
  accentClear:   themed('#9A7135', '#C59A57', 0, 0),        // gradient end
  closed:        themed('#A1A49F', '#5B615C'),              // closed status dot
  quiet:         themed('#866B5F', '#A17A67'),              // quiet-hour marker
  fixing:        themed('#607989', '#7892A1'),              // witching-hour marker
};

// ----------------------------------------------------------------------------
//  Widget size (points). Only used where the layout needs absolute widths,
//  such as the timeline bars. Looked up from the device's screen size.
// ----------------------------------------------------------------------------
// screen "WxH" -> [small side, medium/large width, large height]
const WIDGET_SIZES = {
  '320x568': [141, 292, 311],
  '375x667': [148, 321, 324],
  '375x812': [155, 329, 345],
  '390x844': [158, 338, 354],
  '393x852': [158, 338, 354],
  '402x874': [162, 344, 366],
  '414x736': [159, 348, 357],
  '414x896': [169, 360, 379],
  '428x926': [170, 364, 382],
  '430x932': [170, 364, 382],
  '440x956': [170, 364, 382],
};

function widgetPoints(family) {
  const sc = Device.screenSize();
  const w = Math.min(sc.width, sc.height);
  const h = Math.max(sc.width, sc.height);
  let best = WIDGET_SIZES['390x844'];
  let bestDist = Infinity;
  Object.keys(WIDGET_SIZES).forEach(key => {
    const [kw, kh] = key.split('x').map(Number);
    const dist = Math.abs(kw - w) * 10 + Math.abs(kh - h);
    if (dist < bestDist) { bestDist = dist; best = WIDGET_SIZES[key]; }
  });
  const [small, wide, tall] = best;
  if (family === 'small') return { w: small, h: small };
  if (family === 'medium') return { w: wide, h: small };
  return { w: wide, h: tall };
}

// ----------------------------------------------------------------------------
//  Small layout helpers
// ----------------------------------------------------------------------------
function fontFor(size, weight) {
  switch (weight) {
    case 'bold':     return Font.boldSystemFont(size);
    case 'semibold': return Font.semiboldSystemFont(size);
    case 'medium':   return Font.mediumSystemFont(size);
    default:         return Font.systemFont(size);
  }
}

function txt(parent, str, size, weight, color, o = {}) {
  const t = parent.addText(String(str));
  t.font = fontFor(size, weight);
  if (color) t.textColor = color;
  if (o.lines) t.lineLimit = o.lines;
  if (o.scale) t.minimumScaleFactor = o.scale;
  if (o.opacity !== undefined) t.textOpacity = o.opacity;
  if (o.center) t.centerAlignText();
  return t;
}

function hstack(parent, spacing = 0) {
  const s = parent.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.spacing = spacing;
  return s;
}

function vstack(parent, spacing = 0) {
  const s = parent.addStack();
  s.layoutVertically();
  s.spacing = spacing;
  return s;
}

// Monospaced digits so a ticking timer doesn't jitter. Falls back gracefully.
function monoFont(size) {
  const name = ['semiboldMonospacedSystemFont', 'boldMonospacedSystemFont', 'mediumMonospacedSystemFont', 'regularMonospacedSystemFont']
    .find(n => typeof Font[n] === 'function');
  return name ? Font[name](size) : Font.semiboldSystemFont(size);
}

// Live countdown to the next open/close. A system timer: it keeps ticking by
// itself even when iOS doesn't refresh the widget.
function liveTimer(parent, size, color, o = {}) {
  const t = parent.addDate(boundaryDate);
  t.applyTimerStyle();
  t.font = monoFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  if (o.scale) t.minimumScaleFactor = o.scale;
  t.leftAlignText();
  return t;
}

// Fixed-size empty block. Unlike addSpacer(), which iOS never lets shrink below
// roughly 8pt, this takes exactly the room asked for. Use it in tight rows.
function blank(parent, w, h = 1) {
  const s = parent.addStack();
  s.size = new Size(w, h);
  return s;
}

function dot(parent, color, d = 5) {
  const s = parent.addStack();
  s.size = new Size(d, d);
  s.cornerRadius = d / 2;
  s.backgroundColor = color;
  return s;
}

// Full-width 1pt rule (a horizontal stack with a spacer expands to fill the row).
function hairline(parent) {
  const s = parent.addStack();
  s.layoutHorizontally();
  s.size = new Size(0, 1);
  s.backgroundColor = C.line;
  s.addSpacer();
  return s;
}

// A line of text pushed to the right edge.
function rightLine(parent, str, size, weight, color, o = {}) {
  const r = hstack(parent);
  r.addSpacer();
  txt(r, str, size, weight, color, o);
  return r;
}

function statusLabel(s) {
  return s.holidayClosed ? 'HOLIDAY' : s.openNow ? 'OPEN' : 'CLOSED';
}

// Status dot + OPEN / CLOSED / HOLIDAY, left aligned inside an optional fixed width.
function statusCell(parent, s, fontSize, width) {
  const c = hstack(parent, 5);
  if (width) c.size = new Size(width, 0);
  dot(c, s.openNow ? C.accent : C.closed, 5);
  txt(c, statusLabel(s), fontSize, 'bold', s.openNow ? C.accent : C.muted, { lines: 1, scale: 0.8 });
  c.addSpacer();
  return c;
}

function sectionHeading(parent, left, right) {
  const r = hstack(parent);
  txt(r, left.toUpperCase(), 7.5, 'bold', C.muted, { lines: 1 });
  r.addSpacer();
  txt(r, right, 7.5, 'medium', C.muted, { lines: 1, scale: 0.8 });
  parent.addSpacer(5);
  hairline(parent);
}

// ----------------------------------------------------------------------------
//  SMALL
// ----------------------------------------------------------------------------
function buildSmall(w, SZ) {
  const compact = SZ.h < 150;
  w.setPadding(13, 14, 13, 14);
  const innerW = SZ.w - 28;
  const focus = openSessions[0];

  const top = hstack(w);
  txt(top, 'FX · SESSIONS', 8.5, 'bold', C.muted, { lines: 1 });
  top.addSpacer();
  txt(top, asOfShort, 9.5, 'regular', C.muted, { lines: 1 });

  w.addSpacer(); // the one flexible gap; everything else is a fixed size

  const kicker = openSessions.length > 1 ? 'LIVE OVERLAP' : focus ? 'LIVE SESSION' : 'MARKET STATUS';
  txt(w, kicker, 8.5, 'bold', C.accent, { lines: 1 });
  w.addSpacer(2);
  txt(w, focus ? focus.name : 'Closed', 24, 'semibold', C.ink, { lines: 1, scale: 0.6 });
  if (!compact) {
    w.addSpacer(2);
    txt(w, statusLine, 10, 'regular', C.muted, { lines: 1, scale: 0.75 });
  }
  w.addSpacer(8);

  hairline(w);
  w.addSpacer(6);
  // Four session codes. No spacers: the gap is computed so the row always fits.
  const gapW = Math.max(3, Math.min(8, Math.floor((innerW - 4 * 27) / 3)));
  const row = hstack(w, gapW);
  sessions.forEach(s => {
    const cell = hstack(row, 3.5);
    dot(cell, s.openNow ? C.accent : C.closed, 5);
    txt(cell, s.code, 8, 'bold', s.openNow ? C.ink : C.faint, { lines: 1 });
  });
  w.addSpacer(7);

  // "Next" panel: one line, abbreviated so it never truncates.
  const panel = hstack(w, 5);
  panel.backgroundColor = C.surfaceRaised;
  panel.borderColor = C.line;
  panel.borderWidth = 1;
  panel.cornerRadius = 9;
  panel.setPadding(5, 6, 5, 6);
  panel.size = new Size(innerW, 0);
  if (boundaryDate) {
    // "SYD opens" in the accent color plays the part of the NEXT tag, which
    // leaves room for a live timer on a 158pt-wide widget.
    txt(panel, boundaryPrefixShort, 8.5, 'bold', C.accent, { lines: 1, scale: 0.75 });
    liveTimer(panel, 9.5, C.ink, { scale: 0.75 });
  } else {
    const nextLabel = hstack(panel);
    nextLabel.size = new Size(22, 0);
    txt(nextLabel, 'NEXT', 8, 'bold', C.accent, { lines: 1, scale: 0.8 });
    txt(panel, boundaryShort, 9, 'medium', C.inkSoft, { lines: 1, scale: 0.75 });
  }
  panel.addSpacer();
}

// ----------------------------------------------------------------------------
//  STANDBY (small widget on a black screen, built to be read from across a room)
// ----------------------------------------------------------------------------
// StandBy is always a black screen, so this layout uses fixed dark colors
// instead of the Light/Dark pairs. In Night Mode iOS recolors everything red,
// so meaning is carried by brightness and shape, not by hue.
const SB = {
  bg:     new Color('#000000'),
  ink:    new Color('#F2EFE6'),   // open sessions, hero text
  muted:  new Color('#A0A59F'),   // captions
  faint:  new Color('#6D726D'),   // closed sessions
  accent: new Color('#D4A961'),   // "live" caption, open dot
};

// Hollow circle, used for "closed" so the state doesn't depend on color.
function ring(parent, color, d = 6, borderW = 1.3) {
  const s = parent.addStack();
  s.size = new Size(d, d);
  s.cornerRadius = d / 2;
  s.borderColor = color;
  s.borderWidth = borderW;
  return s;
}

function buildStandBy(w, SZ) {
  const innerW = SZ.w - 28;
  w.setPadding(14, 14, 14, 14);
  const focus = openSessions[0];

  // Caption: what state the market is in.
  const caption = marketClosedWeekend ? 'MARKET CLOSED'
    : openSessions.length > 1 ? 'LIVE OVERLAP'
    : focus ? 'LIVE SESSION' : 'MARKET STATUS';
  txt(w, caption, 9, 'bold', focus ? SB.accent : SB.muted, { lines: 1 });
  w.addSpacer(2);

  // Hero: the open session(s), or why the market is shut.
  const hero = marketClosedWeekend ? 'Weekend'
    : openSessions.length > 1 ? openSessions.map(s => s.code).join(' + ')
    : focus ? focus.name
    : sessions.some(s => s.holidayClosed) ? 'Holiday' : 'Closed';
  txt(w, hero, 28, 'semibold', SB.ink, { lines: 1, scale: 0.55 });

  w.addSpacer(); // the one flexible gap

  // Live countdown. This is a system timer, so it keeps ticking by itself even
  // when iOS doesn't refresh the widget, which a typed-out "1h 03m" can't do.
  if (boundaryDate) {
    txt(w, boundaryLabel, 8.5, 'bold', SB.muted, { lines: 1 });
    w.addSpacer(1);
    liveTimer(w, 25, SB.ink, { scale: 0.6 });
  } else {
    txt(w, boundaryShort, 13, 'semibold', SB.ink, { lines: 1, scale: 0.7 });
  }
  w.addSpacer(9);

  // Sessions: filled dot + bright text = open, ring + dim text = closed.
  const codeSize = innerW >= 126 ? 9 : 8; // narrower phones: slightly smaller codes
  const cellEst = innerW >= 126 ? 28.5 : 26.5;
  const gapW = Math.max(3, Math.min(8, Math.floor((innerW - 4 * cellEst) / 3)));
  const row = hstack(w, gapW);
  sessions.forEach(s => {
    const cell = hstack(row, 3.5);
    if (s.openNow) dot(cell, SB.accent, 6); else ring(cell, SB.faint, 6);
    txt(cell, s.code, codeSize, 'bold', s.openNow ? SB.ink : SB.faint, { lines: 1 });
  });
}

// ----------------------------------------------------------------------------
//  MEDIUM
// ----------------------------------------------------------------------------
function buildMedium(w, SZ) {
  const padV = 14, padH = 14;
  w.setPadding(padV, padH, padV, padH);
  const contentW = SZ.w - padH * 2;
  const contentH = SZ.h - padV * 2;
  const leftW = Math.round(contentW * 0.31), gutter = 10;
  const rightW = contentW - leftW - 1 - gutter * 2;

  const outer = w.addStack();
  outer.layoutHorizontally();
  outer.spacing = 0;
  outer.size = new Size(contentW, contentH);

  // Left: summary
  const left = vstack(outer);
  left.size = new Size(leftW, contentH);
  txt(left, 'FOREX · SESSION BOARD', 7.5, 'bold', C.muted, { lines: 1, scale: 0.7 });
  left.addSpacer(7);
  txt(left, statusLine, 15, 'semibold', C.ink, { lines: 2, scale: 0.7 });
  left.addSpacer(4);
  txt(left, `${asOfText} · Local time`, 8.5, 'regular', C.muted, { lines: 1, scale: 0.7 });
  left.addSpacer();
  hairline(left);
  left.addSpacer(7);
  txt(left, 'NEXT EVENT', 7, 'bold', C.muted, { lines: 1 });
  left.addSpacer(3);
  if (boundaryDate) {
    txt(left, boundaryPrefix, 9.5, 'medium', C.inkSoft, { lines: 1, scale: 0.8 });
    left.addSpacer(1);
    liveTimer(left, 16, C.ink, { scale: 0.6 });
  } else {
    txt(left, boundaryLine, 9.5, 'medium', C.inkSoft, { lines: 2, scale: 0.8 });
  }

  blank(outer, gutter, 1);
  const divider = outer.addStack();
  divider.layoutVertically();
  divider.size = new Size(1, contentH);
  divider.backgroundColor = C.line;
  blank(outer, gutter, 1);

  // Right: one row per city
  const right = vstack(outer);
  right.size = new Size(rightW, contentH); // rows sit centered in this frame
  sessions.forEach((s, i) => {
    const r = hstack(right);
    r.size = new Size(rightW, 28);

    const id = hstack(r, 6);
    txt(id, s.flag, 14, 'regular', C.ink);
    const names = vstack(id, 1);
    txt(names, s.name, 11, 'semibold', C.ink, { lines: 1, scale: 0.8 });
    txt(names, s.code, 7, 'bold', C.muted, { lines: 1 });

    r.addSpacer();
    statusCell(r, s, 7.5, 54);
    txt(r, cityTime(s), 9, 'regular', C.inkSoft, { lines: 1, scale: 0.85 });

    if (i < sessions.length - 1) hairline(right);
  });
}

// ----------------------------------------------------------------------------
//  LARGE
// ----------------------------------------------------------------------------

// One horizontal band of the timeline, painted as adjacent colored cells.
// `intervals` are {a, b, color} in points; gaps get `base` (null = clear).
// A 1.5pt "now" marker is overlaid at nowX.
function paintBand(parent, trackW, h, intervals, base, nowX, nowW = 1.5, nowRadius = 0) {
  const nowA = nowX - nowW / 2, nowB = nowX + nowW / 2;
  const cuts = new Set([0, trackW, nowA, nowB]);
  intervals.forEach(it => { cuts.add(it.a); cuts.add(it.b); });
  const xs = Array.from(cuts).filter(x => x >= 0 && x <= trackW).sort((p, q) => p - q);

  const band = parent.addStack();
  band.layoutHorizontally();
  band.spacing = 0;
  band.size = new Size(trackW, h);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    if (b - a < 0.1) continue;
    const mid = (a + b) / 2;
    let color = base;
    intervals.forEach(it => { if (mid >= it.a && mid < it.b) color = it.color; });
    const isNow = mid >= nowA && mid < nowB;
    if (isNow) color = C.accent;
    const cell = band.addStack();
    cell.size = new Size(b - a, h);
    if (color) cell.backgroundColor = color;
    if (isNow && nowRadius) cell.cornerRadius = nowRadius;
  }
  return band;
}

function buildLarge(w, SZ) {
  const padV = 13, padH = 14;
  w.setPadding(padV, padH, padV, padH);
  const contentW = SZ.w - padH * 2;
  const tier = SZ.h < 340 ? 'tight' : SZ.h < 365 ? 'regular' : 'roomy';
  const tight = tier === 'tight';
  const gap = { tight: 5, regular: 7, roomy: 10 }[tier];
  const rowH = { tight: 22, regular: 25, roomy: 28 }[tier];

  // Header
  const head = hstack(w);
  head.topAlignContent();
  const titleBox = vstack(head, 3);
  titleBox.size = new Size(contentW - 106, 0); // leaves room for the status badge
  txt(titleBox, 'FOREX · SESSION BOARD', 7.5, 'bold', C.muted, { lines: 1 });
  txt(titleBox, statusLine, tight ? 18 : 20, 'semibold', C.ink, { lines: 1, scale: 0.65 });
  head.addSpacer();
  const badge = hstack(head, 5);
  badge.borderColor = C.line;
  badge.borderWidth = 1;
  badge.cornerRadius = 11;
  badge.setPadding(5, 8, 5, 8);
  dot(badge, openSessions.length ? C.accent : C.closed, 5);
  txt(badge, openSessions.length ? 'MARKET ACTIVE' : 'MARKET CLOSED', 7.5, 'bold', C.muted, { lines: 1 });

  w.addSpacer(gap);

  // Next market event. Fixed columns, so the countdown keeps its full size.
  const asOfW = tight ? 0 : 78;
  const next = hstack(w);
  next.size = new Size(contentW, 0);
  next.backgroundColor = C.accentSoft;
  next.borderColor = C.accentBorder;
  next.borderWidth = 1;
  next.cornerRadius = 10;
  next.setPadding(7, 10, 7, 10);
  const nextText = vstack(next, 2);
  nextText.size = new Size(contentW - 22 - asOfW, 0);
  txt(nextText, 'NEXT MARKET EVENT', 7.5, 'bold', C.muted, { lines: 1 });
  if (boundaryDate) {
    const line = hstack(nextText, 5);
    txt(line, boundaryPrefix, 12.5, 'semibold', C.ink, { lines: 1, scale: 0.7 });
    liveTimer(line, 12.5, C.ink, { scale: 0.7 });
  } else {
    txt(nextText, boundaryLine, 12.5, 'semibold', C.ink, { lines: 1, scale: 0.7 });
  }
  if (!tight) {
    const asOf = vstack(next, 1);
    asOf.size = new Size(asOfW, 0);
    rightLine(asOf, asOfText, 8.5, 'regular', C.muted, { lines: 1, scale: 0.8 });
    rightLine(asOf, 'Device local time', 8.5, 'regular', C.muted, { lines: 1, scale: 0.8 });
  }

  w.addSpacer(gap);

  // Global sessions
  sectionHeading(w, 'Global sessions', 'Status · Local market time');
  const idW = Math.round(contentW * 0.42);
  const stW = Math.round(contentW * 0.2);
  const tmW = contentW - idW - stW;

  const openGradient = new LinearGradient();
  openGradient.colors = [C.accentSoft, C.accentClear, C.accentClear];
  openGradient.locations = [0, 0.42, 1];
  openGradient.startPoint = new Point(0, 0.5);
  openGradient.endPoint = new Point(1, 0.5);

  sessions.forEach(s => {
    const r = hstack(w);
    r.size = new Size(contentW, rowH);
    if (s.openNow) r.backgroundGradient = openGradient;

    const id = hstack(r, 8);
    id.size = new Size(idW, 0);
    txt(id, s.flag, 15, 'regular', C.ink);
    const names = vstack(id, 1);
    txt(names, s.name, 11.5, 'semibold', C.ink, { lines: 1, scale: 0.8 });
    txt(names, `${pad2(s.openLocal)}:00–${pad2(s.closeLocal)}:00 LOCAL`, 7, 'bold', C.muted, { lines: 1, scale: 0.8 });
    id.addSpacer();

    statusCell(r, s, 8, stW);

    const times = vstack(r, 2);
    times.size = new Size(tmW, 0);
    rightLine(times, cityTime(s), 10.5, 'semibold', C.inkSoft, { lines: 1 });
    rightLine(times, cityCountdown(s), 7.5, 'regular', C.muted, { lines: 1, scale: 0.8 });

    hairline(w);
  });

  w.addSpacer(gap + 2);

  // Today's schedule
  sectionHeading(w, 'Today’s schedule', 'Your local time');
  w.addSpacer(7);

  const labW = 30;
  const trackW = contentW - labW - 6; // small safety margin so rows never overflow
  const nowX = Math.min(Math.max((localHourNow / 24) * trackW, 3), trackW - 3);

  const scale = hstack(w);
  blank(scale, labW, 1);
  const ticks = hstack(scale);
  ticks.size = new Size(trackW, 0);
  ['00', '06', '12', '18', '24'].forEach((t, i) => {
    txt(ticks, t, 7, 'regular', C.faint, { lines: 1 });
    if (i < 4) ticks.addSpacer();
  });
  w.addSpacer(3);

  const bandLine = (label, intervals, base, h, nowW = 1.5, nowRadius = 0) => {
    const line = hstack(w);
    const lab = hstack(line);
    lab.size = new Size(labW, h);
    if (label) txt(lab, label, 7, 'bold', C.muted, { lines: 1 });
    lab.addSpacer();
    return paintBand(line, trackW, h, intervals, base, nowX, nowW, nowRadius);
  };

  // "now" marker head: same cell construction as the bars, so it always lines up
  bandLine(null, [], null, 5, 5, 2.5);

  sessions.forEach(s => {
    const color = s.openNow ? C.accent : C.faint;
    const intervals = utcSessionToLocalSegments(s.startUTC, s.endUTC, offsetMinutes)
      .map(([a, b]) => ({ a: (a / 24) * trackW, b: (b / 24) * trackW, color }));
    const band = bandLine(s.code, intervals, C.track, 5);
    band.cornerRadius = 2;
    bandLine(null, [], null, 4); // gap row keeps the "now" line continuous
  });
  w.addSpacer(gap);

  // Market windows
  hairline(w);
  w.addSpacer(8);
  const windows = hstack(w);
  [
    ['BEST LIQUIDITY', bestRange, C.accent],
    ['QUIET HOUR', quietRange, C.quiet],
    ['WITCHING HOUR', witchingRange, C.fixing],
  ].forEach(([label, value, color], i) => {
    const cell = hstack(windows, 6);
    const bar = cell.addStack();
    bar.size = new Size(2, 24);
    bar.cornerRadius = 1;
    bar.backgroundColor = color;
    const t = vstack(cell, 2);
    txt(t, label, 7, 'bold', C.muted, { lines: 1, scale: 0.8 });
    txt(t, value, 10, 'medium', C.inkSoft, { lines: 1 });
    if (i < 2) windows.addSpacer();
  });

  w.addSpacer();
}

// ----------------------------------------------------------------------------
//  LOCK SCREEN (accessory) widgets. iOS tints these, so no custom colors.
// ----------------------------------------------------------------------------
function buildAccessoryRectangular(w) {
  const row = hstack(w, 8);
  txt(row, openSessions.length ? '●' : '○', 9, 'regular');
  const col = vstack(row, 2);
  txt(col, statusLine, 12, 'semibold', null, { lines: 1, scale: 0.7 });
  txt(col, boundaryLine, 10, 'regular', null, { lines: 1, scale: 0.7, opacity: 0.7 });
  row.addSpacer();
}

function buildAccessoryInline(w) {
  // The inline slot is only ~20 characters wide, so Overlaps use city codes.
  const short = openSessions.length > 1
    ? `${openSessions.map(s => s.code).join('+')} Overlap`
    : statusLine;
  txt(w, `FX · ${short}`, 12, 'regular', null, { lines: 1, scale: 0.6 });
}

function buildAccessoryCircular(w) {
  w.addSpacer();
  txt(w, marketClosedWeekend ? '–' : openSessions.length, 18, 'bold', null, { center: true });
  txt(w, 'OPEN', 7, 'bold', null, { center: true, opacity: 0.7 });
  w.addSpacer();
}

// ----------------------------------------------------------------------------
//  Build + present
// ----------------------------------------------------------------------------
const family = config.widgetFamily || PREVIEW_FAMILY;
const isAccessory = family.startsWith('accessory');
const SZ = widgetPoints(family);
const widgetParam = String((typeof args !== 'undefined' && args.widgetParameter) || '').trim().toLowerCase();
const useStandBy = family === 'small' &&
  (STANDBY_ONLY_SCRIPT || widgetParam === 'standby' || (!config.runsInWidget && PREVIEW_STANDBY));

const widget = new ListWidget();
widget.spacing = 0;
if (isAccessory) {
  widget.useDefaultPadding();
} else {
  widget.backgroundColor = useStandBy ? SB.bg : C.surface;
}

switch (family) {
  case 'medium':               buildMedium(widget, SZ); break;
  case 'large':                buildLarge(widget, SZ); break;
  case 'accessoryRectangular': buildAccessoryRectangular(widget); break;
  case 'accessoryInline':      buildAccessoryInline(widget); break;
  case 'accessoryCircular':    buildAccessoryCircular(widget); break;
  default:                     useStandBy ? buildStandBy(widget, SZ) : buildSmall(widget, SZ);
}

// Ask iOS to refresh about every minute, and again right when the next session
// opens or closes (iOS decides the real cadence).
const nextRefresh = Math.min(
  Date.now() + 60 * 1000,
  boundaryDate ? boundaryDate.getTime() + 1000 : Infinity
);
widget.refreshAfterDate = new Date(Math.max(nextRefresh, Date.now() + 5000));

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  switch (family) {
    case 'medium':               await widget.presentMedium(); break;
    case 'large':                await widget.presentLarge(); break;
    case 'accessoryRectangular': await widget.presentAccessoryRectangular(); break;
    case 'accessoryInline':      await widget.presentAccessoryInline(); break;
    case 'accessoryCircular':    await widget.presentAccessoryCircular(); break;
    default:                     await widget.presentSmall();
  }
}
Script.complete();
