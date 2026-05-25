// app/api/generate-bio/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TYPEWRITER_DELAY_MS = 30;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: Request) {
  const { name, title, business, category } = await request.json();

  if (!name || !title || !business) {
    return NextResponse.json(
      { error: "name, title, and business are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY not configured" },
      { status: 500 }
    );
  }

  const prompt = `Write a 2-3 sentence professional bio in third person for ${name}, who works as a ${title} at ${business}${category ? ` in the ${category} industry` : ""}. Keep it concise, warm, and professional. Do not use any markdown formatting.`;

  const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!deepseekRes.ok) {
    const err = await deepseekRes.text();
    return NextResponse.json(
      { error: `DeepSeek error: ${err}` },
      { status: 500 }
    );
  }

  // Parse SSE from DeepSeek and re-emit one character at a time
  // with a 30ms delay between characters — typewriter effect happens server-side.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = deepseekRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by blank line)
          let sepIdx: number;
          while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);

            for (const line of rawEvent.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const text: string | undefined = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  for (const ch of text) {
                    controller.enqueue(encoder.encode(ch));
                    await sleep(TYPEWRITER_DELAY_MS);
                  }
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}