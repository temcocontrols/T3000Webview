import { Cookies } from "quasar";
import ky from "ky";

const api = ky.create({
  prefixUrl: process.env.API_URL,
  headers: { auth: Cookies.get("token") },
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("auth", Cookies.get("token"));
      },
    ],
  },
});

export default api;
