import LoginPage from "../../../src/pages/LoginPage.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { Quasar } from "quasar";
import { nextTick } from "vue";

describe("LoginPage.vue", () => {
  global.WebSocket = vi.fn().mockImplementation(() => {
    return {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    };
  });
  vi.mock("quasar", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual, // Preserve other Quasar exports
      useQuasar: vi.fn().mockReturnValue({
        cookies: {
          get: vi.fn().mockReturnValue("your-mocked-token"),
          has: vi.fn().mockReturnValue(true),
        },
      }),
    };
  });
  it("renders loading state when not logged in", () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [Quasar],
        mocks: {
          loggedIn: false,
          user: { name: "Test User" },
        },
      },
    });

    expect(wrapper.find(".q-inner-loading").exists()).toBe(true);
    expect(wrapper.find(".q-page > div").exists()).toBe(false);
  });

  it("renders user name when logged in", async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [Quasar],
        mocks: {
          loggedIn: true,
          user: { name: "Test User" },
        },
      },
    });

    await nextTick();

    expect(wrapper.find(".q-inner-loading").exists()).toBe(false);
    expect(wrapper.find(".q-page > div").exists()).toBe(true);
    expect(wrapper.find(".q-page > div").text()).toBe("Logged in as Test User");
  });
});
