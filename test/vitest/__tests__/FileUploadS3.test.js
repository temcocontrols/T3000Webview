import FileUploadS3 from "../../../src/components/FileUploadS3.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

describe("FileUploadS3.vue", () => {
  vi.mock("quasar", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual, // Preserve other Quasar exports
      useQuasar: vi.fn().mockReturnValue({
        cookies: {
          get: vi.fn().mockReturnValue("your-mocked-token"), // Mock the cookies.get method
        },
      }),
    };
  });
  it("renders correctly", () => {
    const wrapper = mount(FileUploadS3, {
      props: {
        types: ["image/png", "image/jpeg"],
        path: "test-path",
        maxNumberOfFiles: 2,
        height: 400,
      },
    });

    expect(wrapper.vm).toBeTruthy();
  });

  it("emits fileAdded event when a file is added", async () => {
    const wrapper = mount(FileUploadS3);
    await wrapper.vm.uppy.emit("file-added", { id: "test-file" });
    expect(wrapper.emitted()).toHaveProperty("fileAdded");
  });

  it("emits fileRemoved event when a file is removed", async () => {
    const wrapper = mount(FileUploadS3);
    await wrapper.vm.uppy.emit("file-removed", { id: "test-file" });
    expect(wrapper.emitted()).toHaveProperty("fileRemoved");
  });

  it("emits uploaded event when upload is complete", async () => {
    const wrapper = mount(FileUploadS3);
    await wrapper.vm.uppy.emit("complete", {
      successful: [{ response: "test-response" }],
    });
    expect(wrapper.emitted()).toHaveProperty("uploaded");
  });
});
