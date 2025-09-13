import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key (see "Set up your API key" above)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // Load from environment variable

console.log("Gemini API_KEY loaded:", API_KEY); // Add this line for debugging

const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateContentWithGemini(prompt) {
  console.log("Calling Gemini API with prompt:", prompt);

  if (!API_KEY) {
    console.error("Gemini API key is not set. Please add VITE_GEMINI_API_KEY to your .env.local file.");
    return "Gemini API key is not configured. Please contact the administrator.";
  }

  try {
    // For text-only input, use the gemini-2.0-flash model as specified by the user
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Add an instruction to the prompt for concise answers
    const fullPrompt = `Please provide a brief and concise answer to the following: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt); // Use fullPrompt
    const response = await result.response;
    const text = response.text();
    console.log("Gemini API response:", text);
    return text;
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    return "Failed to generate content with AI. Please check the API key and try again.";
  }
}
// gemini-2.0-flash