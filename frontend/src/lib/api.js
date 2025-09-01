import axios from "axios";
const envURL = (process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || "").trim();
const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8000";
const baseURL = (envURL || origin).replace(/\/+$/, "");
export const api = axios.create({ baseURL, timeout: 30000 });
