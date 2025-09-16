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

// Encode ArrayBuffer to base64 in chunks
function base64EncodeArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function toArrayBufferFromAny(input) {
  if (input instanceof ArrayBuffer) return input;
  if (input instanceof Uint8Array) return input.buffer;
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return await input.arrayBuffer();
  }
  throw new Error("Unsupported input. Provide File/Blob/ArrayBuffer/Uint8Array.");
}

export async function askAboutDocument(fileOrBlob, question, { modelName = "gemini-1.5-flash" } = {}) {
  if (!API_KEY) {
    return "Gemini API key is not configured. Please contact the administrator.";
  }
  const arrayBuffer = await toArrayBufferFromAny(fileOrBlob);
  const base64Data = base64EncodeArrayBuffer(arrayBuffer);
  const mimeType = fileOrBlob.type || "application/octet-stream";
  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = `Answer based ONLY on the attached document. Be concise and student-friendly. If information is not present, say you don't have enough information.`;
  const result = await model.generateContent([
    { text: `${prompt}\n\nQuestion: ${question}` },
    { inlineData: { mimeType, data: base64Data } },
  ]);
  const response = await result.response;
  return response.text();
}