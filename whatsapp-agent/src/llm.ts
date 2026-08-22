import { config } from "./config.js";

export async function completeJson(prompt: string): Promise<string | null> {
  if (!config.llmApiKey) {
    return null;
  }
  const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.llmApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.llmModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a WhatsApp concierge for Hospitality Partners and Grant Brown's other brands. Reply only with compact JSON.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LLM ${response.status}: ${detail.slice(0, 400)}`);
  }
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return body.choices?.[0]?.message?.content ?? null;
}
