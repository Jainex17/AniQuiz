let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
try {
  const cfg = require("./config.json");
  GEMINI_API_KEY = GEMINI_API_KEY || cfg.GEMINI_API_KEY || cfg.OPENAI_API_KEY;
} catch {}

async function geminiChat(systemInstruction, contents) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    }
  );
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.filter((p) => p.text)
    .map((p) => p.text)
    .join("");
  if (!text) throw new Error(JSON.stringify(data).slice(0, 300));
  return text;
}

async function geminiImage(prompt) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }
  throw new Error(JSON.stringify(data).slice(0, 300));
}

module.exports = { geminiChat, geminiImage, GEMINI_API_KEY };
