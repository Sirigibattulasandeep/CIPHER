import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt message is required." },
        { status: 400 }
      );
    }

    const currentRoute = context?.route || "/";
    const currentBrand = context?.brandName || "All Brands";
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Try Gemini API if key is present
    if (apiKey) {
      try {
        const systemPrompt = `You are SENTRIX Sentinel AI, an elite cybersecurity and Digital Risk Protection assistant embedded in the SENTRIX enterprise platform by Team CIPHER.
Current User Context:
- Route: ${currentRoute}
- Selected Brand: ${currentBrand}

Your role:
- Provide concise, analyst-grade cyber threat intelligence.
- Explain digital risks: typosquatting, combosquatting, punycode/homoglyph attacks, unauthorized mobile APKs, executive social impersonation.
- Offer actionable advice for takedown, DNS blocking, Google Safe Browsing reporting, DMCA notices, and investigation workflows.
- Guide the user on how to use SENTRIX features.
- Keep responses sharp, formatted in clean markdown with bullet points.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `${systemPrompt}\n\nUser Question: ${message}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({
              success: true,
              reply,
              provider: "Gemini AI",
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini call failed, switching to Sentinel Heuristic Engine:", geminiErr);
      }
    }

    // 2. High-speed Built-in Cybersecurity Intelligence Heuristic Engine
    const lower = message.toLowerCase();
    let reply = "";
    let quickActions: string[] = [];

    if (lower.includes("risk score") || lower.includes("calculate") || lower.includes("scoring") || lower.includes("algorithm")) {
      reply = `### SENTRIX Risk Scoring Matrix (v2.4)
The Risk Score (0–100) is synthesized using four deterministic telemetry layers:

1. **Target Affinity (30 pts)**: Lexical similarity against protected brand keywords, brand DNA aliases, and normalized tokens.
2. **Deception & Vector Intent (30 pts)**:
   - High-deception verbs in URL/handle: \`login\`, \`verify\`, \`support\`, \`pay\`, \`admissions\`.
   - Homoglyph or Punycode character substitutions (\`rn\` → \`m\`, Cyrillic \`о\` vs Latin \`o\`).
3. **Infrastructure & Exposure Signals (25 pts)**:
   - Untrusted hosting / TLDs (\`.site\`, \`.xyz\`, \`.live\`, \`.top\`).
   - Dangerous mobile permissions (\`READ_SMS\`, \`SYSTEM_ALERT_WINDOW\`).
   - Unverified social account with payment/gift link.
4. **Corroboration Factor (15 pts)**: Multi-channel corroboration (e.g. social handle pointing to fraudulent domain).

**Severity Thresholds**:
- **Critical (75–100)**: Immediate takedown recommended.
- **High (55–74)**: Active brand confusion or credential gathering.
- **Medium (35–54)**: Defensive squatting or unverified entity.
- **Low (0–34)**: Informational / benign overlap.`;
      quickActions = ["Filter Critical Findings", "Screen Suspicious Asset", "View Threat Radar"];
    } else if (lower.includes("takedown") || lower.includes("how to takedown") || lower.includes("remove") || lower.includes("phishing")) {
      reply = `### Rapid Incident Takedown Protocol
To neutralize an active phishing domain or impersonator:

1. **Evidence Gathering**:
   - Save timestamped screenshot and HTTP response headers.
   - Extract Registrar WHOIS and Name Server (NS) records.
2. **Registrar & Host Notice**:
   - Submit emergency abuse report to domain registrar (e.g., Namecheap Abuse, GoDaddy Abuse).
   - Email hosting provider (AWS, Cloudflare, DigitalOcean) citing Trademark infringement & Phishing.
3. **Safe Browsing Blacklisting**:
   - Report URL to [Google Safe Browsing](https://safebrowsing.google.com/safebrowsing/report_phish/).
   - Submit to Microsoft Defender SmartScreen & Netcraft.
4. **Internal Mitigation**:
   - Escalate to an **Investigation Case** in SENTRIX to track case notes and takedown statuses.`;
      quickActions = ["Go to Investigations", "View Findings Dossier", "Export Threat Data"];
    } else if (lower.includes("typosquat") || lower.includes("combosquat") || lower.includes("domain") || lower.includes("homoglyph")) {
      reply = `### Domain Threat Vector Taxonomy
SENTRIX continuously monitors three distinct mutations:

- **Typosquatting**: Typical keyboard distance errors (e.g., \`eduvrese.org\` instead of \`eduverse.org\`).
- **Combosquatting**: Pairing the brand name with trust-inducing terms (e.g., \`eduverse-verify.com\`, \`northstar-secure-login.net\`).
- **Homoglyphs / Punycode**: Substituting look-alike Unicode characters to bypass visual inspection (\`xn--...\`).

*Pro-tip: Head to the **Website & Domains** module to simulate live typosquat permutations and preview candidate DNS MX records!*`;
      quickActions = ["Open Domain Workspace", "Run Perimeter Sweep", "Screen Asset"];
    } else if (lower.includes("guide") || lower.includes("tour") || lower.includes("walkthrough") || lower.includes("how to use") || lower.includes("help")) {
      reply = `### SENTRIX Quick Start & Guide
Welcome to SENTRIX! Here is the recommended analyst workflow:

1. **Dashboard & Radar**: Check your overall Enterprise Security Posture index and review perimeter alerts across Social, Mobile, and Web channels.
2. **Brand DNA**: Select your active brand from the top navigation dropdown or define new official assets under \`/brands\`.
3. **Live Threat Screening**: Use **"Screen Asset"** in the top bar to test an unverified URL, app package, or social handle in real-time.
4. **Findings Dossier**: Inspect detected threats, review cryptographic evidence weights, and toggle workflow statuses.
5. **Investigations**: Escalate high-risk threats to track team takedown milestones.
6. **Privacy Shield**: Press **Alt+P** to blur proprietary client details during presentations.`;
      quickActions = ["Launch Interactive Tour", "Screen Asset", "Open Command Palette"];
    } else if (lower.includes("mobile") || lower.includes("apk") || lower.includes("app")) {
      reply = `### Mobile Perimeter Threat Protection
Unauthorized mobile applications present grave credential interception risks:

- **Third-Party APK Repackaging**: Attackers clone official brand apps, inject spyware or SMS interceptors, and publish them to non-certified marketplaces (APKPure, Uptodown).
- **Publisher Mismatch**: Brand name used in title (\`EduVerse Pro Pass\`) with unregistered publisher (\`FastStudy Global\`).
- **High-Risk Permissions**: Requests for \`READ_SMS\`, \`BIND_ACCESSIBILITY_SERVICE\`, or \`SYSTEM_ALERT_WINDOW\`.

Review the **App Monitoring** workspace to inspect package identifiers and issue DMCA store violations.`;
      quickActions = ["View App Monitoring", "Filter High Severity", "Screen App Package"];
    } else if (lower.includes("offline") || lower.includes("server") || lower.includes("resilience")) {
      reply = `### Sentrix Edge Resilience & Architecture
SENTRIX incorporates an autonomous resilient offline architecture:
- **Offline Data Fallback**: When the PostgreSQL server or network connection drops, client requests automatically fall back to cached local storage and seed telemetry.
- **Service Worker Active**: Progressive Web App caching ensures page assets and fonts remain responsive without network connectivity.
- **Real-time Status Heartbeat**: The header status indicator alerts you when connection to Sentrix Edge is active or running locally.`;
      quickActions = ["Check Health Status", "Seed Reset", "Overview"];
    } else {
      reply = `### SENTRIX Security Assistant
I'm your AI Copilot for **${currentBrand}**. I can assist you with:

- **Threat Dossier Interpretation**: Assessing confidence, indicators, and risk score breakdown.
- **Perimeter Scans**: Evaluating suspicious domains, mobile applications, or social media handles.
- **Remediation & Takedowns**: Generating registrar abuse reports and Google Safe Browsing submissions.
- **Platform Navigation**: Quick shortcuts, RBAC permissions, and guided tours.

What would you like to investigate?`;
      quickActions = ["Explain Risk Score", "How to Takedown a Domain", "Launch App Tour", "Screen Asset"];
    }

    return NextResponse.json({
      success: true,
      reply,
      quickActions,
      provider: "Sentinel Heuristic Engine",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed processing AI assistant request." },
      { status: 500 }
    );
  }
}

