import FileUpload from "../../../src/components/FileUpload.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("FileUpload.vue", () => {
  it("renders correctly", () => {
    const wrapper = mount(FileUpload, {
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
    const wrapper = mount(FileUpload);
    await wrapper.vm.uppy.emit("file-added", { id: "test-file" });
    expect(wrapper.emitted()).toHaveProperty("fileAdded");
  });

  it("emits fileRemoved event when a file is removed", async () => {
    const wrapper = mount(FileUpload);
    await wrapper.vm.uppy.emit("file-removed", { id: "test-file" });
    expect(wrapper.emitted()).toHaveProperty("fileRemoved");
  });

  it("emits uploaded event when upload is complete", async () => {
    const wrapper = mount(FileUpload);
    await wrapper.vm.uppy.emit("complete", {
      successful: [{ response: "test-response" }],
    });
    expect(wrapper.emitted()).toHaveProperty("uploaded");
  });
});
