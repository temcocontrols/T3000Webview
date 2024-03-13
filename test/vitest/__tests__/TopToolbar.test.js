import TopToolbar from "../../../src/components/TopToolbar.vue";
import { installQuasarPlugin } from "@quasar/quasar-app-extension-testing-unit-vitest";
import { mount, DOMWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Quasar } from "quasar";
installQuasarPlugin();

describe("TopToolbar.vue", () => {
  const wrapper = mount(TopToolbar, {
    global: {
      plugins: [Quasar],
    },
  });
  it("renders a toolbar", () => {
    expect(wrapper.find(".toolbar").exists()).toBe(true);
  });

  it("renders a file menu", () => {
    expect(wrapper.find(".q-btn-dropdown").exists()).toBe(true);
  });

  it('emits menuActionEmit event with "newProject" when new project button is clicked', async () => {
    const FileMenuBtn = wrapper.find(".file-menu");
    await FileMenuBtn.trigger("click");
    // Wait for 1 second (or however long you need)
    await new Promise((resolve) => setTimeout(resolve, 100));
    const domWrapper = new DOMWrapper(document.body);
    const newProjectBtn = domWrapper.find(".new-project-menu-item");
    await newProjectBtn.trigger("click");
    console.log(wrapper.emitted(), "wrapper.emitted()");
    expect(wrapper.emitted().menuAction[0]).toEqual(["newProject", null]);
  });
});
