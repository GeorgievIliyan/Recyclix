// lib/fetchClassify.ts

interface Props {
  target: string;
  binId: string;
  userDailyTaskId?: string; // Add this for gemini-confirm
}

export interface GeminiRequest extends Props {
  image: string;
}

export interface GeminiResponse {
  result?: string; // For gemini-confirm (YES/NO)
  material?: string; // For gemini-classify
  error?: string;
}

export default async function fetchClassify(
  { binId, image, target, userDailyTaskId }: GeminiRequest,
  endpoint: string = "/api/gemini-classify"
): Promise<GeminiResponse> {
  const token = process.env.SECURE_API_KEY;

  if (!token) {
    console.error("Client Error: SECURE_API_KEY is not defined");
  }

  // Determine which endpoint to use based on target
  const finalEndpoint = target ? "/api/gemini-confirm" : "/api/gemini-classify";
  
  const requestBody = target 
    ? { image, userDailyTaskId: binId } // For confirm endpoint
    : { binId, image, target }; // For classify endpoint

  const res = await fetch(finalEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": token || "",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  return res.json();
}