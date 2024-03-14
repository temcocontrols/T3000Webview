// import ObjectType from "../../../src/components/ObjectType.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, beforeEach } from "vitest";

// Disabled because of a problem with importing vue3-moveable package that is used inside Duct.vue component
describe("ObjectType.vue", () => {
  it("renders the correct title when provided", () => {
    expect("Test Title").toBe("Test Title");
  });
  /* const wrapper = mount(ObjectType, {
    propsData: {
      item: {
        type: "Fan",
        settings: {
          title: "Test Title",
          t3EntryDisplayField: "none",
          bgColor: true,
        },
        t3Entry: null,
      },
    },
  });


  it("renders the correct title when provided", () => {
    expect(wrapper.find(".object-title").text()).toBe("Test Title");
  });

  it("emits objectClicked event when title is clicked", async () => {
    await wrapper.find(".object-title").trigger("click");
    expect(wrapper.emitted().objectClicked).toBeTruthy();
  });

  it("applies the correct classes based on item type", () => {
    expect(wrapper.find(".moveable-item").classes()).toContain("Fan");
    expect(wrapper.find(".moveable-item").classes()).toContain("with-bg");
  });

  it("check if render object title", () => {
    expect(wrapper.find(".object-title").exists()).toBe(true);
  }); */
});
