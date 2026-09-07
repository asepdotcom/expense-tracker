const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 15000;

const SYSTEM_PROMPT = `
You are a helpful personal finance analyst. You are given a summary of a
user's expenses (totals by category, totals by day, a date range, grand
total, and record count). Write a short, clear analysis of their spending
and give practical recommendations.

Rules:
- Output ONLY valid JSON, no markdown, no code fences, no extra text.
- JSON shape:
  { "analysis": "string", "recommendations": ["string", ...] }
- "analysis": 2-4 short paragraphs (plain text, no markdown headers) covering
  spending patterns, biggest categories, and any notable trends across days.
- "recommendations": 3-5 short, actionable, specific bullet points based on
  the actual data given (not generic advice).
- Use the currency values as given (assume IDR); do not convert currencies.
- If there is too little data to say much, be honest about that but still
  give at least one useful recommendation.
`;

function extractJson(content) {
  const match = content.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(content);
}

export async function POST(req) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "DeepSeek API key is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      from,
      to,
      categoryTotals = [],
      dailyTotals = [],
      grandTotal = 0,
      recordCount = 0,
    } = body || {};

    if (!Array.isArray(categoryTotals) || !Array.isArray(dailyTotals)) {
      return Response.json({ error: "Invalid analytics payload." }, { status: 400 });
    }

    const userContent = `Date range: ${from || "(no start)"} to ${to || "(no end)"}.
Grand total: ${grandTotal}.
Record count: ${recordCount}.
Totals by category: ${JSON.stringify(categoryTotals)}.
Totals by day: ${JSON.stringify(dailyTotals)}.`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let content;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 900,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`DeepSeek API error ${res.status}: ${text.substring(0, 300)}`);
      }
      const data = await res.json();
      content = data.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timer);
    }

    let parsed;
    try {
      parsed = extractJson(content);
    } catch (e) {
      return Response.json(
        { error: "Could not parse the analysis. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      analysis: parsed.analysis || "",
      recommendations: parsed.recommendations || [],
    });
  } catch (e) {
    return Response.json({ error: e.message || "Analysis failed." }, { status: 500 });
  }
}
