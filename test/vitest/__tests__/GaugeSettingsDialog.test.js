import { mount, DOMWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Quasar } from "quasar";
import GaugeSettingsDialog from "../../../src/components/GaugeSettingsDialog.vue";

describe("GaugeSettingsDialog.vue", () => {
  it("renders dialog with initial data", async () => {
    const initialData = {
      type: "Gauge",
      settings: {
        min: 0,
        max: 100,
        colors: [],
      },
    };

    const wrapper = mount(GaugeSettingsDialog, {
      props: {
        active: true,
        data: initialData,
      },
      global: {
        plugins: [Quasar],
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const domWrapper = new DOMWrapper(document.body);

    // console.log("wrapper", wrapper.find("div"));

    expect(domWrapper.find(".q-dialog").exists()).toBe(true);

    // Simulate close button click
    await domWrapper
      .find(".q-card__actions .q-btn:first-child")
      .trigger("click");
  });

  /* it("renders dialog with initial data and emits saved event on save", async () => {
    const initialData = {
      type: "Gauge",
      settings: {
        min: 0,
        max: 100,
        colors: [],
      },
    };

    const wrapper = mount(GaugeSettingsDialog, {
      props: {
        active: true,
        data: initialData,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const domWrapper = new DOMWrapper(document.body);

    // Simulate select change (adjust selector based on implementation)
    await domWrapper.find(".q-select").vm.$emit("input", "Dial");

    // Simulate color addition (adjust selector based on implementation)
    await wrapper.find('q-btn[icon="add"]').trigger("click");

    // Simulate save button click
    await wrapper.find('q-btn[label="Save"]').trigger("click");

    // Assert saved event emission with modified data
    expect(wrapper.emitted("saved")).toEqual([[expect.any()]]); // Expect modified object structure
  }); */
});
