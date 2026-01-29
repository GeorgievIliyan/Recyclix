interface Props {
  target: string;
  binId: string;
}

export interface GeminiRequest extends Props {
  image: string;
}

export interface GeminiResponse {
  result: string;
}

const isDev = process.env.NODE_ENV === "development";

export default async function fetchClassify(
  { binId, image, target }: GeminiRequest
): Promise<GeminiResponse> {
  let res: Response;

  if (isDev) {
    res = await fetch("/api/gemini-classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ binId, image, target }),
    });
  } else {
    res = await fetch("/api/gemini-classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": process.env.SECURE_API_KEY!
      },
      body: JSON.stringify({ binId, image, target }),
    });
  }

  if (!res.ok) {
    throw new Error("Failed to fetch Gemini API");
  }

  return res.json();
}
