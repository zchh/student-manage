import { SpecError } from "../domain/rules.js";

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function completeWithBailian(prompt: string): Promise<string> {
  const apiKey = process.env.DASHSCOPE_API_KEY ?? "";
  if (!apiKey) throw new SpecError("SPEC-TRIAL-05", "未配置百炼 API Key");
  const base = (process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = process.env.DASHSCOPE_MODEL ?? "qwen-plus";
  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new SpecError("SPEC-TRIAL-05", timedOut ? "百炼调用超时" : "百炼调用失败");
  }
  const body = (await response.json().catch(() => ({}))) as ChatResponse;
  if (!response.ok) {
    const detail = body.error?.message || `HTTP ${response.status}`;
    throw new SpecError("SPEC-TRIAL-05", `百炼调用失败：${detail}`);
  }
  return body.choices?.[0]?.message?.content?.trim() ?? "";
}
