
// @google/genai-sdk/index.ts
import { GoogleGenAI, Content } from "@google/genai";
import type { AIConfig, KnowledgeSource } from './types';

// The API key MUST be obtained exclusively from the environment variable `process.env.API_KEY`.
// Assume this variable is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Generates a chat response from the Gemini model based on specific bot training.
 * @param message The latest user message.
 * @param history The conversation history.
 * @param config The AI configuration for the specific bot.
 * @param sources The knowledge sources for the specific bot.
 * @returns The AI-generated response text.
 */
export const generateChatResponse = async (
  message: string,
  history: Content[],
  config?: AIConfig,
  sources?: KnowledgeSource[]
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';

    // Build a dynamic system instruction
    let systemInstruction = "You are a helpful customer support chatbot for a company called Legal Practice Council Agents.";

    if (config) {
        systemInstruction += ` You have a ${config.personality} personality and should maintain a ${config.tone} tone. Your responses should be ${config.responseLength}.`;
        if (config.goal) {
            systemInstruction += ` Your primary goal is: ${config.goal}.`;
        }
        if (config.additionalInfo) {
            systemInstruction += ` Strictly follow these additional instructions: ${config.additionalInfo}.`;
        }
    }

    if (sources && sources.length > 0) {
        const faqs = sources.filter(s => s.type === 'faq');
        const otherSources = sources.filter(s => s.type !== 'faq');

        systemInstruction += "\n\nBase your answers *only* on the following knowledge sources. Do not use external knowledge unless the user explicitly asks for it.";
        
        if (faqs.length > 0) {
            systemInstruction += "\n\n--- IMPORTANT: Prioritize these FAQs. If the user's question is similar to one of these, you MUST provide the given answer. ---";
            faqs.forEach(source => {
                if (source.content) {
                    systemInstruction += `\n- FAQ: Question: "${source.content.question}" Answer: "${source.content.answer}"`;
                }
            });
             systemInstruction += "\n--- End of FAQs ---";
        }
       
        if (otherSources.length > 0) {
             systemInstruction += "\n\nYou can also reference these other documents if the FAQs are not relevant:";
             otherSources.forEach(source => {
                systemInstruction += `\n- Reference ${source.type}: ${source.name}`;
            });
        }
    }

    const contents: Content[] = [...history, { role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    const text = response.text;
    if (text) {
        return text;
    } else {
        return "I'm sorry, I couldn't generate a response. Please try rephrasing.";
    }

  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, an error occurred while trying to connect to the AI service. Please check your connection and API key.";
  }
};
