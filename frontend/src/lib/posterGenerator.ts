import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type PosterType = 'election' | 'event' | 'workshop';
export type PosterTheme = 'blue' | 'gold' | 'green' | 'purple' | 'crimson' | 'midnight';

export interface PosterData {
  type: PosterType;
  title: string;
  subtitle?: string;
  date: string;
  /** Optional explicit end date (workshops span multiple days). */
  endDate?: string;
  time?: string;
  location?: string;
  /** Online / In-person / Hybrid */
  mode?: string;
  description?: string;
  /** Registration deadline (ISO or human string). */
  registrationDeadline?: string;
  /** Fee label, e.g. "Free" or "৳500". */
  fee?: string;
  /** Capacity / seats label, e.g. "120 seats". */
  capacity?: string;
  /** Difficulty / audience level, e.g. "Beginner". */
  level?: string;
  /** Category / track, e.g. "AI & ML". */
  category?: string;
  /** Organizer / host line. */
  organizer?: string;
  /** Call-to-action line, e.g. "Register now at ...". */
  cta?: string;
  /** Free-form highlight chips. */
  additionalInfo?: string[];
  theme?: PosterTheme;
}

type ThemePalette = {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  ink: string;
};

const THEMES: Record<PosterTheme, ThemePalette> = {
  blue:     { primary: '#2563eb', secondary: '#1e40af', accent: '#60a5fa', ink: '#0b1220', gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' },
  gold:     { primary: '#d97706', secondary: '#b45309', accent: '#fbbf24', ink: '#1c1206', gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' },
  green:    { primary: '#059669', secondary: '#047857', accent: '#34d399', ink: '#04140e', gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' },
  purple:   { primary: '#7c3aed', secondary: '#6d28d9', accent: '#a78bfa', ink: '#140a24', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
  crimson:  { primary: '#e11d48', secondary: '#9f1239', accent: '#fb7185', ink: '#1a060c', gradient: 'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)' },
  midnight: { primary: '#0ea5e9', secondary: '#0369a1', accent: '#38bdf8', ink: '#020617', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 100%)' },
};

export const POSTER_THEMES: Array<{ id: PosterTheme; label: string; swatch: string }> = [
  { id: 'blue', label: 'Ocean', swatch: '#2563eb' },
  { id: 'gold', label: 'Amber', swatch: '#d97706' },
  { id: 'green', label: 'Emerald', swatch: '#059669' },
  { id: 'purple', label: 'Violet', swatch: '#7c3aed' },
  { id: 'crimson', label: 'Crimson', swatch: '#e11d48' },
  { id: 'midnight', label: 'Midnight', swatch: '#0ea5e9' },
];

// ── Crisp inline SVG icons (render reliably in html2canvas, unlike emoji) ──
const ICONS = {
  calendar: `<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  pin: `<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>`,
  tag: `<path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>`,
  ticket: `<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2v0a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4Z"/>`,
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/>`,
  level: `<path d="M4 20V10M10 20V4M16 20v-7M22 20h-20"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>`,
  hourglass: `<path d="M6 3h12M6 21h12M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9"/>`,
  spark: `<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>`,
};

function icon(name: keyof typeof ICONS, color = '#fff', size = 34): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

const esc = (s?: string) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtLong(value?: string, fallback = ''): string {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : (value || fallback);
}

function fmtRange(start?: string, end?: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  if (s && e && s.toDateString() !== e.toDateString()) {
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opt)} – ${e.toLocaleDateString('en-US', { ...opt, year: 'numeric' })}`;
  }
  return fmtLong(start);
}

export async function generatePoster(data: PosterData): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1080px';
  container.style.height = '1350px'; // 4:5 portrait — ideal for social feeds
  document.body.appendChild(container);
  container.innerHTML = createPosterHTML(data);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      width: 1080,
      height: 1350,
    });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadPoster(data: PosterData, filename?: string): Promise<void> {
  const imageData = await generatePoster(data);
  const link = document.createElement('a');
  link.href = imageData;
  link.download = filename || `${data.type}-poster-${Date.now()}.png`;
  link.click();
}

export async function downloadPosterAsPDF(data: PosterData, filename?: string): Promise<void> {
  const imageData = await generatePoster(data);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350] });
  pdf.addImage(imageData, 'PNG', 0, 0, 1080, 1350);
  pdf.save(filename || `${data.type}-poster-${Date.now()}.pdf`);
}

function createPosterHTML(data: PosterData): string {
  const theme = THEMES[data.theme || 'blue'];
  if (data.type === 'election') return createElectionPoster(data, theme);
  if (data.type === 'workshop') return createWorkshopPoster(data, theme);
  return createEventPoster(data, theme);
}

// Shared building blocks ----------------------------------------------------

function logoBar(invert: boolean): string {
  const f = invert ? 'filter: brightness(0) invert(1);' : '';
  return `
    <div style="display:flex;justify-content:center;align-items:center;gap:46px;">
      <img src="/images/du_logo.png" style="height:78px;${f}" />
      <div style="width:2px;height:60px;background:${invert ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.15)'};"></div>
      <img src="/images/cseduStudentCLubLogo.png" style="height:78px;" />
      <div style="width:2px;height:60px;background:${invert ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.15)'};"></div>
      <img src="/images/csedu_logo.png" style="height:78px;${f}" />
    </div>`;
}

/** A compact info tile with an icon, label, and value. */
function infoTile(
  ic: keyof typeof ICONS,
  label: string,
  value: string,
  theme: ThemePalette,
  opts: { dark?: boolean } = {}
): string {
  const dark = opts.dark;
  return `
    <div style="
      display:flex;align-items:center;gap:18px;
      background:${dark ? 'rgba(255,255,255,0.07)' : '#ffffff'};
      border:2px solid ${dark ? 'rgba(255,255,255,0.14)' : theme.primary + '22'};
      border-radius:22px;padding:24px 26px;
      box-shadow:${dark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : '0 8px 26px rgba(15,23,42,0.08)'};
    ">
      <div style="width:60px;height:60px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${theme.gradient};box-shadow:0 8px 20px ${theme.primary}44;">
        ${icon(ic, '#ffffff', 30)}
      </div>
      <div style="min-width:0;">
        <div style="font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${dark ? 'rgba(255,255,255,0.6)' : '#94a3b8'};margin-bottom:6px;">${esc(label)}</div>
        <div style="font-size:24px;font-weight:800;line-height:1.15;color:${dark ? '#ffffff' : '#0f172a'};">${esc(value)}</div>
      </div>
    </div>`;
}

function chip(text: string, theme: ThemePalette): string {
  return `
    <div style="display:inline-flex;align-items:center;gap:8px;background:#ffffff;border:2px solid ${theme.primary};border-radius:999px;padding:11px 22px;font-size:16px;font-weight:800;color:${theme.primary};box-shadow:0 4px 12px rgba(15,23,42,0.06);">
      ${icon('spark', theme.primary, 16)} ${esc(text)}
    </div>`;
}

function ribbon(text: string, theme: ThemePalette): string {
  return `
    <div style="display:inline-flex;align-items:center;gap:12px;background:${theme.gradient};padding:13px 34px;border-radius:999px;box-shadow:0 10px 26px ${theme.primary}44;">
      ${icon('spark', '#ffffff', 22)}
      <span style="font-size:18px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:4px;">${esc(text)}</span>
    </div>`;
}

// Event poster --------------------------------------------------------------

function createEventPoster(data: PosterData, theme: ThemePalette): string {
  const tiles: string[] = [];
  tiles.push(infoTile('calendar', 'Date', fmtRange(data.date, data.endDate), theme));
  if (data.time) tiles.push(infoTile('clock', 'Time', data.time, theme));
  if (data.location) tiles.push(infoTile('pin', data.mode || 'Venue', data.location, theme));
  if (data.registrationDeadline) tiles.push(infoTile('hourglass', 'Register By', fmtLong(data.registrationDeadline), theme));
  if (data.fee) tiles.push(infoTile('ticket', 'Entry', data.fee, theme));
  if (data.capacity) tiles.push(infoTile('users', 'Capacity', data.capacity, theme));

  const highlightChips = (data.additionalInfo || []).filter(Boolean);

  return `
    <div style="width:1080px;height:1350px;background:#ffffff;position:relative;overflow:hidden;font-family:'Inter','Segoe UI',-apple-system,sans-serif;">
      <!-- Top hero band -->
      <div style="position:absolute;top:0;left:0;right:0;height:560px;background:${theme.gradient};clip-path:polygon(0 0,100% 0,100% 82%,0 100%);"></div>
      <div style="position:absolute;top:-160px;right:-160px;width:520px;height:520px;background:radial-gradient(circle,rgba(255,255,255,0.18),transparent 70%);"></div>
      <div style="position:absolute;top:40px;left:40px;right:40px;height:480px;border:2px solid rgba(255,255,255,0.22);border-radius:34px;pointer-events:none;"></div>

      <!-- Logos -->
      <div style="position:absolute;top:64px;left:60px;right:60px;z-index:10;">
        ${logoBar(true)}
      </div>

      <!-- Ribbon + title -->
      <div style="position:absolute;top:210px;left:70px;right:70px;text-align:center;z-index:10;">
        <div style="margin-bottom:26px;">${ribbon(data.category ? `${esc(data.category)} Event` : 'Upcoming Event', theme)}</div>
        <h1 style="font-size:78px;font-weight:900;color:#fff;margin:0 0 18px;line-height:1.02;letter-spacing:-1.5px;text-transform:uppercase;text-shadow:0 6px 26px rgba(0,0,0,0.28);">${esc(data.title)}</h1>
        ${data.subtitle ? `<p style="font-size:27px;color:rgba(255,255,255,0.95);margin:0;font-weight:600;text-shadow:0 2px 10px rgba(0,0,0,0.2);">${esc(data.subtitle)}</p>` : ''}
      </div>

      <!-- Info tiles -->
      <div style="position:absolute;top:640px;left:70px;right:70px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;">
          ${tiles.join('')}
        </div>

        ${data.description ? `
          <div style="margin-top:26px;background:linear-gradient(135deg,${theme.primary}0d,${theme.accent}0d);border:2px solid ${theme.primary}22;border-radius:24px;padding:34px 38px;">
            <p style="font-size:22px;color:#334155;line-height:1.65;margin:0;font-weight:500;text-align:center;">${esc(data.description)}</p>
          </div>` : ''}

        ${highlightChips.length ? `
          <div style="margin-top:26px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">
            ${highlightChips.map((c) => chip(c, theme)).join('')}
          </div>` : ''}

        ${data.cta ? `
          <div style="margin-top:26px;text-align:center;">
            <div style="display:inline-block;background:${theme.gradient};color:#fff;font-size:22px;font-weight:800;padding:18px 46px;border-radius:999px;box-shadow:0 14px 34px ${theme.primary}44;">${esc(data.cta)}</div>
          </div>` : ''}
      </div>

      <!-- Footer -->
      <div style="position:absolute;bottom:44px;left:70px;right:70px;display:flex;justify-content:space-between;align-items:center;padding-top:24px;border-top:2px solid #eef2f7;">
        <div style="font-size:16px;color:#64748b;font-weight:800;letter-spacing:0.4px;line-height:1.5;">
          <div style="color:#0f172a;">COMPUTER SCIENCE &amp; ENGINEERING</div>
          <div>UNIVERSITY OF DHAKA</div>
        </div>
        <div style="font-size:15px;font-weight:800;color:${theme.primary};background:${theme.primary}12;padding:9px 20px;border-radius:999px;">
          ${esc(data.organizer || "CSEDU Students' Club")}
        </div>
      </div>
    </div>`;
}

// Workshop poster -----------------------------------------------------------

function createWorkshopPoster(data: PosterData, theme: ThemePalette): string {
  const start = parseDate(data.date);
  const monthShort = start ? start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const day = start ? start.getDate() : '';
  const year = start ? start.getFullYear() : '';

  const rows: string[] = [];
  if (data.time) rows.push(infoTile('clock', 'Time', data.time, theme));
  if (data.location) rows.push(infoTile(data.mode === 'Online' ? 'globe' : 'pin', data.mode || 'Venue', data.location, theme));
  if (data.registrationDeadline) rows.push(infoTile('hourglass', 'Register By', fmtLong(data.registrationDeadline), theme));

  const metaChips: string[] = [];
  if (data.fee) metaChips.push(data.fee);
  if (data.level) metaChips.push(data.level);
  if (data.capacity) metaChips.push(data.capacity);
  (data.additionalInfo || []).forEach((c) => c && metaChips.push(c));

  return `
    <div style="width:1080px;height:1350px;background:linear-gradient(160deg,#ffffff 0%,#f6f8fc 100%);position:relative;overflow:hidden;font-family:'Inter','Segoe UI',-apple-system,sans-serif;">
      <div style="position:absolute;top:0;left:0;right:0;height:14px;background:${theme.gradient};"></div>
      <div style="position:absolute;top:-140px;left:-140px;width:420px;height:420px;background:radial-gradient(circle,${theme.primary}18,transparent 70%);"></div>
      <div style="position:absolute;bottom:-160px;right:-160px;width:460px;height:460px;background:radial-gradient(circle,${theme.accent}20,transparent 70%);"></div>

      <!-- Logo panel -->
      <div style="position:absolute;top:56px;left:60px;right:60px;padding:26px;background:#fff;border-radius:24px;box-shadow:0 10px 34px rgba(15,23,42,0.08);border:2px solid ${theme.primary}14;">
        ${logoBar(false)}
      </div>

      <!-- Badge -->
      <div style="position:absolute;top:236px;left:60px;right:60px;text-align:center;">
        ${ribbon(data.category ? `${esc(data.category)} Workshop` : 'Hands-on Workshop', theme)}
      </div>

      <!-- Title -->
      <div style="position:absolute;top:322px;left:60px;right:60px;text-align:center;">
        <h1 style="font-size:70px;font-weight:900;color:#0f172a;margin:0 0 16px;line-height:1.04;letter-spacing:-1.5px;text-transform:uppercase;">${esc(data.title)}</h1>
        ${data.subtitle ? `<p style="font-size:26px;color:#64748b;margin:0;font-weight:600;line-height:1.4;">${esc(data.subtitle)}</p>` : ''}
      </div>

      <!-- Date block + details -->
      <div style="position:absolute;top:560px;left:60px;right:60px;">
        <div style="display:flex;gap:26px;align-items:stretch;">
          <!-- Calendar tile -->
          <div style="flex:0 0 220px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.1);border:3px solid ${theme.primary};">
            <div style="background:${theme.gradient};padding:16px;text-align:center;font-size:18px;font-weight:900;color:#fff;letter-spacing:3px;">${monthShort}</div>
            <div style="padding:22px;text-align:center;">
              <div style="font-size:82px;font-weight:900;color:${theme.primary};line-height:1;">${day}</div>
              <div style="font-size:20px;font-weight:800;color:#64748b;margin-top:6px;">${year}</div>
              ${data.endDate && parseDate(data.endDate)?.toDateString() !== start?.toDateString() ? `<div style="margin-top:8px;font-size:14px;font-weight:700;color:${theme.primary};background:${theme.primary}12;border-radius:999px;padding:4px 10px;display:inline-block;">Multi-day</div>` : ''}
            </div>
          </div>
          <!-- Detail rows -->
          <div style="flex:1;display:flex;flex-direction:column;gap:16px;">
            ${rows.join('') || infoTile('calendar', 'Date', fmtRange(data.date, data.endDate), theme)}
          </div>
        </div>

        ${data.description ? `
          <div style="margin-top:24px;background:${theme.gradient};border-radius:24px;padding:34px 40px;position:relative;overflow:hidden;box-shadow:0 12px 36px ${theme.primary}30;">
            <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:rgba(255,255,255,0.12);border-radius:50%;"></div>
            <p style="font-size:22px;color:#fff;line-height:1.65;margin:0;font-weight:600;position:relative;z-index:1;text-align:center;">${esc(data.description)}</p>
          </div>` : ''}

        ${metaChips.length ? `
          <div style="margin-top:24px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">
            ${metaChips.map((c) => chip(c, theme)).join('')}
          </div>` : ''}
      </div>

      <!-- Footer -->
      <div style="position:absolute;bottom:40px;left:60px;right:60px;text-align:center;padding:22px;background:rgba(255,255,255,0.85);border-radius:20px;border:2px solid ${theme.primary}14;">
        <div style="color:#0f172a;font-size:18px;font-weight:800;margin-bottom:3px;">COMPUTER SCIENCE &amp; ENGINEERING</div>
        <div style="font-size:15px;color:#64748b;font-weight:700;letter-spacing:0.5px;">UNIVERSITY OF DHAKA · ${esc(data.organizer || "CSEDU Students' Club")}</div>
      </div>
    </div>`;
}

// Election poster (kept, adapted to 4:5 canvas) -----------------------------

function createElectionPoster(data: PosterData, theme: ThemePalette): string {
  const year = parseDate(data.date)?.getFullYear() ?? new Date().getFullYear();
  return `
    <div style="width:1080px;height:1350px;background:linear-gradient(160deg,#0a0e27 0%,#151a35 55%,#20264a 100%);position:relative;overflow:hidden;font-family:'Inter','Segoe UI',-apple-system,sans-serif;">
      <div style="position:absolute;top:-200px;right:-200px;width:620px;height:620px;background:radial-gradient(circle,${theme.primary}40,transparent 70%);filter:blur(90px);"></div>
      <div style="position:absolute;bottom:-240px;left:-240px;width:700px;height:700px;background:radial-gradient(circle,${theme.accent}30,transparent 70%);filter:blur(110px);"></div>

      <div style="position:absolute;top:60px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:center;z-index:10;">
        ${logoBar(true)}
        <div style="background:${theme.gradient};padding:14px 30px;border-radius:999px;font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:2px;box-shadow:0 10px 26px rgba(0,0,0,0.4);">Election ${year}</div>
      </div>

      <div style="position:absolute;top:300px;left:70px;right:70px;z-index:5;">
        <div style="font-size:118px;font-weight:900;color:#fff;line-height:0.95;letter-spacing:-3px;text-shadow:0 6px 30px rgba(0,0,0,0.7);">YOUR VOTE</div>
        <div style="font-size:118px;font-weight:900;background:${theme.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:0.95;letter-spacing:-3px;">MATTERS</div>
        <div style="margin-top:24px;font-size:27px;color:rgba(255,255,255,0.82);font-weight:600;">${esc(data.subtitle || "Shape the future of CSEDU Students' Club")}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px;">
          ${infoTile('calendar', 'Election Date', fmtLong(data.date), theme, { dark: true })}
          ${infoTile('clock', 'Voting Hours', data.time || '9:00 AM – 5:00 PM', theme, { dark: true })}
        </div>

        <div style="margin-top:34px;background:${theme.gradient};border-radius:26px;padding:42px 46px;text-align:center;box-shadow:0 20px 56px ${theme.primary}44;">
          <div style="font-size:30px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Every Voice Counts</div>
          <div style="font-size:20px;color:rgba(255,255,255,0.95);line-height:1.6;font-weight:500;">${esc(data.description || 'Exercise your democratic right. Be the change you want to see.')}</div>
        </div>
      </div>

      <div style="position:absolute;bottom:50px;left:70px;right:70px;display:flex;justify-content:space-between;align-items:center;padding-top:30px;border-top:2px solid rgba(255,255,255,0.12);">
        <div style="color:rgba(255,255,255,0.75);font-size:17px;font-weight:700;line-height:1.5;">
          <div>COMPUTER SCIENCE &amp; ENGINEERING</div><div>UNIVERSITY OF DHAKA</div>
        </div>
        <div style="background:rgba(255,255,255,0.1);padding:10px 24px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.9);font-size:15px;font-weight:700;letter-spacing:1px;">#CSEDUSC${year}</div>
      </div>
    </div>`;
}
