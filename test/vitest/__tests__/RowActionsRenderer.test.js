import RowActionsRenderer from "../../../src/components/grid/RowActionsRenderer.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

describe("RowActionsRenderer.vue", () => {
  vi.mock("quasar", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual, // Preserve other Quasar exports
      useQuasar: vi.fn().mockReturnValue({
        dialog: vi.fn(() => ({
          onOk: vi.fn(),
        })),
      }),
    };
  });

  const propsData = {
    params: {
      type: Object,
      data: { id: 1, status: "UPDATED" },
    },
  };

  it("renders correctly", () => {
    const wrapper = mount(RowActionsRenderer, {
      props: propsData,
    });

    expect(wrapper.vm).toBeTruthy();
  });
  it("renders props when passed", () => {
    const wrapper = mount(RowActionsRenderer, {
      props: propsData,
    });
    expect(wrapper.props().params.data.id).toBe(1);
  });
});
