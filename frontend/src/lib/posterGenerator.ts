import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PosterData {
  type: 'election' | 'event' | 'workshop';
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  additionalInfo?: string[];
  theme?: 'blue' | 'gold' | 'green' | 'purple';
}

export async function generatePoster(data: PosterData): Promise<string> {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '1080px';
  container.style.height = '1080px';
  document.body.appendChild(container);

  // Render the poster
  container.innerHTML = createPosterHTML(data);

  try {
    // Generate canvas from HTML
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });

    // Convert to data URL
    const imageData = canvas.toDataURL('image/png');

    // Cleanup
    document.body.removeChild(container);

    return imageData;
  } catch (error) {
    document.body.removeChild(container);
    throw error;
  }
}

export async function downloadPoster(data: PosterData, filename?: string): Promise<void> {
  const imageData = await generatePoster(data);
  
  // Create download link
  const link = document.createElement('a');
  link.href = imageData;
  link.download = filename || `${data.type}-poster-${Date.now()}.png`;
  link.click();
}

export async function downloadPosterAsPDF(data: PosterData, filename?: string): Promise<void> {
  const imageData = await generatePoster(data);
  
  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [1080, 1080],
  });

  pdf.addImage(imageData, 'PNG', 0, 0, 1080, 1080);
  pdf.save(filename || `${data.type}-poster-${Date.now()}.pdf`);
}

function createPosterHTML(data: PosterData): string {
  const themes = {
    blue: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#60a5fa',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    },
    gold: {
      primary: '#d97706',
      secondary: '#b45309',
      accent: '#fbbf24',
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    },
    green: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#10b981',
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    },
    purple: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
      accent: '#a78bfa',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    },
  };

  const theme = themes[data.theme || 'blue'];

  if (data.type === 'election') {
    return createElectionPoster(data, theme);
  } else if (data.type === 'event') {
    return createEventPoster(data, theme);
  } else {
    return createWorkshopPoster(data, theme);
  }
}

function createElectionPoster(data: PosterData, theme: any): string {
  return `
    <div style="
      width: 1080px;
      height: 1080px;
      background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #2a2f4a 100%);
      position: relative;
      overflow: hidden;
      font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    ">
      <!-- Animated Background Pattern -->
      <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.03; z-index: 0;">
        <defs>
          <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="2" fill="#ffffff"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>

      <!-- Decorative Glow Elements -->
      <div style="
        position: absolute;
        top: -200px;
        right: -200px;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, ${theme.primary}40, transparent 70%);
        filter: blur(100px);
      "></div>
      <div style="
        position: absolute;
        bottom: -250px;
        left: -250px;
        width: 700px;
        height: 700px;
        background: radial-gradient(circle, ${theme.accent}30, transparent 70%);
        filter: blur(120px);
      "></div>

      <!-- Top Header with Logos -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 45px 70px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%);
        backdrop-filter: blur(10px);
        z-index: 10;
      ">
        <div style="display: flex; align-items: center; gap: 30px;">
          <img src="/images/du_logo.png" style="height: 90px; filter: brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,0.4));" />
          <div style="width: 2px; height: 70px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent);"></div>
          <img src="/images/cseduStudentCLubLogo.png" style="height: 90px; drop-shadow(0 6px 16px rgba(0,0,0,0.4));" />
          <div style="width: 2px; height: 70px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent);"></div>
          <img src="/images/csedu_logo.png" style="height: 90px; filter: brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,0.4));" />
        </div>
        <div style="
          background: ${theme.gradient};
          padding: 16px 36px;
          border-radius: 60px;
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 2.5px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.4);
          border: 2px solid rgba(255,255,255,0.1);
        ">ELECTION ${new Date(data.date).getFullYear()}</div>
      </div>

      <!-- Main Hero Section -->
      <div style="
        position: absolute;
        top: 250px;
        left: 70px;
        right: 70px;
        z-index: 5;
      ">
        <!-- Title with Gradient -->
        <div style="margin-bottom: 60px;">
          <div style="
            font-size: 110px;
            font-weight: 900;
            color: #ffffff;
            margin: 0;
            line-height: 0.95;
            letter-spacing: -3px;
            text-shadow: 0 6px 30px rgba(0, 0, 0, 0.7);
            margin-bottom: 15px;
          ">YOUR VOTE</div>
          <div style="
            font-size: 110px;
            font-weight: 900;
            background: ${theme.gradient};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
            line-height: 0.95;
            letter-spacing: -3px;
            text-shadow: 0 0 40px ${theme.primary}60;
            filter: drop-shadow(0 8px 32px ${theme.primary}40);
          ">MATTERS</div>
          <div style="
            margin-top: 25px;
            font-size: 26px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 600;
            letter-spacing: 0.5px;
            line-height: 1.5;
          ">Shape the future of CSEDU Students' Club</div>
        </div>

        <!-- Info Cards Grid -->
        <div style="
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
          margin-bottom: 35px;
        ">
          <!-- Date Card -->
          <div style="
            background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
            backdrop-filter: blur(30px);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 28px;
            padding: 38px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
            position: relative;
            overflow: hidden;
          ">
            <div style="position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: ${theme.gradient}; opacity: 0.1; border-radius: 0 28px 0 50%;"></div>
            <div style="display: flex; align-items: center; gap: 22px; position: relative; z-index: 1;">
              <div style="
                width: 70px;
                height: 70px;
                background: ${theme.gradient};
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                flex-shrink: 0;
                box-shadow: 0 8px 24px ${theme.primary}50;
              ">📅</div>
              <div style="flex: 1;">
                <div style="
                  font-size: 15px;
                  color: rgba(255, 255, 255, 0.6);
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 1.5px;
                  margin-bottom: 8px;
                ">Election Date</div>
                <div style="
                  font-size: 34px;
                  font-weight: 900;
                  color: #ffffff;
                  line-height: 1.1;
                  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          <!-- Time Card -->
          <div style="
            background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
            backdrop-filter: blur(30px);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 28px;
            padding: 38px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
            position: relative;
            overflow: hidden;
          ">
            <div style="position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: ${theme.gradient}; opacity: 0.1; border-radius: 0 28px 0 50%;"></div>
            <div style="display: flex; align-items: center; gap: 22px; position: relative; z-index: 1;">
              <div style="
                width: 70px;
                height: 70px;
                background: ${theme.gradient};
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                flex-shrink: 0;
                box-shadow: 0 8px 24px ${theme.primary}50;
              ">⏰</div>
              <div style="flex: 1;">
                <div style="
                  font-size: 15px;
                  color: rgba(255, 255, 255, 0.6);
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 1.5px;
                  margin-bottom: 8px;
                ">Voting Hours</div>
                <div style="
                  font-size: 34px;
                  font-weight: 900;
                  color: #ffffff;
                  line-height: 1.1;
                  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${data.time || '9:00 AM - 5:00 PM'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Call to Action Banner -->
        <div style="
          background: ${theme.gradient};
          border-radius: 28px;
          padding: 45px 50px;
          text-align: center;
          box-shadow: 0 20px 60px ${theme.primary}40, 0 0 0 2px rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
        ">
          <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
          <div style="position: absolute; bottom: -80px; left: -80px; width: 250px; height: 250px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
          <div style="position: relative; z-index: 1;">
            <div style="
              font-size: 32px;
              font-weight: 900;
              color: #ffffff;
              margin-bottom: 14px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              text-shadow: 0 4px 12px rgba(0,0,0,0.2);
            ">Every Voice Counts</div>
            <div style="
              font-size: 20px;
              color: rgba(255, 255, 255, 0.95);
              line-height: 1.6;
              font-weight: 500;
            ">Exercise your democratic right. Be the change you want to see.</div>
          </div>
        </div>
      </div>

      <!-- Footer Section -->
      <div style="
        position: absolute;
        bottom: 50px;
        left: 70px;
        right: 70px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 35px;
        border-top: 2px solid rgba(255, 255, 255, 0.12);
      ">
        <div style="
          color: rgba(255, 255, 255, 0.75);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.6;
          letter-spacing: 0.5px;
        ">
          <div style="margin-bottom: 4px;">COMPUTER SCIENCE & ENGINEERING</div>
          <div>UNIVERSITY OF DHAKA</div>
        </div>
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
        ">
          <div style="
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 10px 24px;
            border-radius: 50px;
            border: 1px solid rgba(255,255,255,0.2);
          ">
            <div style="
              color: rgba(255, 255, 255, 0.9);
              font-size: 15px;
              font-weight: 700;
              letter-spacing: 1px;
            ">#CSEDUSC${new Date(data.date).getFullYear()}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createEventPoster(data: PosterData, theme: any): string {
  const dateObj = new Date(data.date);
  return `
    <div style="
      width: 1080px;
      height: 1080px;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    ">
      <!-- Decorative Background -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 350px;
        background: ${theme.gradient};
        clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
      "></div>

      <!-- Top Logos -->
      <div style="
        position: absolute;
        top: 50px;
        left: 60px;
        right: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 40px;
        z-index: 10;
      ">
        <img src="/images/du_logo.png" style="height: 85px; filter: brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,0.2));" />
        <img src="/images/cseduStudentCLubLogo.png" style="height: 85px; drop-shadow(0 4px 12px rgba(0,0,0,0.2));" />
        <img src="/images/csedu_logo.png" style="height: 85px; filter: brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,0.2));" />
      </div>

      <!-- Main Title -->
      <div style="
        position: absolute;
        top: 200px;
        left: 60px;
        right: 60px;
        text-align: center;
        z-index: 10;
      ">
        <div style="
          display: inline-block;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 8px 24px;
          border-radius: 50px;
          margin-bottom: 25px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        ">
          <span style="
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 2px;
          ">UPCOMING EVENT</span>
        </div>

        <h1 style="
          font-size: 76px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 20px 0;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: -1px;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          padding: 0 40px;
        ">${data.title}</h1>
        
        ${data.subtitle ? `
          <p style="
            font-size: 26px;
            color: rgba(255, 255, 255, 0.95);
            margin: 0;
            font-weight: 500;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          ">${data.subtitle}</p>
        ` : ''}
      </div>

      <!-- Info Cards -->
      <div style="
        position: absolute;
        top: 520px;
        left: 60px;
        right: 60px;
      ">
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        ">
          <!-- Date & Time Card -->
          <div style="
            background: #ffffff;
            border-radius: 24px;
            padding: 35px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            border: 2px solid ${theme.primary}20;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 20px;
            ">
              <div style="
                width: 70px;
                height: 70px;
                background: ${theme.gradient};
                border-radius: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                flex-shrink: 0;
              ">📅</div>
              <div style="flex: 1;">
                <div style="
                  font-size: 14px;
                  color: #64748b;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  margin-bottom: 8px;
                ">Date & Time</div>
                <div style="
                  font-size: 24px;
                  font-weight: 800;
                  color: #0f172a;
                  line-height: 1.2;
                  margin-bottom: 4px;
                ">${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                ${data.time ? `
                  <div style="
                    font-size: 18px;
                    color: ${theme.primary};
                    font-weight: 600;
                  ">${data.time}</div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Location Card -->
          ${data.location ? `
            <div style="
              background: #ffffff;
              border-radius: 24px;
              padding: 35px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
              border: 2px solid ${theme.primary}20;
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 20px;
              ">
                <div style="
                  width: 70px;
                  height: 70px;
                  background: ${theme.gradient};
                  border-radius: 18px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 36px;
                  flex-shrink: 0;
                ">📍</div>
                <div style="flex: 1;">
                  <div style="
                    font-size: 14px;
                    color: #64748b;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                  ">Venue</div>
                  <div style="
                    font-size: 22px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.3;
                  ">${data.location}</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        ${data.description ? `
          <div style="
            background: linear-gradient(135deg, ${theme.primary}08, ${theme.accent}08);
            border-radius: 24px;
            padding: 40px;
            border: 2px solid ${theme.primary}20;
            text-align: center;
          ">
            <p style="
              font-size: 22px;
              color: #334155;
              line-height: 1.7;
              margin: 0;
              font-weight: 500;
            ">${data.description}</p>
          </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div style="
        position: absolute;
        bottom: 50px;
        left: 60px;
        right: 60px;
        text-align: center;
        padding-top: 30px;
        border-top: 2px solid #e2e8f0;
      ">
        <div style="
          font-size: 18px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.5px;
        ">COMPUTER SCIENCE & ENGINEERING • UNIVERSITY OF DHAKA</div>
      </div>
    </div>
  `;
}

function createWorkshopPoster(data: PosterData, theme: any): string {
  const dateObj = new Date(data.date);
  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  
  return `
    <div style="
      width: 1080px;
      height: 1080px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      position: relative;
      overflow: hidden;
      font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
    ">
      <!-- Decorative Background Pattern -->
      <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.03; z-index: 0;">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="${theme.primary}"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      <!-- Top Accent Bar -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 12px;
        background: ${theme.gradient};
      "></div>

      <!-- University Logos Section -->
      <div style="
        position: absolute;
        top: 50px;
        left: 60px;
        right: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 60px;
        padding: 30px;
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        border: 2px solid ${theme.primary}15;
      ">
        <img src="/images/du_logo.png" style="height: 95px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));" />
        <div style="width: 2px; height: 80px; background: linear-gradient(to bottom, transparent, ${theme.primary}30, transparent);"></div>
        <img src="/images/cseduStudentCLubLogo.png" style="height: 95px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));" />
        <div style="width: 2px; height: 80px; background: linear-gradient(to bottom, transparent, ${theme.primary}30, transparent);"></div>
        <img src="/images/csedu_logo.png" style="height: 95px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));" />
      </div>

      <!-- Workshop Badge -->
      <div style="
        position: absolute;
        top: 240px;
        left: 60px;
        right: 60px;
        text-align: center;
      ">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: ${theme.gradient};
          padding: 14px 36px;
          border-radius: 50px;
          box-shadow: 0 8px 24px ${theme.primary}40;
        ">
          <span style="font-size: 28px;">🎓</span>
          <span style="
            font-size: 18px;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 3px;
          ">WORKSHOP</span>
        </div>
      </div>

      <!-- Main Title -->
      <div style="
        position: absolute;
        top: 320px;
        left: 60px;
        right: 60px;
        text-align: center;
      ">
        <h1 style="
          font-size: 68px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 20px 0;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: -1px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        ">${data.title}</h1>
        
        ${data.subtitle ? `
          <p style="
            font-size: 26px;
            color: #64748b;
            margin: 0;
            font-weight: 600;
            line-height: 1.4;
          ">${data.subtitle}</p>
        ` : ''}
      </div>

      <!-- Info Cards Section -->
      <div style="
        position: absolute;
        top: 540px;
        left: 60px;
        right: 60px;
      ">
        <!-- Date & Time Row -->
        <div style="
          display: flex;
          gap: 30px;
          margin-bottom: 30px;
        ">
          <!-- Calendar Date Card -->
          <div style="
            flex: 1;
            background: #ffffff;
            border-radius: 24px;
            padding: 0;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
            border: 3px solid ${theme.primary};
            overflow: hidden;
          ">
            <div style="
              background: ${theme.gradient};
              padding: 16px;
              text-align: center;
            ">
              <div style="
                font-size: 16px;
                font-weight: 800;
                color: #ffffff;
                text-transform: uppercase;
                letter-spacing: 2px;
              ">${monthShort}</div>
            </div>
            <div style="
              padding: 24px;
              text-align: center;
            ">
              <div style="
                font-size: 64px;
                font-weight: 900;
                color: ${theme.primary};
                line-height: 1;
                margin-bottom: 8px;
              ">${day}</div>
              <div style="
                font-size: 20px;
                font-weight: 700;
                color: #64748b;
              ">${year}</div>
            </div>
          </div>

          <!-- Time & Venue Card -->
          <div style="
            flex: 2;
            background: #ffffff;
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
            border: 2px solid ${theme.primary}20;
            display: flex;
            flex-direction: column;
            gap: 20px;
          ">
            ${data.time ? `
              <div style="display: flex; align-items: center; gap: 20px;">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: ${theme.gradient};
                  border-radius: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 32px;
                  flex-shrink: 0;
                ">⏰</div>
                <div>
                  <div style="
                    font-size: 14px;
                    color: #94a3b8;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 6px;
                  ">TIME</div>
                  <div style="
                    font-size: 24px;
                    font-weight: 800;
                    color: #0f172a;
                  ">${data.time}</div>
                </div>
              </div>
            ` : ''}
            
            ${data.location ? `
              <div style="display: flex; align-items: center; gap: 20px;">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: ${theme.gradient};
                  border-radius: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 32px;
                  flex-shrink: 0;
                ">📍</div>
                <div>
                  <div style="
                    font-size: 14px;
                    color: #94a3b8;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-bottom: 6px;
                  ">VENUE</div>
                  <div style="
                    font-size: 22px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.3;
                  ">${data.location}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Description Card -->
        ${data.description ? `
          <div style="
            background: ${theme.gradient};
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 12px 40px ${theme.primary}30;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: -50px;
              right: -50px;
              width: 200px;
              height: 200px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
            "></div>
            <p style="
              font-size: 22px;
              color: #ffffff;
              line-height: 1.7;
              margin: 0;
              font-weight: 600;
              position: relative;
              z-index: 1;
            ">${data.description}</p>
          </div>
        ` : ''}

        <!-- Tags -->
        ${data.additionalInfo && data.additionalInfo.length > 0 ? `
          <div style="
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
          ">
            ${data.additionalInfo.map(info => `
              <div style="
                background: #ffffff;
                border: 2px solid ${theme.primary};
                border-radius: 50px;
                padding: 12px 24px;
                font-size: 16px;
                color: ${theme.primary};
                font-weight: 700;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                display: inline-flex;
                align-items: center;
                gap: 8px;
              ">
                <span style="font-size: 18px;">✓</span>
                ${info}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div style="
        position: absolute;
        bottom: 40px;
        left: 60px;
        right: 60px;
        text-align: center;
        padding: 24px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 2px solid ${theme.primary}15;
      ">
        <div style="
          font-size: 16px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 1px;
          line-height: 1.6;
        ">
          <div style="color: #0f172a; font-size: 18px; margin-bottom: 4px;">COMPUTER SCIENCE & ENGINEERING</div>
          <div>UNIVERSITY OF DHAKA</div>
        </div>
      </div>
    </div>
  `;
}
