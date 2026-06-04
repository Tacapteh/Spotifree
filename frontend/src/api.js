const envApiBase = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE : undefined;
const runtimeBase = typeof window !== "undefined" ? window.location.origin : "";
const DEFAULT_API_BASE = "https://spotifree-a0fz.onrender.com";

export const API_BASE =
  (envApiBase && envApiBase.trim()) ||
  (runtimeBase && runtimeBase.includes("localhost") ? runtimeBase : DEFAULT_API_BASE);

const API_ROOT = API_BASE.replace(/\/+$/, "");
const YTDLP_INFO_URL = `${API_ROOT}/api/ytdlp/info`;

const readErrorBody = async (response) => {
  const text = await response.text().catch(() => "");
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (parseError) {
    return { message: text };
  }
};

const extractApiDetail = (error) =>
  error?.detail?.error?.message ||
  error?.detail?.message ||
  error?.detail ||
  error?.error?.message ||
  error?.message;

const buildApiErrorMessage = (fallback, error) => {
  const detail = extractApiDetail(error);
  return detail ? `${fallback} : ${detail}` : fallback;
};

const logYtDlpInfoRequest = (details = {}) => {
  console.info("[yt-dlp info] Configuration API", {
    VITE_API_BASE: envApiBase,
    API_BASE,
    API_ROOT,
    url: YTDLP_INFO_URL,
    ...details,
  });
};

export async function createJob(payload) {
  const response = await fetch(`${API_ROOT}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await readErrorBody(response);
    throw Object.assign(new Error(buildApiErrorMessage("Échec de la création du job", error)), { response, error });
  }

  return response.json();
}

export async function getJob(jobId) {
  const response = await fetch(`${API_ROOT}/api/jobs/${jobId}`);
  if (!response.ok) {
    const error = await readErrorBody(response);
    throw Object.assign(new Error(buildApiErrorMessage("Échec de la récupération du job", error)), { response, error });
  }
  return response.json();
}


export async function getYtDlpInfo() {
  logYtDlpInfoRequest();
  let response;

  try {
    response = await fetch(YTDLP_INFO_URL);
  } catch (networkError) {
    console.error("[yt-dlp info] Échec réseau ou CORS", {
      API_BASE,
      API_ROOT,
      url: YTDLP_INFO_URL,
      error: networkError,
    });
    throw networkError;
  }

  console.info("[yt-dlp info] Réponse HTTP", {
    url: YTDLP_INFO_URL,
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const error = await readErrorBody(response);
    console.error("[yt-dlp info] Réponse en erreur", {
      url: YTDLP_INFO_URL,
      status: response.status,
      body: error,
    });
    throw Object.assign(new Error(buildApiErrorMessage("Impossible de récupérer les informations yt-dlp", error)), { response, error });
  }

  return response.json();
}
