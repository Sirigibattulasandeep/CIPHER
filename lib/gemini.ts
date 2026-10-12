import { Finding, EvidenceItem } from "@/types";

export interface AiIncidentSummaryResponse {
  summary: string;
  threatAssessment: string;
  recommendedSteps: string[];
  provider: "Gemini 1.5 Pro" | "Deterministic Heuristic Engine";
}

export async function generateIncidentSummary(
  finding: Finding
): Promise<AiIncidentSummaryResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are SENTRIX Cyber Threat Intelligence AI Assistant. Analyze this digital risk finding grounded strictly in the supplied evidence:
Brand: ${finding.brandName}
Category: ${finding.category}
Source Module: ${finding.sourceModule}
Entity: ${finding.entityName} (${finding.entityType})
Risk Score: ${finding.riskScore}/100 (Severity: ${finding.severity.toUpperCase()})
Confidence: ${finding.confidence}%
Indicators: ${finding.indicators.join(", ")}
Evidence:
${finding.evidence.map((e) => `- [${e.strength.toUpperCase()}] ${e.summary}: ${e.detail}`).join("\n")}

Provide a JSON object with:
{
  "summary": "Analyst summary in 2 sentences explaining why this finding matters.",
  "threatAssessment": "1 sentence describing immediate impact and vector.",
  "recommendedSteps": ["Step 1", "Step 2", "Step 3"]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            summary: parsed.summary,
            threatAssessment: parsed.threatAssessment,
            recommendedSteps: parsed.recommendedSteps,
            provider: "Gemini 1.5 Pro",
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to deterministic synthesis:", err);
    }
  }

  // Deterministic Baseline Fallback
  const strongEvidence = finding.evidence.filter((e) => e.strength === "strong");
  const strongSummaries = strongEvidence.map((e) => e.summary).join("; ");

  const steps: string[] = [];
  if (finding.sourceModule === "social") {
    steps.push(`Verify against ${finding.brandName}'s official social handle registry.`);
    steps.push(`Generate evidence package with timestamped snapshots.`);
    steps.push(`File priority Platform Impersonation & Trademark report.`);
  } else if (finding.sourceModule === "app") {
    steps.push(`Validate publisher signing certificate and store listing bundle identifier.`);
    steps.push(`Submit application store DMCA violation and trademark abuse ticket.`);
    steps.push(`Issue customer alert regarding unauthorized APK distribution.`);
  } else if (finding.sourceModule === "domain") {
    steps.push(`Validate DNS records (A, MX, TXT) and certificate transparency logs.`);
    steps.push(`Submit emergency phishing report to hosting provider and domain registrar.`);
    steps.push(`Request safe-browsing blocklist inclusion (Google Safe Browsing & Microsoft SmartScreen).`);
  } else {
    steps.push(`Conduct forensic verification of target infrastructure.`);
    steps.push(`Issue Cease and Desist notification.`);
  }

  return {
    summary: `${finding.brandName} is targeted by a ${finding.severity}-severity ${finding.category.replace(/_/g, " ")} on ${finding.sourceModule}. Evidence indicates ${strongSummaries || finding.description}.`,
    threatAssessment: `Presents active brand confusion, credential interception, and reputation harm risks for ${finding.brandName}.`,
    recommendedSteps: steps,
    provider: "Deterministic Heuristic Engine",
  };
}

