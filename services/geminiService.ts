/**
 * 模块说明：AI 服务封装，负责调用大模型接口并返回结构化文本结果。
 */

import { AiAction } from "../types";
import { AI_PROMPTS, EVENT_POSTER_TEMPLATE } from "../config/aiTemplates";

const env = (import.meta as { env?: Record<string, string> }).env ?? {};

type LlmProvider = "gemini" | "glm";

const normalizeProvider = (raw?: string): LlmProvider => {
  const normalized = String(raw || "").trim().toLowerCase();
  return normalized === "gemini" ? "gemini" : "glm";
};

const LLM_PROVIDER = normalizeProvider(env.VITE_LLM_PROVIDER);

const firstNonEmptyEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = String(env[key] || "").trim();
    if (value) return value;
  }
  return "";
};

const requireProviderEnv = (provider: LlmProvider, keys: string[], label: string) => {
  const value = firstNonEmptyEnv(...keys);
  if (value) return value;
  throw new Error(
    `[LLM:${provider}] Missing ${label}. Set one of: ${keys.join(" | ")}`
  );
};

const getGlmConfig = () => ({
  endpoint: requireProviderEnv("glm", ["VITE_GLM_PROXY_URL"], "endpoint"),
  model: requireProviderEnv("glm", ["VITE_GLM_MODEL"], "model"),
});

const getGeminiConfig = () => ({
  endpoint: requireProviderEnv(
    "gemini",
    ["VITE_GEMINI_API_BASE_URL", "VITE_GEMINI_BASE_URL"],
    "endpoint"
  ),
  model: requireProviderEnv(
    "gemini",
    ["VITE_GEMINI_TEXT_MODEL", "VITE_GEMINI_MODEL"],
    "model"
  ),
});

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const buildGeminiGenerateContentUrl = (baseUrl: string, model: string) => {
  const base = normalizeBaseUrl(baseUrl);
  if (/\/v1beta\/models\/[^/]+:generateContent$/i.test(base)) {
    return base;
  }
  if (/\/v1beta\/models$/i.test(base)) {
    return `${base}/${encodeURIComponent(model)}:generateContent`;
  }
  if (/\/v1beta$/i.test(base)) {
    return `${base}/models/${encodeURIComponent(model)}:generateContent`;
  }
  return `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
};

const readResponseText = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const pickTextFromModelResponse = (data: unknown): string => {
  if (typeof data === "string") return data.trim();
  if (!data || typeof data !== "object") return "";

  const obj = data as Record<string, unknown>;

  const openAiText = (obj.choices as Array<Record<string, unknown>> | undefined)
    ?.map(choice => {
      const message = choice?.message as Record<string, unknown> | undefined;
      const content = message?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map(item =>
            typeof item === "object" && item && "text" in item
              ? String((item as Record<string, unknown>).text ?? "")
              : ""
          )
          .join("");
      }
      return "";
    })
    .join("\n")
    .trim();
  if (openAiText) return openAiText;

  const geminiText = (obj.candidates as Array<Record<string, unknown>> | undefined)
    ?.map(candidate => {
      const content = candidate?.content as Record<string, unknown> | undefined;
      const parts = content?.parts as Array<Record<string, unknown>> | undefined;
      if (!parts) return "";
      return parts.map(part => String(part?.text ?? "")).join("");
    })
    .join("\n")
    .trim();
  if (geminiText) return geminiText;

  const directText = obj.output_text ?? obj.text;
  return typeof directText === "string" ? directText.trim() : "";
};

const parseJsonText = (raw: string) => {
  const trimmed = raw.trim();
  // 部分模型会返回“解释 + JSON”，这里优先提取首个 JSON 片段再解析。
  const direct = trimmed.match(/\{[\s\S]*\}/);
  const jsonCandidate = direct ? direct[0] : trimmed;
  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
};

const callGlm = async (
  content: string,
  options?: { temperature?: number; maxTokens?: number }
) => {
  const { endpoint, model } = getGlmConfig();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      // 关闭思维链输出，避免返回冗长推理文本污染结构化结果。
      thinking: { type: "disabled" },
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM API Error: ${response.status} ${errorText}`);
  }

  const data = await readResponseText(response);
  return pickTextFromModelResponse(data);
};

const callGemini = async (
  content: string,
  options?: { temperature?: number; maxTokens?: number }
) => {
  const { endpoint, model } = getGeminiConfig();
  const url = buildGeminiGenerateContentUrl(endpoint, model);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: content }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    }),
  });

  const data = await readResponseText(response);
  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Gemini API Error(${response.status}) @ ${url}: ${detail}`);
  }

  const text = pickTextFromModelResponse(data);
  if (text) return text;
  throw new Error(`Gemini response has no text @ ${url}`);
};

const callModel = async (
  content: string,
  options?: { temperature?: number; maxTokens?: number }
) => {
  if (LLM_PROVIDER === "glm") {
    return callGlm(content, options);
  }
  return callGemini(content, options);
};

export const processMarkdownWithAi = async (
  currentText: string,
  action: AiAction
): Promise<string> => {
  if (!currentText.trim()) return "";

  let prompt = "";
  
  switch (action) {
    case AiAction.POLISH:
      prompt = "Please polish the following Markdown text, fixing grammar, improving clarity, and ensuring professional tone while preserving the Markdown formatting. Output ONLY the improved Markdown code.";
      break;
    case AiAction.SUMMARIZE:
      prompt = "Please summarize the following Markdown text into a concise bulleted list using Markdown. Output ONLY the summary.";
      break;
    case AiAction.EXPAND:
      prompt = "Please expand on the ideas in the following Markdown text, adding more detail and depth while maintaining the original style. Output ONLY the result in Markdown.";
      break;
    case AiAction.TRANSLATE_EN:
      prompt = "Please translate the following text to English, preserving all Markdown formatting structure strictly. Output ONLY the translated Markdown.";
      break;
    case AiAction.TRANSLATE_CN:
      prompt = "Please translate the following text to Simplified Chinese, preserving all Markdown formatting structure strictly. Output ONLY the translated Markdown.";
      break;
    case AiAction.SEMANTIC_FORMAT:
      prompt = AI_PROMPTS.semanticFormat;
      break;
    case AiAction.EVENT_POSTER:
      // 活动海报提示词依赖模板占位，运行时注入当前固定模板文本。
      prompt = AI_PROMPTS.eventPoster.replace(
        "{{EVENT_TEMPLATE}}",
        EVENT_POSTER_TEMPLATE
      );
      break;
  }

  try {
    // 模型若返回空结果，回退到原文，避免调用方拿到空字符串覆盖正文。
    const result = await callModel(`${prompt}\n\n---\n\n${currentText}`);
    return result || currentText;
  } catch (error) {
    console.error("LLM API Error:", error);
    throw error;
  }
};

export const inferPoemMetaWithAi = async (
  poemText: string
): Promise<{ title: string; author: string }> => {
  if (!poemText.trim()) {
    return { title: "", author: "" };
  }

  const result = await callModel(
    `${AI_PROMPTS.poemMeta}\n\n---\n\n${poemText}`,
    // 识别任务偏向确定性，温度降低并限制输出长度。
    { temperature: 0.1, maxTokens: 800 }
  );

  const parsed = parseJsonText(result);
  const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
  const author = typeof parsed?.author === "string" ? parsed.author.trim() : "";

  return { title, author };
};
