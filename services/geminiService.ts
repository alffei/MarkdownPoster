import { AiAction } from "../types";
import { AI_PROMPTS, EVENT_POSTER_TEMPLATE } from "../config/aiTemplates";

const GLM_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

const getGlmApiKey = () => {
  const env = (import.meta as { env?: Record<string, string> }).env ?? {};
  const keyFromVite =
    env.VITE_BIGMODEL_API_KEY ||
    env.VITE_GLM_API_KEY ||
    env.VITE_API_KEY;

  if (keyFromVite) return keyFromVite;

  if (typeof process !== "undefined") {
    return (
      process.env.BIGMODEL_API_KEY ||
      process.env.GLM_API_KEY ||
      process.env.API_KEY
    );
  }

  return undefined;
};

const parseJsonText = (raw: string) => {
  const trimmed = raw.trim();
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
  const apiKey = getGlmApiKey();
  if (!apiKey) {
    throw new Error("Missing GLM API key.");
  }

  const response = await fetch(GLM_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-4.7-flash",
      messages: [{ role: "user", content }],
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

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
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
      prompt = AI_PROMPTS.eventPoster.replace(
        "{{EVENT_TEMPLATE}}",
        EVENT_POSTER_TEMPLATE
      );
      break;
  }

  try {
    const result = await callGlm(`${prompt}\n\n---\n\n${currentText}`);
    return result || currentText;
  } catch (error) {
    console.error("GLM API Error:", error);
    throw error;
  }
};

export const inferPoemMetaWithAi = async (
  poemText: string
): Promise<{ title: string; author: string }> => {
  if (!poemText.trim()) {
    return { title: "", author: "" };
  }

  const result = await callGlm(
    `${AI_PROMPTS.poemMeta}\n\n---\n\n${poemText}`,
    { temperature: 0.1, maxTokens: 800 }
  );

  const parsed = parseJsonText(result);
  const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
  const author = typeof parsed?.author === "string" ? parsed.author.trim() : "";

  return { title, author };
};
