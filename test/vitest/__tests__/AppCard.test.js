import AppCard from "../../../src/components/AppCard.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("AppCard", () => {
  it("renders correctly", () => {
    const wrapper = mount(AppCard, {
      props: {
        app: {
          id: "1",
          name: "Test App",
          user: {
            id: "1",
            name: "Test User",
          },
        },
        showActions: true,
      },
    });

    // Add the active class to simulate hover or active state
    wrapper.find("#app-card-action-btn-1").element.classList.add("active");

    // Check if the component is properly rendered
    expect(wrapper.find(".app-card").exists()).toBe(true);

    // Check if the action button is rendered when showActions is true
    expect(wrapper.find("#app-card-action-btn-1").exists()).toBe(true);
  });

  it("handles actions correctly", async () => {
    const wrapper = mount(AppCard, {
      props: {
        app: {
          id: "1",
          name: "Test App",
          user: {
            id: "1",
            name: "Test User",
          },
        },
        showActions: true,
      },
    });
  });
});
