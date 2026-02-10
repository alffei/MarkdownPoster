/**
 * 模块说明：AI 服务封装，负责调用大模型接口并返回结构化文本结果。
 */

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
    // 兼容浏览器构建注入与 Node 环境执行两种变量来源。
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
      // 活动海报提示词依赖模板占位，运行时注入当前固定模板文本。
      prompt = AI_PROMPTS.eventPoster.replace(
        "{{EVENT_TEMPLATE}}",
        EVENT_POSTER_TEMPLATE
      );
      break;
  }

  try {
    // 模型若返回空结果，回退到原文，避免调用方拿到空字符串覆盖正文。
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
    // 识别任务偏向确定性，温度降低并限制输出长度。
    { temperature: 0.1, maxTokens: 800 }
  );

  const parsed = parseJsonText(result);
  const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
  const author = typeof parsed?.author === "string" ? parsed.author.trim() : "";

  return { title, author };
};
