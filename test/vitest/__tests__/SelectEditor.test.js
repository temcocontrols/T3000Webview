import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import SelectEditor from "../../../src/components/grid/SelectEditor.vue";
import { Quasar } from "quasar";

describe("SelectEditor.vue", () => {
  const props = {
    params: {
      value: "test value",
      options: ["option1", "option2"],
      clearable: true,
    },
  };

  const wrapper = mount(SelectEditor, {
    props,
    global: {
      plugins: [Quasar],
    },
  });

  it("renders the component", () => {
    expect(wrapper.exists()).toBe(true);
  });

  it("initializes with correct default data", () => {
    expect(wrapper.vm.value).toEqual(props.params.value);
    expect(wrapper.vm.selectOptions).toEqual(props.params.options);
    expect(wrapper.vm.clearable).toEqual(props.params.clearable);
  });
});
