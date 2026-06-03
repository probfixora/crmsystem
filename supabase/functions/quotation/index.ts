
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logoBase64 } from "./logoBase64.ts";
import { qrBase64 } from "./qrBase64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status === "inactive") throw new Error("Unauthorized");
  return { ...user, name: profile.name, role: profile.role?.toLowerCase() };
}

// ─── Proposal HTML Generation (Matching DOC-20260425-WA0015 style) ─────────────
function generateProposalHTML(q: any, logoBase64: string): string {
  const dateStr = new Date(q.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const price = Number(q.product_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalWatt = q.total_watt || 0;
  const projectType = q.product_category || "On Grid";
  const title = q.product_brand
    ? `${q.product_brand} ${projectType} Solar Panel`
    : `${projectType} Solar Panel`;

  // Disclaimer for the solar panel brand
  const brandName = q.product_brand || "Adani";
  const disclaimerHTML = `
    <div style="margin-top:16px; font-size:10px; line-height:1.6; color:#000;">
      <p>${brandName} का सोलर पैनल आपके क्रेता/उपभोक्ता के कहने पर लगाया गया है। वारंटी के लिये हम मदद करे, लेकिन जिम्मेदारी क्रेता/उपभोक्ता की होगी।</p>
      <p style="margin-top:12px;">The ${brandName} solar panel has been installed at the request of your buyer/customer. We will assist with the warranty, but the responsibility will rest with the buyer/customer.</p>
    </div>
  `;



  // The Header HTML that repeats on top of each page (logo LEFT, company info RIGHT)
  const pageHeader = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; border-bottom:1px solid #999; margin-bottom:10px;">
      <div>
        ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Probfixora" style="height:56px; object-fit:contain;" />` : `<h1 style="color:#b45309; font-size:28px; font-weight:900; margin:0; letter-spacing:-1px;">PROBFIXORA</h1>`}
      </div>
      <div style="text-align:right; font-size:11px; line-height:1.6;">
        <div style="font-weight:bold; font-size:13px;"><span style="color:#ff8c00;">Probfixora</span></div>
        <div>Probfixora, New Delhi, India</div>
        <div>Email: <span style="color:#0000cc;">probfixora@gmail.com</span> | Web: <span style="color:#0000cc;">www.probfixora.co.in</span></div>
      </div>
    </div>
  `;

  const divider = `<hr style="border:none; border-top:1.5px solid #333; margin:8px 0;" />`;
  const lightDivider = `<hr style="border:none; border-top:1px solid #bbb; margin:6px 0;" />`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break { page-break-before: always; }
    @page { margin: 12mm 14mm; }
    p { margin-bottom: 3px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #555; padding: 5px 8px; font-size: 10px; }
    th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
    td { text-align: center; }
    td:nth-child(2) { text-align: left; }
    ul { padding-left: 18px; margin-top: 8px; margin-bottom: 8px; }
    li { margin-bottom: 8px; font-size: 11px; line-height: 1.8; }
  </style>
</head>
<body>

  <!-- ═══════════════════ PAGE 1 ═══════════════════ -->
  ${pageHeader}

  <!-- Quotation No. & Date -->
  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:6px;">
    <div><strong>Quotation No.: ${q.quotation_id}</strong></div>
    <div><strong>Date: ${dateStr}</strong></div>
  </div>
  ${divider}

  <!-- Title -->
  <div style="text-align:center; font-size:14px; font-weight:bold; margin: 8px 0;">
    ${title}
  </div>
  ${divider}

  <!-- Customer Info (two columns) -->
  <div style="display:flex; justify-content:space-between; gap:20px; font-size:11px; margin: 6px 0;">
    <div style="flex:1; line-height:1.8;">
      <div><strong>Customer Name:</strong> ${q.customer_name}</div>
      <div><strong>Mobile No.:</strong> ${q.customer_mobile}</div>
      <div><strong>Address:</strong> ${q.customer_address}</div>
    </div>
    <div style="flex:1; line-height:1.8; text-align:right;">
      <div><strong>Company Name:</strong> ${q.customer_occupation || "N/A"}</div>
      ${q.customer_occupation && q.customer_occupation !== "N/A"
      ? `<div><strong>Address:</strong> ${q.customer_address}</div>`
      : ""
    }
      <div><strong>GSTIN:</strong> ${q.customer_gstin || "N/A"}</div>
    </div>
  </div>
  ${lightDivider}

  <!-- Project Info (two columns) -->
  <div style="display:flex; justify-content:space-between; gap:20px; font-size:11px; margin: 6px 0;">
    <div style="flex:1; line-height:1.8;">
      <div><strong>Project:</strong> ${projectType}</div>
      <div><strong>Electric Load:</strong> ${q.electrical_load || totalWatt + "W"}</div>
    </div>
    <div style="flex:1; line-height:1.8; text-align:right;">
      <div><strong>Employee:</strong> ${q.employee_name}</div>
      <div><strong>Employee-id:</strong> ${q.employee_id}</div>
    </div>
  </div>
  ${divider}

  <!-- Components Table -->
  <div style="text-align:center; font-size:12px; font-weight:bold; margin: 8px 0 6px 0;">System Components &amp; Pricing</div>
  <table>
    <thead>
      <tr>
        <th style="width:6%;">Sr. No</th>
        <th style="text-align:left; width:38%;">Item Description</th>
        <th style="width:14%;">Capacity</th>
        <th style="width:10%;">Quantity</th>
        <th style="width:14%;">Warranty</th>
        <th style="width:18%;">Price (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td style="text-align:left;">${title}</td>
        <td>${q.panel_unit}</td>
        <td>${q.panel_count}</td>
        <td>${q.panel_warranty || "25 Years"}</td>
        <td>Included</td>
      </tr>
      <tr>
        <td>2</td>
        <td style="text-align:left;">GTI Inverter: ${q.inverter_brand}</td>
        <td>${q.inverter_kw}kW</td>
        <td>1</td>
        <td>${q.inverter_warranty || "8 Years"}</td>
        <td>Included</td>
      </tr>
      ${q.battery_brand
      ? `
      <tr>
        <td>3</td>
        <td style="text-align:left;">Battery: ${q.battery_brand}</td>
        <td>${q.battery_capacity} Ah</td>
        <td>${q.battery_count}</td>
        <td>${q.battery_warranty || "Standard"}</td>
        <td>Included</td>
      </tr>`
      : ""
    }
      <tr>
        <td>${q.battery_brand ? 4 : 3}</td>
        <td style="text-align:left;">Structure</td>
        <td>${q.structure || "Jindal (80mm)"}</td>
        <td>Set 1</td>
        <td>--</td>
        <td>Included</td>
      </tr>
      <tr>
        <td>${q.battery_brand ? 5 : 4}</td>
        <td style="text-align:left;">Wiring</td>
        <td>${q.wiring || "6 Square MM (Havells/Polycap/KEI)"}</td>
        <td>--</td>
        <td>--</td>
        <td>Included</td>
      </tr>
      <tr>
        <td>${q.battery_brand ? 6 : 5}</td>
        <td style="text-align:left;">Earthing</td>
        <td>${q.earthing || "2.5 Square MM copper"}</td>
        <td>--</td>
        <td>--</td>
        <td>Included</td>
      </tr>
      <tr>
        <td>${q.battery_brand ? 7 : 6}</td>
        <td style="text-align:left;">Installation and Net Mettering</td>
        <td>${q.installation && q.installation !== 'Included' ? q.installation : '--'}</td>
        <td>--</td>
        <td>--</td>
        <td>Included</td>
      </tr>
      <tr>
        <td>${q.battery_brand ? 8 : 7}</td>
        <td style="text-align:left;">BOS (Balance of System)</td>
        <td>${q.bos || "Complete Set"}</td>
        <td>Set 1</td>
        <td>--</td>
        <td>Included</td>
      </tr>
    </tbody>
  </table>

  <!-- Total -->
  <div style="margin-top:10px; font-size:12px;">
    <strong>Total Quotation Amount: ₹${price}</strong>
  </div>
  <div style="font-size:10px; margin-top:6px;">*Transportations extra as per actual from New Delhi.</div>

  ${disclaimerHTML}

  ${divider}

  <!-- Bank Details with QR Code -->
  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:6px; font-size:10.5px;">
    <!-- Left Bank -->
    <div style="flex:1; line-height:1.8;">
      <div><strong>Bank Details:</strong></div>
      <div>Account Name: Probfixora</div>
      <div>Bank Name: State Bank of India (SBI)</div>
      <div>Branch: Hussainganj, New Delhi</div>
      <div>Account No.: 43722468016</div>
      <div>IFSC Code: SBIN0003814</div>
    </div>
    <!-- QR Code (center) -->
    <div style="text-align:center; flex-shrink:0;">
      <img src="data:image/png;base64,${qrBase64}" alt="UPI QR Code" style="width:140px; height:auto; display:block; margin:0 auto; border-radius:8px;" />
    </div>
    <!-- Right Bank -->
    <div style="flex:1; text-align:right; line-height:1.8;">
      <div><strong>Bank Details:</strong></div>
      <div>Account Name: Probfixora</div>
      <div>Bank Name: UCO BANK</div>
      <div>Branch: CHARBAGH BAL VIDYA MANDIR, New Delhi</div>
      <div>Account No.: 20220210000205</div>
      <div>IFSC Code: UCBA0002022</div>
    </div>
  </div>

  <!-- ═══════════════════ PAGE 2 ═══════════════════ -->
  <div class="page-break"></div>
  ${pageHeader}

  <h3 style="font-size:12px; font-weight:bold; margin-bottom:8px;">Key Highlights</h3>
  <ul style="font-size:10.5px; line-height:1.6; text-align:justify;">
    <li><strong>Premium Grade A Cells</strong> – Ensures top-tier performance and long-term durability.</li>
    <li><strong>Dual-side Power Generation</strong> – Bifacial design captures light from both front and rear, boosting total output. In lab tests, a rear-side gain of 10–25% increases peak power from 545Wp to up to ~681Wp.</li>
    <li><strong>Anti-Reflection (AR) Coated Glass</strong> – Reduces glare, enhances light absorption, and improves low-light performance.</li>
    <li><strong>Excellent Low-Light Generation</strong> – Optimized to perform even in cloudy or early/late daylight conditions.</li>
    <li><strong>Transparent White Backsheet</strong> – Increases light reflection for the bifacial rear side.</li>
    <li><strong>3.2 mm Tempered Glass</strong> – High-strength, low-iron glass improves durability and impact resistance.</li>
    <li><strong>Ionized Aluminium Frame</strong> – Anodized aluminum frame enhances structural rigidity and corrosion resistance.</li>
    <li><strong>IP68-Rated Junction Box</strong> – Provides superior protection against dust and water ingress, improving system reliability.</li>
    <li><strong>PID-Free Technology</strong> – Prevents Potential Induced Degradation, preserving long-term performance.</li>
    <li><strong>Temperature Coefficient</strong> – ±0.3% per °C deviation from 45°C, allowing stable output even in extreme conditions.</li>
    <li><strong>Wide Operating Temperature Range</strong> – Efficient from –40°C to +85°C, ensuring consistent output across diverse climates.</li>
    <li><strong>Rugged Build Quality</strong> – Withstands wind loads up to 2,400 Pa and snow loads up to 5,400 Pa.</li>
    <li><strong>Long Warranties</strong> – 12-year product warranty and 25-year linear power performance warranty (~2% drop in year 1, then ~0.55%/year).</li>
    <li><strong>Real-Time Monitoring via ConnectX</strong> – Enables live tracking of performance through the Luminous mobile app or platform.</li>
    <li><strong>DCR Compliant</strong> – Domestic Content Requirement certified, eligible for government subsidies and MNRE schemes.</li>
  </ul>

  ${divider}

  <h3 style="font-size:12px; font-weight:bold; margin:10px 0 8px 0; text-align:center;">Terms &amp; Conditions</h3>

  ${lightDivider}
  <div style="margin: 12px 0; font-size:11px; text-align:justify; line-height:1.8;">
    <p><strong>VALIDITY OF OFFER:</strong><br/>
    Prices quoted are firm and generally valid for 15 days from the date of offer. After this period, prices are subject to reconfirmation. Probfixora will only be liable to perform work based on the scope of work listed in the final offer. Any additional work or equipment beyond this scope shall be charged separately. Offer prices may vary after a detailed site survey or due to changes in site conditions.</p>
  </div>

  ${lightDivider}
  <div style="margin: 12px 0; font-size:11px; text-align:justify; line-height:1.8;">
    <p><strong>LOCAL TAXES, WCTS &amp; SERVICE TAX:</strong><br/>
    The offer price is inclusive of GST. Any additional taxes or levies, if charged, shall be payable extra on actuals.</p>
  </div>

  ${lightDivider}
  <div style="margin: 12px 0; font-size:11px; text-align:justify; line-height:1.8;">
    <p><strong>TRANSPORT, FREIGHT &amp; INSURANCE:</strong><br/>
    Transport charges are inclusive. Insurance and handling charges are exclusive on supply items. (Ex-Works: Delhi / Noida / New Delhi)</p>
  </div>

  <!-- ═══════════════════ PAGE 3 CONTINUATION ═══════════════════ -->

  <div style="font-size:10.5px; line-height:1.6;">

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>PAYMENT TERMS:</strong></p>
      <ul style="margin-top:4px;">
        <li>80% of the project cost payable in advance along with Letter of Award (LOA) or Purchase Order (PO).</li>
        <li>10% of the project cost payable upon intimation of dispatch.</li>
        <li>Balance 10% payable upon project completion (Inverter ON).</li>
        <li>Delay in payment will attract an interest charge of 1.5% per month on the outstanding amount.</li>
        <li>12000/- extra for Apollo structure per KW and 16000/- extra for Jindal structure per KW if required.</li>
      </ul>
    </div>

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>WARRANTY, SERVICE &amp; DEFECT LIABILITY:</strong></p>
      <ul style="margin-top:4px;">
        <li>1-year product warranty against workmanship and breakdown defects.</li>
        <li>Solar panels: 5-year performance warranty + 25-year manufacturing defect warranty.</li>
        <li>Off-grid inverter warranty: 2 years.</li>
        <li>Extended individual component warranties will be passed to customer as per manufacturer.</li>
      </ul>
    </div>

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>INSTALLATION HEIGHT DISCLAIMER:</strong><br/>
      The standard installation height for solar structures provided by Probfixora is 7 feet. If the customer requests installation at a height greater than 7 feet, Probfixora shall not be responsible for any issues, damages, or challenges arising in the future due to the increased height.<br/>
      Any additional structural support or safety measures for installations beyond 7 feet shall be the sole responsibility of the customer.</p>
    </div>

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>LIMITATION OF LIABILITY &amp; INDEMNITY:</strong><br/>
      Probfixora shall not be liable for any special, punitive, indirect, or consequential damages, including but not limited to loss of profits, loss of use, service interruptions, loss of reputation, or costs arising from pollution remediation. Claims by the Owner's customers or other parties shall also be excluded from liability.</p>
    </div>

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>COMMISSIONING &amp; TESTING:</strong> The overall liability of Probfixora, whether for liquidated damages or otherwise, shall not exceed 2% of the total order value.</p>
    </div>

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>RESTOCKING CHARGES:</strong> Liquidated damages shall be the Owner's sole remedy for delay in delivery or deviations in the supply of equipment and shall constitute the complete liability of Probfixora in such cases.</p>
    </div>

    ${lightDivider}
    <div style="margin: 12px 0; text-align:justify;">
      <p><strong>DELIVERY / PROJECT COMPLETION:</strong> Each Party shall indemnify and hold the other harmless against any claims by third parties for loss of or damage to property, or for death or personal injury, arising from that Party's negligence during activities under this contract. In cases of joint negligence, liability shall be apportioned according to each Party's degree of negligence.</p>
    </div>

  </div>

  <!-- ═══════════════════ PAGE 4 ═══════════════════ -->
  <div class="page-break"></div>
  ${pageHeader}

  <div style="font-size:10.5px; line-height:1.6; text-align:justify;">
    ${lightDivider}
    <div style="margin: 8px 0;">
      <p><strong>FORCE MAJEURE:</strong> This quotation, as well as any resulting contract, is subject to the standard Force Majeure conditions (including but not limited to acts of God, natural disasters, strikes, war, or other unforeseen circumstances beyond control).</p>
    </div>

    ${divider}

    <div style="margin-top:20px;">
      <p style="font-weight:bold; font-size:12px;">Renewable Energy Solutions for a Brighter Future</p>
      <p style="margin-top:6px;">Probfixora has been a leader in sustainable energy solutions for over 20+ years, providing innovative solar technologies.</p>
      <p style="margin-top:4px;">At Probfixora, our mission is to revolutionize the energy industry by making solar power more accessible, efficient, and affordable for everyone. We strive to reduce carbon footprints and promote sustainable energy practices worldwide.</p>
    </div>

    ${divider}

    <div style="margin-top:20px;">
      <p>Thanks &amp; Regards,</p>
      <p><strong>Team Probfixora</strong></p>
      <p>New Delhi, Uttar Pradesh, India</p>
      <p><span style="color:#0000cc;">https://probfixora.co.in</span></p>
    </div>

    ${divider}

    <div style="margin-top:16px; text-align:center; font-size:10px; color:#333; line-height:1.6;">
      <p>We are proud to serve clients in New Delhi, Kanpur, Rai Bareli, Barabanki, Unnao, Hardoi, Shahjahanpur, Lakhimpur Kheri, Prayagraj, Sultanpur, Azamgarh, Jaunpur, Pratapgarh, Sitapur, and other surrounding areas.</p>
      <p style="font-weight:bold; margin-top:6px; font-style:italic;">Powering a Cleaner Tomorrow.</p>
      <p style="font-style:italic;">This is an automated message. Please do not reply.</p>
    </div>
  </div>

</body>
</html>`;
}

// ─── PDF Generation via Puppeteer (Browserless) or Fallback API ────────────────
async function generatePDF(q: Record<string, unknown>): Promise<Uint8Array> {
  const html = generateProposalHTML(q, logoBase64);
  const browserlessKey = Deno.env.get("BROWSERLESS_API_KEY");

  // Attempt 1: If Browserless Key is provided (Preferred Puppeteer method)
  if (browserlessKey) {
    const res = await fetch(`https://chrome.browserless.io/pdf?token=${browserlessKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: html,
        options: {
          format: "A4",
          printBackground: true,
          margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" } // margins handled in CSS
        },
        gotoOptions: {
          waitUntil: "networkidle0" // Wait for Tailwind CDN
        }
      })
    });
    if (res.ok) {
      return new Uint8Array(await res.arrayBuffer());
    } else {
      console.error("Browserless API failed, falling back...", await res.text());
    }
  }

  // Attempt 2: Fallback to open source API for converting HTML to PDF
  const fallbackRes = await fetch("https://api.html2pdf.app/v1/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html: html })
  });

  if (fallbackRes.ok) {
    return new Uint8Array(await fallbackRes.arrayBuffer());
  }

  throw new Error("PDF generation failed. Please configure BROWSERLESS_API_KEY for robust Puppeteer PDF generation.");
}

// ─── Email via Brevo HTTP API ──────────────────────────────────────────────────
async function sendEmail(q: any, pdfBytes: Uint8Array, approvalToken?: string) {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const gmailEmail = Deno.env.get("GMAIL_EMAIL");
  
  if (!brevoApiKey) throw new Error("BREVO_API_KEY not configured");
  if (!gmailEmail) throw new Error("GMAIL_EMAIL not configured");

  // Convert Uint8Array to base64 for the PDF attachment
  const binaryString = Array.from(pdfBytes).map(b => String.fromCharCode(b)).join('');
  const b64 = btoa(binaryString);

  const dateStr = new Date(q.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
  const price = Number(q.product_price || 0).toLocaleString('en-IN');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your Solar Quotation — Probfixora</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#f0f4f8;color:#1a202c}
    .wrapper{max-width:620px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}
    .header{background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);padding:28px 40px 24px;text-align:center}
    .header-logo{display:block;margin:0 auto 12px;max-height:60px;width:auto}
    .header h1{color:#fff;font-size:20px;font-weight:700;margin:0;letter-spacing:0.3px}
    .header p{color:rgba(255,255,255,0.80);font-size:13px;margin-top:4px}
    .divider-bar{height:4px;background:linear-gradient(90deg,#d97706,#f59e0b)}
    .body{padding:36px 40px}
    .greeting{font-size:18px;font-weight:700;color:#b45309;margin-bottom:10px}
    .intro{font-size:14px;color:#4a5568;line-height:1.7;margin-bottom:24px}
    .summary-title{background:#b45309;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:10px 20px}
    .summary-wrap{border:1.5px solid #c7d2fe;border-radius:10px;overflow:hidden;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td{padding:12px 20px;border-bottom:1px solid #e2e8f0;color:#374151}
    tr:last-child td{border-bottom:none}
    td:first-child{font-weight:600;color:#b45309;width:42%;background:#fffbeb}
    .total-row td{background:#fef3c7;font-weight:700;font-size:14px;color:#b45309}
    .sign{font-size:13px;color:#4a5568;line-height:1.7;margin-top:8px}
    .footer{background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0}
    .footer-logo{font-size:15px;font-weight:700;color:#b45309;margin-bottom:4px}
    .footer-logo span{color:#16a34a}
    .footer p{font-size:11px;color:#94a3b8;line-height:1.6;margin-top:4px}
    .footer a{color:#4f46e5;text-decoration:none}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Probfixora" class="header-logo" style="height:64px; object-fit:contain; margin-bottom:10px; background:white; padding:4px 8px; border-radius:8px;" />` : `<h1 style="color:white; font-size:32px; font-weight:bold; margin:0;">Probfixora</h1>`}
    <h1>Solar Quotation</h1>
    <p>Probfixora — New Delhi</p>
  </div>
  <div class="divider-bar"></div>
  <div class="body">
    <div class="greeting">Dear ${q.customer_name},</div>
    <p class="intro">
      Thank you for choosing <strong>Probfixora</strong>. Please find your customised solar system
      quotation attached as a PDF. Our team will reach out to you shortly to discuss next steps.
    </p>
    <div class="summary-wrap">
      <div class="summary-title">Quotation Summary</div>
      <table>
        <tr><td>Quotation ID</td><td><strong>${q.quotation_id}</strong></td></tr>
        <tr><td>Date</td><td>${dateStr}</td></tr>
        <tr><td>System Type</td><td>${q.product_category}</td></tr>
        <tr><td>Panel Brand</td><td>${q.product_brand}</td></tr>
        <tr><td>System Capacity</td><td>${q.panel_unit}</td></tr>
        <tr class="total-row"><td>Total Quotation Price</td><td>&#8377;${price}</td></tr>
      </table>
    </div>
    
    ${approvalToken ? `
    <div style="margin: 32px 0; text-align: center; background: #f8fafc; padding: 24px; border-radius: 12px; border: 1.5px dashed #cbd5e1;">
      <h3 style="margin-top: 0; color: #b45309; font-size: 16px; margin-bottom: 12px;">Approve Your Quotation</h3>
      <p style="font-size: 13px; color: #475569; margin-bottom: 20px; line-height: 1.6;">
        Click below to review your quotation and proceed with the installation process. You will be able to approve or decline the quotation directly through our secure portal.
      </p>
      <a href="https://internship-project-nu-bay.vercel.app/customer-portal?token=${approvalToken}" style="display: inline-block; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
        Review &amp; Approve Quotation
      </a>
    </div>
    ` : ''}
    
    <p class="intro">If you have any questions, please contact us quoting your Quotation ID <strong>${q.quotation_id}</strong>.</p>
    <p class="sign">
      Warm regards,<br/>
      <strong style="color:#b45309">Probfixora Team</strong><br/>
      <span style="font-size:12px;color:#94a3b8">New Delhi, Uttar Pradesh, India</span>
    </p>
  </div>
  <div class="footer">
    <div class="footer-logo">Probfixora <span>Solar</span></div>
    <p>
      &copy; ${new Date().getFullYear()} Probfixora. All rights reserved.<br/>
      <a href="https://probfixora.co.in">probfixora.co.in</a> &nbsp;|&nbsp;
      <a href="mailto:probfixora@gmail.com">probfixora@gmail.com</a>
    </p>
    <p style="margin-top:8px;color:#cbd5e1;font-size:10px">This is an automated message. Please do not reply.</p>
  </div>
</div>
</body>
</html>`;

  const payload = {
    sender: { name: "Probfixora", email: gmailEmail },
    to: [{ email: q.customer_email as string }],
    subject: `Your Solar Quotation ${q.quotation_id} — Probfixora`,
    htmlContent: html,
    attachment: [
      {
        name: `Quotation_${q.quotation_id}.pdf`,
        content: b64,
      },
    ],
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Brevo API error: ${errorData}`);
  }

  const result = await res.json();
  console.log(`✅ Quotation email sent via Brevo to ${q.customer_email}, Message ID: ${result.messageId}`);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    let user: any = null;
    try {
      user = await getUser(req, supabase);
    } catch (e) {
      // Allow unauthenticated for actions that verify token themselves
    }
    const body = await req.json().catch(() => ({}));
    const action = body.action || "";

    // ── CREATE QUOTATION ───────────────────────────────────────────────────
    if (action === "create") {
      if (!user || (user.role !== "sales" && user.role !== "admin")) {
        return jsonResponse({ message: "Only sales team can create quotations" }, 403);
      }

      const dateStrForId = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      const uniqueNum = Math.floor(10000 + Math.random() * 90000);
      const newQuotationId = `Probfixora-${dateStrForId}-${uniqueNum}`;

      const { data: quotation, error } = await supabase
        .from("quotations")
        .insert({
          quotation_id: newQuotationId,
          customer_name: body.customerName,
          customer_mobile: body.customerMobile,
          customer_email: body.customerEmail,
          customer_address: body.customerAddress,
          electrical_division: body.electricalDivision,
          electrical_number: body.electricalNumber,
          electrical_load: body.electricalLoad,
          product_category: body.productCategory,
          product_brand: body.productBrand,
          product_name: body.productName || "",
          panel_unit: body.panelUnit,
          panel_count: body.panelCount,
          total_watt: body.totalWatt,
          product_price: body.productPrice,
          panel_warranty: body.panelWarranty,
          inverter_brand: body.inverterBrand,
          inverter_kw: body.inverterKw,
          inverter_warranty: body.inverterWarranty,
          battery_brand: body.batteryBrand || null,
          battery_count: body.batteryCount || 0,
          battery_warranty: body.batteryWarranty || null,
          battery_capacity: body.batteryCapacity || 0,
          battery_price: body.batteryPrice || 0,
          structure: body.structure,
          bos: body.bos,
          employee_id: body.employeeId,
          employee_name: body.employeeName,
          employee_email: body.employeeEmail,
          created_by: user.id,
          current_department: "Sales",
        })
        .select()
        .single();

      if (error) throw error;

      // Generate PDF, upload to storage, send email in the background
      const processPdfAndEmail = async () => {
        try {
          const fullQuotationData = { ...quotation, wiring: body.wiring, earthing: body.earthing, installation: body.installation, bos: body.bos };
          const pdfBytes = await generatePDF(fullQuotationData);
          
          // Ensure customer email is present before sending
          if (!quotation.customer_email) {
            console.log("No customer email provided for quotation, skipping email.");
          }

          // Upload PDF to Supabase Storage (Quotations bucket)
          const fileName = `Quotation_${quotation.quotation_id}.pdf`;
          const { error: storageError } = await supabase.storage
            .from("Quotations")
            .upload(fileName, pdfBytes, {
              contentType: "application/pdf",
              upsert: true, // Overwrite if exists
            });
          
          if (storageError) {
            console.error("Failed to upload PDF to storage:", storageError);
          } else {
            console.log(`✅ PDF uploaded to storage: ${fileName}`);
          }

          // Generate a token for customer approval portal
          let approvalToken = "";
          if (quotation.customer_email) {
            const { data: tokenData, error: tokenError } = await supabase
              .from('customer_portal_tokens')
              .insert({
                quotation_id: quotation.quotation_id,
                customer_email: quotation.customer_email,
                customer_name: quotation.customer_name,
                created_by: quotation.employee_name || 'Sales Team'
              })
              .select('token')
              .single();
              
            if (!tokenError && tokenData) {
              approvalToken = tokenData.token;
            }
          }

          // Send email
          if (quotation.customer_email) {
            await sendEmail(quotation, pdfBytes, approvalToken);
            console.log(`✅ Email sent to ${quotation.customer_email}`);
          }
        } catch (err) {
          console.error("PDF/Email error:", err);
        }
      };

      // Start the background process using EdgeRuntime.waitUntil for true background execution
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(processPdfAndEmail());
      } else {
        processPdfAndEmail();
      }

      return jsonResponse({ success: true, message: "Quotation created successfully.", data: quotation }, 201);
    }

    // ── GET ALL QUOTATIONS ─────────────────────────────────────────────────
    if (action === "list") {
      if (!user) return jsonResponse({ message: "Unauthorized" }, 401);
      let query = supabase.from("quotations").select("*").order("created_at", { ascending: false });

      if (user.role === "sales") {
        query = query.eq("created_by", user.id);
      } else if (user.role === "registration") {
        query = query.eq("current_department", "Registration");
      }

      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(data);
    }

    // ── GET ONE QUOTATION ──────────────────────────────────────────────────
    if (action === "get_one") {
      if (!user) return jsonResponse({ message: "Unauthorized" }, 401);
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", body.id)
        .single();
      if (error) return jsonResponse({ message: "Quotation not found" }, 404);
      return jsonResponse(data);
    }

    // ── UPDATE STATUS / DETAILS ────────────────────────────────────────────
    if (action === "update_status") {
      if (!user) return jsonResponse({ message: "Unauthorized" }, 401);
      const updatePayload: Record<string, unknown> = {};
      if (body.status) updatePayload.status = body.status;
      if (body.currentDepartment) updatePayload.current_department = body.currentDepartment;
      if (body.customer_occupation) updatePayload.customer_occupation = body.customer_occupation;
      if (body.documents) updatePayload.documents = body.documents;

      const { data, error } = await supabase
        .from("quotations")
        .update(updatePayload)
        .eq("id", body.id)
        .select()
        .single();

      if (error) {
        return jsonResponse({ message: `Quotation update failed: ${error.message}` }, 400);
      }
      return jsonResponse({ success: true, data });
    }

    // ── APPROVE QUOTATION FROM PORTAL (Before Docs) ─────────────────────────
    if (action === "approve_quotation") {
      if (!body.portal_token || !body.id) {
        return jsonResponse({ message: "Invalid request" }, 400);
      }
      const { data: tRow } = await supabase.from('customer_portal_tokens').select('*').eq('token', body.portal_token).single();
      if (!tRow) {
        return jsonResponse({ message: "Unauthorized" }, 403);
      }
      
      const { error: updErr } = await supabase.from("quotations").update({
        status: "Approved"
      }).eq("id", body.id);

      if (updErr) {
        return jsonResponse({ message: `Failed to approve quotation: ${updErr.message}` }, 400);
      }
      return jsonResponse({ success: true });
    }

    // ── UPLOAD DOCUMENTS FROM PORTAL ────────────────────────────────────────
    if (action === "upload_documents_portal") {
      if (!body.portal_token || !body.id || !body.documents) {
        return jsonResponse({ message: "Invalid request" }, 400);
      }
      const { data: tRow } = await supabase.from('customer_portal_tokens').select('*').eq('token', body.portal_token).single();
      if (!tRow) {
        return jsonResponse({ message: "Unauthorized" }, 403);
      }
      
      const { error: updErr } = await supabase.from("quotations").update({
        documents: body.documents
      }).eq("id", body.id);

      if (updErr) {
        return jsonResponse({ message: `Failed to save documents: ${updErr.message}` }, 400);
      }
      return jsonResponse({ success: true });
    }

    // ── DECLINE QUOTATION FROM PORTAL ──────────────────────────────────────
    if (action === "decline_quotation") {
      if (!body.portal_token || !body.id) {
        return jsonResponse({ message: "Invalid request" }, 400);
      }
      const { data: tRow } = await supabase.from('customer_portal_tokens').select('*').eq('token', body.portal_token).single();
      if (!tRow) {
        return jsonResponse({ message: "Unauthorized" }, 403);
      }
      
      const { error: updErr } = await supabase.from("quotations").update({
        status: "Rejected"
      }).eq("id", body.id);

      if (updErr) {
        return jsonResponse({ message: `Failed to decline quotation: ${updErr.message}` }, 400);
      }
      return jsonResponse({ success: true });
    }

    // ── SEND TO REGISTRATION (Converts Quotation -> Case) ──────────────────
    if (action === "send_to_registration") {
      let authorized = false;
      let portalTokenRow = null;

      if (user && (user.role === "sales" || user.role === "admin")) {
        authorized = true;
      } else if (body.portal_token) {
        // Verify portal token (Expiration removed as per request)
        const { data: tRow } = await supabase.from('customer_portal_tokens').select('*').eq('token', body.portal_token).single();
        if (tRow) {
          authorized = true;
          portalTokenRow = tRow;
        }
      }

      if (!authorized) {
        return jsonResponse({ message: "Only sales, admin, or valid portal token can send to registration" }, 403);
      }

      const { data: q, error: qErr } = await supabase.from("quotations").select("*").eq("id", body.id).single();
      if (qErr) return jsonResponse({ message: "Quotation not found" }, 404);

      // ── Generate & save branded tracking_id & customer_id ────────────────
      const customerName   = q.customer_name || "";
      const nameSlug       = customerName.replace(/\s+/g, "").toUpperCase().replace(/[^A-Z]/g, "").substring(0, 4).padEnd(4, "X");
      const randomDigits   = String(Math.floor(10000 + Math.random() * 90000));
      const trackingIdVal  = `Probfixora-${nameSlug}-${randomDigits}`; 

      const now            = new Date();
      const dd   = String(now.getDate()).padStart(2, "0");
      const mm   = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = String(now.getFullYear());
      const custRandom     = String(Math.floor(10000 + Math.random() * 90000));
      const customerIdVal  = `${nameSlug}-${dd}${mm}${yyyy}-${custRandom}`; 
      // ─────────────────────────────────────────────────────────────────────

      const { data: newCase, error: caseErr } = await supabase.from("cases").insert({
        customer_name: q.customer_name,
        phone: q.customer_mobile,
        email: q.customer_email,
        address: q.customer_address,
        load_required: Number(q.total_watt || 0),
        payment_type: 'cash', // Default fallback
        assigned_team: 'Registration',
        status: 'In Progress',
        current_stage: 'Registration Done',
        documents: q.documents || {},
        created_by: q.created_by || user?.id || null,
        sales_person: q.employee_name || null,
        tracking_id: trackingIdVal,
        customer_id: customerIdVal,
        reference: q.quotation_id, // Store quotation ID here
      }).select().single();

      if (caseErr) return jsonResponse({ message: `Case creation failed: ${caseErr.message}` }, 400);

      // Manually insert case history so the user name appears instead of "System"
      await supabase.from("case_history").insert({
        case_id: newCase.id,
        stage: "Registration Done",
        department: "Registration",
        updated_by: user?.name || (portalTokenRow?.customer_name || "Customer"),
        remarks: "Documents verified, sent to Registration"
      });

      const { error: updErr } = await supabase.from("quotations").update({
        current_department: "Sales",
        status: "Approved"
      }).eq("id", body.id);

      if (updErr) {
        // Rollback created case if quotation update fails
        await supabase.from("cases").delete().eq("id", newCase.id);
        return jsonResponse({ message: `Quotation update failed: ${updErr.message}` }, 400);
      }

      // ── NOTE: Tracking ID email is NOT sent here. ─────────────────────────
      // It will be sent automatically when Registration department moves the
      // case from "Registration Done" → "Phone Verification Done" (after they
      // verify documents and are about to call the customer).
      // ─────────────────────────────────────────────────────────────────────


      return jsonResponse({ success: true, caseId: newCase.id || newCase.tracking_id });
    }

    // ── CATALOG PRODUCTS (static lookup) ──────────────────────────────────
    if (action === "catalog_products") {
      const products = [
        { id: "p1", name: "Luminous 335W Mono", watt: 335, price: 15000, categoryId: "Off Grid", brandId: "Luminous" },
        { id: "p2", name: "Luminous 440W Bifacial", watt: 440, price: 20000, categoryId: "On Grid", brandId: "Luminous" },
        { id: "p3", name: "Tata 330W Poly", watt: 330, price: 12000, categoryId: "Off Grid", brandId: "Tata Power" },
        { id: "p4", name: "Tata 545W Mono", watt: 545, price: 25000, categoryId: "On Grid", brandId: "Tata Power" },
        { id: "p5", name: "Adani 330W Poly", watt: 330, price: 11000, categoryId: "Off Grid", brandId: "Adani" },
        { id: "p6", name: "Adani 540W Mono", watt: 540, price: 24000, categoryId: "On Grid", brandId: "Adani" },
      ];
      const filtered = products.filter(
        (p) =>
          (!body.categoryId || p.categoryId === body.categoryId) &&
          (!body.brandId || p.brandId === body.brandId)
      );
      return jsonResponse(filtered);
    }

    return jsonResponse({ message: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    let message = "Internal error";
    if (err instanceof Error) {
      message = err.message;
    } else if (err && err.message) {
      message = err.message;
    } else {
      message = JSON.stringify(err);
    }
    return jsonResponse({ message }, message.includes("Unauthorized") ? 401 : 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
