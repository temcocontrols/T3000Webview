import { Cookies } from "quasar";
import ky from "ky";

export const liveApi = ky.create({
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
  headers: { secret_key: process.env.LOCAL_API_SECRET_KEY || "secret" },
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set(
          "Authorization",
          process.env.LOCAL_API_SECRET_KEY || "secret"
        );
      },
    ],
    afterResponse: [
      (request) => {
        if (request.status === 401) {
          Cookies.remove("Authorization");
        }
      },
    ],
  },
});
