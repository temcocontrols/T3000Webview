import UserTopBar from "../../../src/components/UserTopBar.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { Quasar } from "quasar";

describe("UserTopBar.vue", () => {
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
  const wrapper = mount(UserTopBar, {
    propsData: {
      globalNav: {
        back: "/previous",
        home: "/home",
        title: "Test Title",
      },
    },
    slots: {
      "action-btns": '<div class="test-action-btns"></div>',
    },
    global: {
      plugins: [Quasar],
    },
  });

  it("renders the component", () => {
    expect(wrapper.exists()).toBe(true);
  });

  it("renders back button if globalNav.back is present", () => {
    expect(wrapper.find(".q-btn").exists()).toBe(true);
  });

  it("renders the action buttons slot", () => {
    expect(wrapper.find(".test-action-btns").exists()).toBe(true);
  });
});
