// Support both Vite (`import.meta.env`) and CRA (`process.env.REACT_APP_*`) builds
const getEnvValue = () => {
  // CRA exposes custom env variables through process.env
  if (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }

  // Vite exposes variables on import.meta.env, but accessing import.meta directly
  // can throw in environments where it isn't defined (like CRA), so guard it.
  try {
    return import.meta?.env?.VITE_API_BASE;
  } catch (_error) {
    return undefined;
  }
};

const API_BASE = getEnvValue() || "https://TON-BACKEND-RENDER.onrender.com";

export { API_BASE };
