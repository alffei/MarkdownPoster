/**
 * 模块说明：AI 服务封装，统一走 RRZXS 通用后端的鉴权、积分与模型代理。
 */

import { AiAction } from "../types";
import { AI_PROMPTS, EVENT_POSTER_TEMPLATE } from "../config/aiTemplates";
import { authenticatedJsonRequest, createIdempotencyKey } from "./apiClient";

const CREDIT_BALANCE_EVENT = 'mdp-credit-balance-updated';

type ChatResponse = {
  result: string;
  credit?: {
    charged?: number;
    balance?: number;
    hold_id?: string;
  };
};

type GenerateImageResponse = {
  image_url: string;
  credit?: {
    charged?: number;
    balance?: number;
    hold_id?: string;
  };
};

const emitCreditBalance = (balance?: number) => {
  if (typeof window === 'undefined' || !Number.isFinite(balance)) return;
  window.dispatchEvent(
    new CustomEvent(CREDIT_BALANCE_EVENT, {
      detail: { balance },
    })
  );
};

export const addCreditBalanceListener = (listener: (balance: number) => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ balance?: number }>;
    const balance = customEvent.detail?.balance;
    if (Number.isFinite(balance)) {
      listener(balance as number);
    }
  };

  window.addEventListener(CREDIT_BALANCE_EVENT, handler);
  return () => window.removeEventListener(CREDIT_BALANCE_EVENT, handler);
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

const buildPromptByAction = (action: AiAction) => {
  switch (action) {
    case AiAction.POLISH:
      return "Please polish the following Markdown text, fixing grammar, improving clarity, and ensuring professional tone while preserving the Markdown formatting. Output ONLY the improved Markdown code.";
    case AiAction.SUMMARIZE:
      return "Please summarize the following Markdown text into a concise bulleted list using Markdown. Output ONLY the summary.";
    case AiAction.EXPAND:
      return "Please expand on the ideas in the following Markdown text, adding more detail and depth while maintaining the original style. Output ONLY the result in Markdown.";
    case AiAction.TRANSLATE_EN:
      return "Please translate the following text to English, preserving all Markdown formatting structure strictly. Output ONLY the translated Markdown.";
    case AiAction.TRANSLATE_CN:
      return "Please translate the following text to Simplified Chinese, preserving all Markdown formatting structure strictly. Output ONLY the translated Markdown.";
    case AiAction.SEMANTIC_FORMAT:
      return AI_PROMPTS.semanticFormat;
    case AiAction.EVENT_POSTER:
      return AI_PROMPTS.eventPoster.replace("{{EVENT_TEMPLATE}}", EVENT_POSTER_TEMPLATE);
    default:
      return "";
  }
};

const chatWithUniversalBackend = async (
  message: string,
  options?: { history?: Array<Record<string, unknown>>; model?: string }
) => {
  const response = await authenticatedJsonRequest<ChatResponse>(
    '/ai/chat',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: options?.history ?? [],
        model: options?.model,
      }),
    },
    { idempotencyKey: createIdempotencyKey() }
  );

  emitCreditBalance(response.credit?.balance);
  return response;
};

const fetchImageAsDataUrl = async (imageUrl: string) => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`图片拉取失败（${response.status}）`);
  }

  const blob = await response.blob();
  return new Promise<{ dataUrl: string; mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve({
        dataUrl: String(reader.result || ''),
        mimeType: blob.type || 'image/png',
      });
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
};

export const processMarkdownWithAi = async (
  currentText: string,
  action: AiAction
): Promise<string> => {
  if (!currentText.trim()) return "";

  const prompt = buildPromptByAction(action);
  const result = await chatWithUniversalBackend(`${prompt}\n\n---\n\n${currentText}`);
  return result.result?.trim() || currentText;
};

export const inferPoemMetaWithAi = async (
  poemText: string
): Promise<{ title: string; author: string }> => {
  if (!poemText.trim()) {
    return { title: "", author: "" };
  }

  const result = await chatWithUniversalBackend(`${AI_PROMPTS.poemMeta}\n\n---\n\n${poemText}`);
  const parsed = parseJsonText(result.result || '');
  const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
  const author = typeof parsed?.author === "string" ? parsed.author.trim() : "";

  return { title, author };
};

export const generateIllustrationWithAi = async (
  stylePrompt: string,
  contentDescription: string,
  ratio: string
): Promise<{ dataUrl: string; mimeType: string }> => {
  const style = stylePrompt.trim();
  const content = contentDescription.trim();
  const frameRatio = ratio.trim();

  if (!style) {
    throw new Error("Style prompt is required");
  }
  if (!content) {
    throw new Error("Content description is required");
  }
  if (!frameRatio) {
    throw new Error("Illustration ratio is required");
  }

  const prompt = [
    style,
    "",
    "请严格按上述风格生成一张插图。",
    `画面比例要求：${frameRatio}。请严格按该比例构图与输出。`,
    "核心内容：",
    content,
  ].join("\n");

  const response = await authenticatedJsonRequest<GenerateImageResponse>(
    '/ai/generate-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
      }),
    },
    { idempotencyKey: createIdempotencyKey() }
  );

  emitCreditBalance(response.credit?.balance);
  if (!response.image_url) {
    throw new Error('图片生成结果为空');
  }

  return fetchImageAsDataUrl(response.image_url);
};

