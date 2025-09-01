import axios from "axios";

const baseURL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://spotifree-a0fz.onrender.com"
).replace(/\/+$/, "");

export const api = axios.create({ baseURL, timeout: 30000 });
