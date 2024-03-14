import ToolsSidebar from "../../../src/components/ToolsSidebar.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Quasar } from "quasar";
import { nextTick } from "vue";

describe("ToolsSidebar.vue", () => {
  const wrapper = mount(ToolsSidebar, {
    props: {
      selectedTool: {
        name: "Pointer",
        label: "Select",
        icon: "svguse:icons.svg#cursor|0 0 320 512",
        cat: ["Basic"],
        type: "default",
      },
    },
    global: {
      plugins: [Quasar],
    },
  });

  it("renders the component", () => {
    expect(wrapper.exists()).toBe(true);
  });

  it("has a q-expansion-item", () => {
    expect(wrapper.find(".q-expansion-item").exists()).toBe(true);
  });

  it("has a q-list", () => {
    expect(wrapper.find(".q-list").exists()).toBe(true);
  });

  it("has a q-item", () => {
    expect(wrapper.find(".q-item").exists()).toBe(true);
  });

  it("emits selectTool event", async () => {
    wrapper.vm.$emit("selectTool");
    await nextTick();
    expect(wrapper.emitted().selectTool).toBeTruthy();
  });

  it("emits saveLibImage event", async () => {
    wrapper.vm.$emit("saveLibImage");
    await nextTick();
    expect(wrapper.emitted().saveLibImage).toBeTruthy();
  });

  it("emits deleteLibItem event", async () => {
    wrapper.vm.$emit("deleteLibItem");
    await nextTick();
    expect(wrapper.emitted().deleteLibItem).toBeTruthy();
  });
});
