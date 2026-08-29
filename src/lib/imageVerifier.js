/**
 * imageVerifier.js
 * Contains utility functions to verify image quality using OpenCV.js
 * and classify/OCR documents using Groq Vision API (qwen/qwen3.8-27b).
 */

// We expect the user to add these to their .env file
const AI_API_URL = import.meta.env.VITE_AI_API_URL;
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY;
// The model identifier provided by your API platform
const AI_MODEL_NAME = import.meta.env.VITE_AI_MODEL_NAME || 'qwen/qwen3.8-27b';

/**
 * Internal helper: Makes a call to the vision API with a given prompt and image.
 * Automatically retries up to MAX_RETRIES times on API/network errors with exponential backoff.
 */
const MAX_RETRIES = 3;
const callVisionAPI = async (dataUrl, prompt, maxTokens = 150) => {
  const payload = {
    model: AI_MODEL_NAME,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ],
    max_tokens: maxTokens,
    temperature: 0.1
  };

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();

    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        // Wait with exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`Vision API attempt ${attempt} failed. Retrying in ${delay}ms...`, err.message);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted — throw the last error
  throw lastError;
};


/**
 * Converts a base64 Data URL to an HTMLImageElement
 */
const dataUrlToImage = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};

/**
 * Checks if an image is blurry using the Variance of Laplacian method in OpenCV.js
 * @param {string} dataUrl - The base64 data URL of the image
 * @param {number} threshold - The blurriness threshold (lower means more blurry allowed, typically 100)
 * @returns {Promise<{isBlurry: boolean, score: number, error: string | null}>}
 */
export const checkImageQuality = async (dataUrl, threshold = 100) => {
  if (!window.cv || typeof window.cv.Mat !== 'function') {
    console.warn("OpenCV.js not loaded yet or not available.");
    // If OpenCV isn't loaded, we'll bypass the check to avoid blocking the user,
    // or we could throw an error. For now, bypass.
    return { isBlurry: false, score: null, error: null };
  }

  try {
    const img = await dataUrlToImage(dataUrl);
    
    // Create an OpenCV Mat from the image
    let src = window.cv.imread(img);
    let gray = new window.cv.Mat();
    let laplacian = new window.cv.Mat();
    
    // Convert to grayscale
    window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY, 0);
    
    // Compute Laplacian
    window.cv.Laplacian(gray, laplacian, window.cv.CV_64F, 1, 1, 0, window.cv.BORDER_DEFAULT);
    
    // Compute mean and standard deviation
    let mean = new window.cv.Mat();
    let stddev = new window.cv.Mat();
    window.cv.meanStdDev(laplacian, mean, stddev);
    
    // Variance is stddev squared
    let variance = Math.pow(stddev.doubleAt(0, 0), 2);
    
    // Cleanup OpenCV memory
    src.delete();
    gray.delete();
    laplacian.delete();
    mean.delete();
    stddev.delete();
    
    return {
      isBlurry: variance < threshold,
      score: variance,
      error: null
    };
  } catch (error) {
    console.error("Error in checkImageQuality:", error);
    return { isBlurry: false, score: null, error: "Quality check failed." };
  }
};

/**
 * Classifies a document using the Groq Vision API to check if it matches the expected type.
 * @param {string} dataUrl - The base64 image data
 * @param {string} expectedType - The expected document type (e.g., 'Passport', 'Visa')
 * @returns {Promise<{isAccepted: boolean, reason: string, error: string | null}>}
 */
export const classifyDocument = async (dataUrl, expectedType) => {
  if (!AI_API_URL || !AI_API_KEY) {
    console.warn("AI API URL or Key not set. Bypassing classification.");
    return { isAccepted: true, reason: "API configuration missing, bypassed.", error: null };
  }

  // --- DEMO MODE FALLBACK ---
  // If the user hasn't put a real API key in .env yet, mock the response so they can still test the UI!
  if (AI_API_KEY === 'your_llama_api_key_here' || AI_API_KEY === 'your_groq_api_key_here') {
    console.log("Running in DEMO MODE (No real API key provided). Automatically accepting document.");
    await new Promise(r => setTimeout(r, 1500)); // Simulate API delay
    
    // Simple logic for demo: if they upload a blurry image, the OpenCV check already caught it.
    // If it reaches here, we just accept it as a demo.
    return { 
      isAccepted: true, 
      reason: "Demo Mode: Document accepted. (Replace your_groq_api_key_here in .env with a real key for actual AI verification!)", 
      error: null 
    };
  }
  // ---------------------------

  try {
    const prompt = `You are a strict border security document screener. 
Look at the uploaded image. Is it a valid ${expectedType}? 
Respond with exactly "YES" or "NO" on the first line, followed by a brief reason on the second line. 
Check for obvious signs of damage, being torn (fta hua), or if it is a completely unrelated image.`;

    const aiResponse = await callVisionAPI(dataUrl, prompt, 100);
    const lines = aiResponse.split('\n').filter(l => l.trim() !== '');
    const decision = lines[0].toUpperCase();
    const reason = lines.length > 1 ? lines.slice(1).join(' ') : "No reason provided.";
    const isAccepted = decision.includes("YES");

    return { isAccepted, reason, error: null };
  } catch (error) {
    // All retries failed — silently accept to avoid blocking the user with API errors
    console.error("classifyDocument: all retries failed, accepting document silently.", error);
    return { isAccepted: true, reason: "Verification service unavailable, proceeding.", error: null };
  }
};

/**
 * Extracts structured data from a document image using OCR via the Groq Vision API.
 * @param {string} dataUrl - The base64 image data
 * @param {'Passport' | 'Visa' | 'Aadhaar' | 'DrivingLicense'} docType - The type of document to extract
 * @returns {Promise<Object>} - An object containing extracted field values (all may be empty strings if not found)
 */
export const extractDocumentData = async (dataUrl, docType) => {
  if (!AI_API_URL || !AI_API_KEY) return {};
  if (AI_API_KEY === 'your_llama_api_key_here' || AI_API_KEY === 'your_groq_api_key_here') return {};

  const prompts = {
    Passport: `Extract all visible text from this Indian Passport image and return a single valid JSON object with these exact keys:
{ "name": "", "passportNumber": "", "nationality": "", "dob": "", "gender": "", "doi": "", "doe": "", "placeOfIssue": "" }
- dob, doi, doe must be in YYYY-MM-DD format. If only year is visible, use YYYY-01-01.
- gender must be "Male", "Female", or "Other".
- Return ONLY the JSON object, no extra text, no markdown, no explanation.`,

    Visa: `Extract all visible text from this Visa document image and return a single valid JSON object with these exact keys:
{ "name": "", "visaNumber": "", "nationality": "", "dob": "", "gender": "", "doi": "", "doe": "" }
- dob, doi, doe must be in YYYY-MM-DD format.
- gender must be "Male", "Female", or "Other".
- Return ONLY the JSON object, no extra text, no markdown, no explanation.`,

    Aadhaar: `Extract all visible text from this Indian Aadhaar Card image and return a single valid JSON object with these exact keys:
{ "name": "", "aadhaarNumber": "", "dob": "", "gender": "", "guardian": "", "address": "", "pincode": "" }
- dob must be in YYYY-MM-DD format. If only year is visible, use YYYY-01-01.
- gender must be "Male", "Female", or "Transgender / Other".
- aadhaarNumber should be the 12-digit number, formatted with spaces like "XXXX XXXX XXXX".
- address should be the full residential address printed on the card.
- Return ONLY the JSON object, no extra text, no markdown, no explanation.`,

    DrivingLicense: `Extract all visible text from this Indian Driving License image and return a single valid JSON object with these exact keys:
{ "name": "", "dlNumber": "", "dob": "", "bloodGroup": "", "vehicleClass": "", "doi": "", "doe": "", "rto": "" }
- dob, doi, doe must be in YYYY-MM-DD format.
- bloodGroup should be like "O+", "A+", "B-" etc.
- vehicleClass should be like "LMV, MCWG" etc.
- Return ONLY the JSON object, no extra text, no markdown, no explanation.`,
  };

  try {
    const prompt = prompts[docType];
    if (!prompt) return {};

    const rawResponse = await callVisionAPI(dataUrl, prompt, 400);

    // Find and parse the JSON object from the response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("Could not find JSON in OCR response:", rawResponse);
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (error) {
    console.error("Error in extractDocumentData:", error);
    return {}; // Return empty object on failure, don't block the user
  }
};
