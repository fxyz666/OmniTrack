
import { GoogleGenAI, Type } from "@google/genai";
import { UsageLog, DeviceType, ActivityCategory } from "../types";

// Removed global API_KEY constant to use process.env.API_KEY directly in function calls as per guidelines

export const getUsageInsights = async (logs: UsageLog[]): Promise<string> => {
  if (logs.length === 0) return "暂无数据，开始记录你的第一条足迹吧。";

  // Fix: Initialize GoogleGenAI using the process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const simplifiedLogs = logs.map(l => ({
    app: l.appName,
    duration: (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000,
    device: l.deviceType,
    desc: l.activityDescription
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `分析以下设备使用日志并提供3句简短的效率总结和1条改进建议。日志: ${JSON.stringify(simplifiedLogs.slice(-10))}`,
    });

    return response.text || "暂时无法生成洞察。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 洞察服务暂不可用。";
  }
};

/**
 * Parses raw text from mobile Screen Time / Digital Wellbeing into UsageLog objects
 */
export const parseMobileUsageText = async (text: string, date: string): Promise<UsageLog[]> => {
  // Fix: Initialize GoogleGenAI using the process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Task: Parse the following text into a list of digital usage logs.
    Context: The text is copied from a mobile phone's Screen Time or Digital Wellbeing page.
    Date: ${date}
    Output Format: JSON array of objects following the UsageLog structure.
    Properties:
    - id: unique string
    - startTime: ISO string (estimate based on duration and order)
    - endTime: ISO string
    - deviceType: "Mobile"
    - deviceName: "Parsed Mobile"
    - appName: string
    - category: "工作" | "学习" | "娱乐" | "生活" | "其他"
    - activityDescription: "AI parsed from mobile report"
    - syncStatus: "local"

    Input Text: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              deviceType: { type: Type.STRING },
              deviceName: { type: Type.STRING },
              appName: { type: Type.STRING },
              category: { type: Type.STRING },
              activityDescription: { type: Type.STRING },
              syncStatus: { type: Type.STRING }
            },
            required: ["id", "startTime", "endTime", "appName", "category"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Parsing Error:", error);
    throw new Error("无法解析该段文本，请尝试更清晰的描述。");
  }
};
