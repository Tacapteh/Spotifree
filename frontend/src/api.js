export const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "https://TON-BACKEND.onrender.com";

const API_ROOT = API_BASE.replace(/\/+$/, "");

export async function createJob(payload) {
  const response = await fetch(`${API_ROOT}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(new Error("Échec de la création du job"), { response, error });
  }

  return response.json();
}

export async function getJob(jobId) {
  const response = await fetch(`${API_ROOT}/api/jobs/${jobId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(new Error("Échec de la récupération du job"), { response, error });
  }
  return response.json();
}
