import axios from "axios";

const baseURL = (
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  ""
).replace(/\/+$/, "");

export const api = axios.create({ baseURL, timeout: 30000 });
