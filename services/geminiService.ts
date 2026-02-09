import { GoogleGenAI, Content } from "@google/genai";
import type { AIConfig, KnowledgeSource } from "../types";

const MODEL =
    (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash";

let ai: GoogleGenAI | null = null;

function getAI() {
    if (ai) return ai;

    const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!key || key.trim().length === 0) {
        throw new Error(
            "Missing Gemini API key. Set VITE_GEMINI_API_KEY in .env.local and restart the dev server."
        );
    }

    ai = new GoogleGenAI({ apiKey: key });
    return ai;
}

export const generateChatResponse = async (
    message: string,
    history: Content[],
    config?: AIConfig,
    sources?: KnowledgeSource[]
): Promise<string> => {
    try {
        // Build systemInstruction exactly as you already do...
        let systemInstruction =
            "You are a helpful customer support chatbot for a company called Legal Practice Council Agents.";

        if (config) {
            systemInstruction += ` You have a ${config.personality} personality and should maintain a ${config.tone} tone. Your responses should be ${config.responseLength}.`;
            if (config.goal) systemInstruction += ` Your primary goal is: ${config.goal}.`;
            if (config.additionalInfo)
                systemInstruction += ` Strictly follow these additional instructions: ${config.additionalInfo}.`;
        }

        if (sources && sources.length > 0) {
            const faqs = sources.filter((s) => s.type === "faq");
            const otherSources = sources.filter((s) => s.type !== "faq");

            systemInstruction +=
                "\n\nBase your answers *only* on the following knowledge sources. Do not use external knowledge unless the user explicitly asks for it.";

            if (faqs.length > 0) {
                systemInstruction +=
                    "\n\n--- IMPORTANT: Prioritize these FAQs. If the user's question is similar to one of these, you MUST provide the given answer. ---";
                faqs.forEach((source) => {
                    if (source.content) {
                        systemInstruction += `\n- FAQ: Question: "${source.content.question}" Answer: "${source.content.answer}"`;
                    }
                });
                systemInstruction += "\n--- End of FAQs ---";
            }

            if (otherSources.length > 0) {
                systemInstruction +=
                    "\n\nYou can also reference these other documents if the FAQs are not relevant:";
                otherSources.forEach((source) => {
                    systemInstruction += `\n- Reference ${source.type}: ${source.name}`;
                });
            }
        }

        const contents: Content[] = [
            ...history,
            { role: "user", parts: [{ text: message }] },
        ];

        const client = getAI();
        const response = await client.models.generateContent({
            model: MODEL,
            contents,
            config: { systemInstruction },
        });

        return response.text || "I'm sorry, I couldn't generate a response. Please try rephrasing.";
    } catch (error: any) {
        console.error("Error generating chat response:", error);
        return `AI not available: ${error?.message || "Please check your API key."}`;
    }
};
