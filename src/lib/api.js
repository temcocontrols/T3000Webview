import { Cookies } from "quasar";
import ky from "ky";

// Create a live API client with authentication headers
export const liveApi = ky.create({
  prefixUrl: process.env.API_URL, // Set the API URL from environment variables
  headers: { auth: Cookies.get("token") }, // Set the authentication header with the token from cookies
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("auth", Cookies.get("token")); // Set the authentication header again before each request
      },
    ],
    afterResponse: [
      (request) => {
        if (request.status === 401) {
          Cookies.remove("token"); // Remove the token from cookies if the response status is 401 (Unauthorized)
        }
      },
    ],
  },
});

// Create a local API client with a secret key
export const localApi = ky.create({
  prefixUrl: process.env.LOCAL_API_URL, // Set the local API URL from environment variables
  headers: { Authorization: process.env.LOCAL_API_SECRET_KEY || "secret" }, // Set the authorization header with the secret key from environment variables or a default value
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set(
          "Authorization",
          process.env.LOCAL_API_SECRET_KEY || "secret" // Set the authorization header again before each request with the secret key from environment variables or a default value
        );
      },
    ],
    afterResponse: [
      (request) => {
        if (request.status === 401) {
          Cookies.remove("Authorization"); // Remove the authorization header from cookies if the response status is 401 (Unauthorized)
        }
      },
    ],
  },
});
