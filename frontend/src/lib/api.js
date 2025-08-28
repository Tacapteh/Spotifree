import axios from "axios";
const baseURL=(process.env.NEXT_PUBLIC_API_URL||process.env.REACT_APP_BACKEND_URL||((typeof window!=="undefined"&&window.location.origin)||"http://localhost:10000")).replace(/\/+$/,"");
export const api=axios.create({baseURL,timeout:15000});
