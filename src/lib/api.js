import { Cookies } from "quasar";
import ky from "ky";

const token = Cookies.get("token");

const api = ky.create({
  prefixUrl: process.env.API_URL,
  headers: { auth: token },
});

export default api;
