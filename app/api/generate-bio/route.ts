// app/api/generate-bio/route.ts
import { NextResponse } from "next/server";

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

  // Stream the response back to the browser as plain text
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = deepseekRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // DeepSeek sends server-sent events: "data: {...}\n\n"
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const json = line.replace("data: ", "").trim();
          if (json === "[DONE]") break;

          try {
            const parsed = JSON.parse(json);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // skip malformed chunks
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}