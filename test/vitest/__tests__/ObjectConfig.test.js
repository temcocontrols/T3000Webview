import ObjectConfig from "../../../src/components/ObjectConfig.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, beforeEach } from "vitest";
import { cloneDeep } from "lodash";

describe("ObjectConfig.vue", () => {
  let wrapper;
  let objectMock;

  beforeEach(() => {
    objectMock = {
      title: null,
      active: false,
      type: "IconBasic",
      translate: [404, 152, 0, 0],
      width: 120,
      height: 120,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: {
        active: true,
        offColor: "#940303",
        onColor: "#659dc5",
        icon: "warning",
        t3EntryDisplayField: "value",
        titleColor: "inherit",
        bgColor: "inherit",
        textColor: "inherit",
        fontSize: 16,
      },
      zindex: 1,
      t3Entry: null,
      id: 7,
    };
    wrapper = mount(ObjectConfig, {
      props: {
        object: cloneDeep(objectMock),
      },
    });
  });

  it("should be a Vue instance", () => {
    expect(wrapper.vm).toBeTruthy();
  });

  it("should receive the correct props", () => {
    expect(wrapper.props().object).toStrictEqual(objectMock);
  });

  it("should emit an event when linkT3Entry is clicked", async () => {
    await wrapper.find("button.link-t3-entry").trigger("click");
    expect(wrapper.emitted()).toHaveProperty("linkT3Entry");
  });
});
