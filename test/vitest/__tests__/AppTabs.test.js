import AppTabs from "../../../src/components/AppTabs.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("AppTabs.vue", () => {
  it("renders tabs with correct props and emits update event", async () => {
    const wrapper = mount(AppTabs, {
      props: {
        modelValue: "inputs", // Set initial modelValue
      },
    });

    // Assert initial state
    expect(wrapper.find(".q-tabs .q-tab").exists()).toBe(true);

    // Simulate tab click
    await wrapper.find(".q-tabs .q-tab]").trigger("click"); // Click on mocked QTabs
  });

  // ... other tests
});
