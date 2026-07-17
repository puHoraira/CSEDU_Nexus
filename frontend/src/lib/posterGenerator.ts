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
      display:flex;align-items:center;gap:20px;
      background:${dark ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#ffffff,#fefeff)'};
      border:3px solid ${dark ? 'rgba(255,255,255,0.16)' : theme.primary + '24'};
      border-radius:24px;padding:26px 28px;
      box-shadow:${dark ? 'inset 0 2px 0 rgba(255,255,255,0.1),0 8px 24px rgba(0,0,0,0.15)' : '0 10px 32px rgba(15,23,42,0.09),0 4px 12px rgba(15,23,42,0.04)'};
      transition:all 0.3s ease;
    ">
      <div style="width:64px;height:64px;border-radius:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${theme.gradient};box-shadow:0 10px 26px ${theme.primary}48,inset 0 2px 0 rgba(255,255,255,0.2);">
        ${icon(ic, '#ffffff', 32)}
      </div>
      <div style="min-width:0;flex:1;">
        <div style="font-size:14px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${dark ? 'rgba(255,255,255,0.65)' : '#94a3b8'};margin-bottom:7px;">${esc(label)}</div>
        <div style="font-size:25px;font-weight:900;line-height:1.1;color:${dark ? '#ffffff' : '#0f172a'};">${esc(value)}</div>
      </div>
    </div>`;
}

function chip(text: string, theme: ThemePalette): string {
  return `
    <div style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#ffffff,#fefeff);border:3px solid ${theme.primary};border-radius:999px;padding:13px 26px;font-size:17px;font-weight:900;color:${theme.primary};box-shadow:0 6px 18px rgba(15,23,42,0.08),0 2px 6px rgba(15,23,42,0.04);">
      ${icon('spark', theme.primary, 18)} ${esc(text)}
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
    <div style="width:1080px;height:1350px;background:linear-gradient(160deg, #ffffff 0%, #f8fafc 100%);position:relative;overflow:hidden;font-family:'Inter','Segoe UI',-apple-system,sans-serif;">
      <!-- Geometric pattern overlays -->
      <div style="position:absolute;top:0;left:0;right:0;height:640px;background:${theme.gradient};clip-path:polygon(0 0,100% 0,100% 85%,0 100%);box-shadow:0 20px 60px rgba(0,0,0,0.15);"></div>
      
      <!-- Decorative circles -->
      <div style="position:absolute;top:-120px;right:-120px;width:480px;height:480px;background:radial-gradient(circle,rgba(255,255,255,0.22),transparent 65%);"></div>
      <div style="position:absolute;top:-80px;right:-80px;width:400px;height:400px;border:3px solid rgba(255,255,255,0.15);border-radius:50%;"></div>
      <div style="position:absolute;bottom:-100px;left:-100px;width:360px;height:360px;background:radial-gradient(circle,${theme.accent}18,transparent 70%);"></div>
      
      <!-- Accent lines -->
      <div style="position:absolute;top:50px;left:50px;right:50px;height:520px;border:3px solid rgba(255,255,255,0.18);border-radius:40px;pointer-events:none;"></div>

      <!-- Logos with enhanced backdrop -->
      <div style="position:absolute;top:70px;left:60px;right:60px;z-index:10;background:rgba(255,255,255,0.08);backdrop-filter:blur(8px);border-radius:28px;padding:22px;border:2px solid rgba(255,255,255,0.12);">
        ${logoBar(true)}
      </div>

      <!-- Badge + title section -->
      <div style="position:absolute;top:230px;left:70px;right:70px;text-align:center;z-index:10;">
        <div style="margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;gap:14px;background:rgba(255,255,255,0.14);backdrop-filter:blur(10px);padding:14px 38px;border-radius:999px;box-shadow:0 12px 32px rgba(0,0,0,0.2);border:2px solid rgba(255,255,255,0.2);">
            ${icon('spark', '#ffffff', 24)}
            <span style="font-size:20px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:4.5px;">${esc(data.category || 'Special Event')}</span>
          </div>
        </div>
        
        <h1 style="font-size:84px;font-weight:900;color:#fff;margin:0 0 20px;line-height:0.98;letter-spacing:-2.5px;text-transform:uppercase;text-shadow:0 8px 32px rgba(0,0,0,0.35),0 2px 8px rgba(0,0,0,0.2);">${esc(data.title)}</h1>
        
        ${data.subtitle ? `<p style="font-size:29px;color:rgba(255,255,255,0.96);margin:0;font-weight:600;text-shadow:0 3px 12px rgba(0,0,0,0.25);line-height:1.35;">${esc(data.subtitle)}</p>` : ''}
      </div>

      <!-- Info tiles with enhanced shadow -->
      <div style="position:absolute;top:680px;left:70px;right:70px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          ${tiles.join('')}
        </div>

        ${data.description ? `
          <div style="margin-top:28px;background:linear-gradient(135deg,#ffffff,#fefeff);border:3px solid ${theme.primary}28;border-radius:26px;padding:36px 40px;box-shadow:0 12px 40px rgba(0,0,0,0.06),inset 0 2px 0 rgba(255,255,255,0.8);">
            <p style="font-size:23px;color:#334155;line-height:1.7;margin:0;font-weight:600;text-align:center;">${esc(data.description)}</p>
          </div>` : ''}

        ${highlightChips.length ? `
          <div style="margin-top:28px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
            ${highlightChips.map((c) => chip(c, theme)).join('')}
          </div>` : ''}

        ${data.cta ? `
          <div style="margin-top:28px;text-align:center;">
            <div style="display:inline-block;background:${theme.gradient};color:#fff;font-size:23px;font-weight:900;padding:20px 52px;border-radius:999px;box-shadow:0 16px 40px ${theme.primary}50,0 4px 12px ${theme.primary}40;border:3px solid rgba(255,255,255,0.2);letter-spacing:0.5px;">${esc(data.cta)}</div>
          </div>` : ''}
      </div>

      <!-- Enhanced footer -->
      <div style="position:absolute;bottom:48px;left:70px;right:70px;display:flex;justify-content:space-between;align-items:center;padding-top:26px;border-top:3px solid #e2e8f0;">
        <div style="font-size:16px;color:#64748b;font-weight:800;letter-spacing:0.5px;line-height:1.5;">
          <div style="color:#0f172a;font-size:17px;">COMPUTER SCIENCE &amp; ENGINEERING</div>
          <div>UNIVERSITY OF DHAKA</div>
        </div>
        <div style="font-size:16px;font-weight:900;color:${theme.primary};background:${theme.primary}15;padding:11px 24px;border-radius:999px;border:2px solid ${theme.primary}30;">
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
    <div style="width:1080px;height:1350px;background:linear-gradient(160deg,#ffffff 0%,#f6f9fc 100%);position:relative;overflow:hidden;font-family:'Inter','Segoe UI',-apple-system,sans-serif;">
      <!-- Top gradient accent with shadow -->
      <div style="position:absolute;top:0;left:0;right:0;height:18px;background:${theme.gradient};box-shadow:0 4px 20px ${theme.primary}40;"></div>
      
      <!-- Decorative elements -->
      <div style="position:absolute;top:-160px;left:-160px;width:520px;height:520px;background:radial-gradient(circle,${theme.primary}14,transparent 65%);"></div>
      <div style="position:absolute;top:-120px;left:-120px;width:440px;height:440px;border:3px solid ${theme.primary}18;border-radius:50%;"></div>
      <div style="position:absolute;bottom:-180px;right:-180px;width:560px;height:560px;background:radial-gradient(circle,${theme.accent}16,transparent 68%);"></div>
      <div style="position:absolute;bottom:-140px;right:-140px;width:480px;height:480px;border:3px solid ${theme.accent}20;border-radius:50%;"></div>

      <!-- Logo panel with enhanced design -->
      <div style="position:absolute;top:60px;left:60px;right:60px;padding:30px;background:linear-gradient(135deg,#ffffff,#fefeff);border-radius:28px;box-shadow:0 14px 48px rgba(15,23,42,0.1),0 4px 12px rgba(15,23,42,0.05);border:3px solid ${theme.primary}12;">
        ${logoBar(false)}
      </div>

      <!-- Enhanced badge with icon -->
      <div style="position:absolute;top:248px;left:60px;right:60px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:16px;background:${theme.gradient};padding:16px 42px;border-radius:999px;box-shadow:0 12px 36px ${theme.primary}48,0 4px 12px ${theme.primary}35;border:3px solid rgba(255,255,255,0.25);">
          ${icon('spark', '#ffffff', 26)}
          <span style="font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:5px;">${esc(data.category || 'Hands-on')} Workshop</span>
        </div>
      </div>

      <!-- Title section with gradient accent -->
      <div style="position:absolute;top:350px;left:60px;right:60px;text-align:center;">
        <h1 style="font-size:76px;font-weight:900;color:#0f172a;margin:0 0 18px;line-height:1.02;letter-spacing:-2px;text-transform:uppercase;background:linear-gradient(135deg,#0f172a,${theme.primary});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.08));">${esc(data.title)}</h1>
        ${data.subtitle ? `
          <div style="display:inline-block;background:linear-gradient(135deg,${theme.primary}08,${theme.accent}08);border:2px solid ${theme.primary}22;border-radius:999px;padding:12px 32px;margin-top:6px;">
            <p style="font-size:27px;color:#334155;margin:0;font-weight:700;line-height:1.3;">${esc(data.subtitle)}</p>
          </div>` : ''}
      </div>

      <!-- Date block + details with modern styling -->
      <div style="position:absolute;top:580px;left:60px;right:60px;">
        <div style="display:flex;gap:28px;align-items:stretch;">
          <!-- Enhanced calendar tile -->
          <div style="flex:0 0 240px;background:linear-gradient(135deg,#ffffff,#fefeff);border-radius:28px;overflow:hidden;box-shadow:0 16px 48px rgba(15,23,42,0.12),0 4px 12px rgba(15,23,42,0.06);border:4px solid ${theme.primary};">
            <div style="background:${theme.gradient};padding:18px;text-align:center;font-size:20px;font-weight:900;color:#fff;letter-spacing:4px;box-shadow:0 4px 12px ${theme.primary}40;">${monthShort}</div>
            <div style="padding:28px;text-align:center;">
              <div style="font-size:92px;font-weight:900;color:${theme.primary};line-height:0.95;text-shadow:0 4px 12px ${theme.primary}20;">${day}</div>
              <div style="font-size:22px;font-weight:900;color:#64748b;margin-top:8px;letter-spacing:0.5px;">${year}</div>
              ${data.endDate && parseDate(data.endDate)?.toDateString() !== start?.toDateString() ? `
                <div style="margin-top:12px;font-size:15px;font-weight:800;color:${theme.primary};background:${theme.primary}15;border:2px solid ${theme.primary}30;border-radius:999px;padding:6px 14px;display:inline-block;letter-spacing:1px;">MULTI-DAY</div>` : ''}
            </div>
          </div>
          
          <!-- Detail rows with enhanced styling -->
          <div style="flex:1;display:flex;flex-direction:column;gap:18px;">
            ${rows.join('') || infoTile('calendar', 'Date', fmtRange(data.date, data.endDate), theme)}
          </div>
        </div>

        ${data.description ? `
          <div style="margin-top:28px;background:${theme.gradient};border-radius:28px;padding:38px 44px;position:relative;overflow:hidden;box-shadow:0 16px 48px ${theme.primary}35,inset 0 2px 0 rgba(255,255,255,0.15);">
            <div style="position:absolute;top:-80px;right:-80px;width:260px;height:260px;background:rgba(255,255,255,0.1);border-radius:50%;"></div>
            <div style="position:absolute;bottom:-60px;left:-60px;width:200px;height:200px;background:rgba(255,255,255,0.08);border-radius:50%;"></div>
            <p style="font-size:23px;color:#fff;line-height:1.7;margin:0;font-weight:700;position:relative;z-index:1;text-align:center;text-shadow:0 2px 8px rgba(0,0,0,0.12);">${esc(data.description)}</p>
          </div>` : ''}

        ${metaChips.length ? `
          <div style="margin-top:28px;display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
            ${metaChips.map((c) => chip(c, theme)).join('')}
          </div>` : ''}

        ${data.cta ? `
          <div style="margin-top:28px;text-align:center;">
            <div style="display:inline-block;background:${theme.gradient};color:#fff;font-size:23px;font-weight:900;padding:20px 52px;border-radius:999px;box-shadow:0 16px 40px ${theme.primary}50,0 4px 12px ${theme.primary}40;border:3px solid rgba(255,255,255,0.2);letter-spacing:0.5px;">${esc(data.cta)}</div>
          </div>` : ''}
      </div>

      <!-- Enhanced footer -->
      <div style="position:absolute;bottom:44px;left:60px;right:60px;text-align:center;padding:26px;background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));border-radius:24px;border:3px solid ${theme.primary}16;box-shadow:0 8px 28px rgba(0,0,0,0.06);">
        <div style="color:#0f172a;font-size:19px;font-weight:900;margin-bottom:4px;letter-spacing:0.5px;">COMPUTER SCIENCE &amp; ENGINEERING</div>
        <div style="font-size:16px;color:#64748b;font-weight:800;letter-spacing:0.8px;">UNIVERSITY OF DHAKA · ${esc(data.organizer || "CSEDU Students' Club")}</div>
      </div>
    </div>`;
}

// Election poster — clean card-based design with fixed sections ────────────

function createElectionPoster(data: PosterData, theme: ThemePalette): string {
  const startDate = parseDate(data.date);
  const year = startDate?.getFullYear() ?? new Date().getFullYear();
  const day = startDate ? String(startDate.getDate()).padStart(2, '0') : '';
  const month = startDate ? startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const weekday = startDate ? startDate.toLocaleDateString('en-US', { weekday: 'long' }) : '';

  return `
    <div style="width:1080px;height:1350px;position:relative;overflow:hidden;font-family:'Inter','Segoe UI',-apple-system,sans-serif;background:#0f172a;">
      <!-- Background gradient base -->
      <div style="position:absolute;inset:0;background:linear-gradient(170deg,#0f172a 0%,${theme.secondary}22 50%,#0f172a 100%);"></div>

      <!-- Large decorative circle -->
      <div style="position:absolute;top:-340px;right:-340px;width:800px;height:800px;border-radius:50%;border:1px solid ${theme.primary}20;"></div>
      <div style="position:absolute;top:-300px;right:-300px;width:720px;height:720px;border-radius:50%;border:1px solid ${theme.primary}15;"></div>
      <div style="position:absolute;bottom:-200px;left:-200px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,${theme.primary}12,transparent 70%);"></div>

      <!-- Top gradient accent bar -->
      <div style="position:absolute;top:0;left:0;right:0;height:6px;background:${theme.gradient};"></div>

      <!-- ═══ CONTENT (flexbox, no overlap) ═══ -->
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:54px 64px 48px;">

        <!-- Row 1: Logo bar -->
        <div style="flex-shrink:0;">
          ${logoBar(true)}
        </div>

        <!-- Row 2: Election badge -->
        <div style="flex-shrink:0;margin-top:32px;display:flex;align-items:center;gap:14px;">
          <div style="background:${theme.gradient};padding:11px 26px;border-radius:999px;font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:2.5px;box-shadow:0 6px 20px ${theme.primary}44;">ELECTION ${year}</div>
          ${data.level ? `<div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.15);padding:11px 22px;border-radius:999px;font-size:13px;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">${esc(data.level)}</div>` : ''}
        </div>

        <!-- Row 3: Main headline -->
        <div style="flex-shrink:0;margin-top:36px;">
          <div style="font-size:86px;font-weight:900;color:#ffffff;line-height:1;letter-spacing:-2px;">YOUR VOTE</div>
          <div style="font-size:86px;font-weight:900;line-height:1;letter-spacing:-2px;background:${theme.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">YOUR VOICE</div>
        </div>

        <!-- Row 4: Subtitle with accent line -->
        <div style="flex-shrink:0;margin-top:20px;display:flex;align-items:center;gap:14px;">
          <div style="width:40px;height:4px;border-radius:2px;background:${theme.gradient};flex-shrink:0;"></div>
          <div style="font-size:24px;color:rgba(255,255,255,0.88);font-weight:600;">${esc(data.subtitle || "Shape the future of CSEDU Students' Club")}</div>
        </div>

        <!-- Row 5: Date showcase + details card -->
        <div style="flex:1;margin-top:40px;display:flex;gap:24px;min-height:0;">

          <!-- Left: Big date card -->
          <div style="width:220px;flex-shrink:0;background:${theme.gradient};border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;box-shadow:0 20px 50px ${theme.primary}44;">
            <div style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.85);letter-spacing:3px;text-transform:uppercase;">${esc(month)}</div>
            <div style="font-size:96px;font-weight:900;color:#fff;line-height:1;margin:4px 0;">${day}</div>
            <div style="font-size:16px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:0.5px;">${esc(weekday)}</div>
            <div style="margin-top:16px;width:50px;height:3px;background:rgba(255,255,255,0.4);border-radius:2px;"></div>
            <div style="margin-top:14px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.75);">${year}</div>
          </div>

          <!-- Right: Info cards stack -->
          <div style="flex:1;display:flex;flex-direction:column;gap:14px;">
            ${data.time ? `
            <div style="background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:18px;padding:20px 24px;display:flex;align-items:center;gap:16px;">
              <div style="width:44px;height:44px;border-radius:12px;background:${theme.gradient};display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px ${theme.primary}33;">${icon('clock', '#fff', 22)}</div>
              <div>
                <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;">Voting Hours</div>
                <div style="font-size:20px;font-weight:800;color:#fff;margin-top:3px;">${esc(data.time)}</div>
              </div>
            </div>` : ''}

            ${data.location ? `
            <div style="background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:18px;padding:20px 24px;display:flex;align-items:center;gap:16px;">
              <div style="width:44px;height:44px;border-radius:12px;background:${theme.gradient};display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px ${theme.primary}33;">${icon('pin', '#fff', 22)}</div>
              <div>
                <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;">${esc(data.mode || 'Venue')}</div>
                <div style="font-size:20px;font-weight:800;color:#fff;margin-top:3px;">${esc(data.location)}</div>
              </div>
            </div>` : ''}

            ${data.registrationDeadline ? `
            <div style="background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:18px;padding:20px 24px;display:flex;align-items:center;gap:16px;">
              <div style="width:44px;height:44px;border-radius:12px;background:${theme.gradient};display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px ${theme.primary}33;">${icon('hourglass', '#fff', 22)}</div>
              <div>
                <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;">Registration Deadline</div>
                <div style="font-size:20px;font-weight:800;color:#fff;margin-top:3px;">${esc(fmtLong(data.registrationDeadline))}</div>
              </div>
            </div>` : ''}

            ${data.capacity ? `
            <div style="background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:18px;padding:20px 24px;display:flex;align-items:center;gap:16px;">
              <div style="width:44px;height:44px;border-radius:12px;background:${theme.gradient};display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px ${theme.primary}33;">${icon('users', '#fff', 22)}</div>
              <div>
                <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:1.5px;text-transform:uppercase;">Eligible Voters</div>
                <div style="font-size:20px;font-weight:800;color:#fff;margin-top:3px;">${esc(data.capacity)}</div>
              </div>
            </div>` : ''}
          </div>
        </div>

        <!-- Row 6: CTA banner -->
        <div style="flex-shrink:0;margin-top:32px;background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1.5px solid rgba(255,255,255,0.1);border-radius:22px;padding:30px 36px;text-align:center;">
          <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:0.5px;">${esc(data.cta || 'Every Voice Counts — Make Yours Heard')}</div>
          ${data.description ? `<div style="margin-top:10px;font-size:17px;color:rgba(255,255,255,0.7);line-height:1.6;font-weight:500;">${esc(data.description)}</div>` : ''}
        </div>

        <!-- Row 7: Footer -->
        <div style="flex-shrink:0;margin-top:24px;display:flex;justify-content:space-between;align-items:center;padding-top:20px;border-top:1.5px solid rgba(255,255,255,0.08);">
          <div style="color:rgba(255,255,255,0.7);font-size:15px;font-weight:700;line-height:1.5;">
            <div style="color:rgba(255,255,255,0.92);font-weight:800;">COMPUTER SCIENCE &amp; ENGINEERING</div>
            <div>UNIVERSITY OF DHAKA</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            ${data.organizer ? `<div style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:600;">${esc(data.organizer)}</div>` : ''}
            <div style="background:${theme.gradient};padding:9px 20px;border-radius:999px;color:#fff;font-size:13px;font-weight:800;letter-spacing:1.5px;">#CSEDU${year}</div>
          </div>
        </div>
      </div>
    </div>`;
}
