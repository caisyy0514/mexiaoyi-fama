
import { GoogleGenAI } from "@google/genai";

export const generateCampaignAIAssistance = async (campaignName: string, campaignDescription: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // 结合联网搜索，获取最新的营销趋势
  const prompt = `
    任务：为以下会员活动策划吸引人的在线营销文案。
    活动名称: "${campaignName}"
    基本描述: ${campaignDescription}
    
    要求：
    1. 结合当下最流行的互联网梗或营销热点。
    2. 提供一句极具转化力的标题。
    3. 给出3个简洁的兑换步骤。
    4. 强调“每人限领一次”的公平原则。
    
    输出语言：中文
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        // 启用 Google 搜索增强，使内容“在线”
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    // 如果有搜索结果参考，可以在此处提取（根据需要）
    const text = response.text;
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (grounding && grounding.length > 0) {
      console.log("[AI Online] Reference data acquired from web.");
    }

    return text;
  } catch (error) {
    console.error("AI Generation failed:", error);
    return "生成 AI 辅助内容失败，请检查 API 密钥配置。";
  }
};
