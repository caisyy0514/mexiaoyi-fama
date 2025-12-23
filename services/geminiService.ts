
import { GoogleGenAI } from "@google/genai";

export const generateCampaignAIAssistance = async (campaignName: string, campaignDescription: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    我正在运行一个名为 "${campaignName}" 的会员码分发活动。
    活动背景: ${campaignDescription}
    
    请用中文提供：
    1. 一句吸引人的口号。
    2. 专业的兑换说明（最多3步）。
    3. 关于“每人限领一次”的简短提示。
    
    请以结构化的文本格式返回。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Generation failed:", error);
    return "生成 AI 辅助内容失败。";
  }
};
