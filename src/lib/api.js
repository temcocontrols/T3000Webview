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
    afterResponse: [
      (request) => {
        if (request.status === 401) {
          Cookies.remove("token");
        }
      },
    ],
  },
});

export const localApi = ky.create({
  prefixUrl: process.env.LOCAL_API_URL,
  headers: { secret_key: process.env.LOCAL_API_SECRET_KEY },
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("secret_key", process.env.LOCAL_API_SECRET_KEY);
      },
    ],
    afterResponse: [
      (request) => {
        if (request.status === 401) {
          Cookies.remove("secret_key");
        }
      },
    ],
  },
});

export default api;
