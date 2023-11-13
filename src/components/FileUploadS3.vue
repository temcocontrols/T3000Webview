<script>
import { onUnmounted } from "vue";
import { Dashboard } from "@uppy/vue";
// import { useQuasar } from "quasar";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import ImageEditor from "@uppy/image-editor";

export default {
  components: {
    Dashboard,
  },
  props: {
    types: {
      type: Array,
      default: null,
    },
    path: {
      type: String,
      default: "files",
    },
    maxNumberOfFiles: {
      type: Number,
      default: 1,
    },
    height: {
      type: Number,
      default: 300,
    },
  },
  emits: ["uploaded", "fileAdded", "fileRemoved"],
  setup(props, ctx) {
    function* serializeSubPart(key, value) {
      if (typeof value !== "object") {
        yield [key, value];
        return;
      }
      if (Array.isArray(value)) {
        for (const val of value) {
          yield* serializeSubPart(`${key}[]`, val);
        }
        return;
      }
      for (const [subkey, val] of Object.entries(value)) {
        yield* serializeSubPart(key ? `${key}[${subkey}]` : subkey, val);
      }
    }
    function serialize(data) {
      return new URLSearchParams(serializeSubPart(null, data));
    }

    const MiB = 0x10_00_00;

    const uppy = new Uppy({
      autoProceed: true,
      restrictions: {
        allowedFileTypes: props.types,
        maxNumberOfFiles: props.maxNumberOfFiles,
      },
    }).use(AwsS3, {
      id: "myAWSPlugin",

      shouldUseMultipart: (file) => file.size > 100 * MiB,
      getTemporarySecurityCredentials: true,

      async getTemporarySecurityCredentials({ signal }) {
        const response = await fetch(process.env.API_URL + "/uppy/sts", {
          signal,
        });
        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });
        return response.json();
      },

      async getUploadParameters(file, options) {
        if (typeof crypto?.subtle === "object") {
          return uppy.getPlugin("myAWSPlugin").createSignedURL(file, options);
        }

        const response = await fetch(process.env.API_URL + "/uppy/sign-s3", {
          method: "POST",
          headers: {
            accept: "application/json",
          },
          body: serialize({
            filename: file.name,
            contentType: file.type,
          }),
          signal: options.signal,
        });

        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });

        const data = await response.json();

        return {
          method: data.method,
          url: data.url,
          fields: {},
          headers: {
            "Content-Type": file.type,
          },
        };
      },

      async createMultipartUpload(file, signal) {
        signal?.throwIfAborted();

        const metadata = {};

        Object.keys(file.meta || {}).forEach((key) => {
          if (file.meta[key] != null) {
            metadata[key] = file.meta[key].toString();
          }
        });

        const response = await fetch(
          process.env.API_URL + "/uppy/s3/multipart",
          {
            method: "POST",
            // Send and receive JSON.
            headers: {
              accept: "application/json",
            },
            body: serialize({
              filename: file.name,
              type: file.type,
              metadata,
            }),
            signal,
          }
        );

        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });

        const data = await response.json();

        return data;
      },

      async abortMultipartUpload(file, { key, uploadId }, signal) {
        const filename = encodeURIComponent(key);
        const uploadIdEnc = encodeURIComponent(uploadId);
        const response = await fetch(
          process.env.API_URL +
            "/uppy" +
            `/s3/multipart/${uploadIdEnc}?key=${filename}`,
          {
            method: "DELETE",
            signal,
          }
        );

        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });
      },

      async signPart(file, options) {
        if (typeof crypto?.subtle === "object") {
          return uppy.getPlugin("myAWSPlugin").createSignedURL(file, options);
        }

        const { uploadId, key, partNumber, signal } = options;

        signal?.throwIfAborted();

        if (uploadId == null || key == null || partNumber == null) {
          throw new Error(
            "Cannot sign without a key, an uploadId, and a partNumber"
          );
        }

        const filename = encodeURIComponent(key);
        const response = await fetch(
          process.env.API_URL +
            "/uppy" +
            `/s3/multipart/${uploadId}/${partNumber}?key=${filename}`,
          { signal }
        );

        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });

        const data = await response.json();

        return data;
      },

      async listParts(file, { key, uploadId }, signal) {
        signal?.throwIfAborted();

        const filename = encodeURIComponent(key);
        const response = await fetch(
          process.env.API_URL +
            "/uppy/" +
            `/s3/multipart/${uploadId}?key=${filename}`,
          { signal }
        );

        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });

        const data = await response.json();

        return data;
      },

      async completeMultipartUpload(file, { key, uploadId, parts }, signal) {
        signal?.throwIfAborted();

        const filename = encodeURIComponent(key);
        const uploadIdEnc = encodeURIComponent(uploadId);
        const response = await fetch(
          process.env.API_URL +
            "/uppy/" +
            `s3/multipart/${uploadIdEnc}/complete?key=${filename}`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
            },
            body: serialize({ parts }),
            signal,
          }
        );

        if (!response.ok)
          throw new Error("Unsuccessful request", { cause: response });

        const data = await response.json();

        return data;
      },
    });
    uppy.use(ImageEditor, {
      quality: 1,
    });

    uppy.on("complete", (result) => {
      if (result.successful?.length > 0) {
        ctx.emit("uploaded", result.successful[0]?.response);
      }
    });

    uppy.on("file-added", (file) => {
      ctx.emit("fileAdded", file);
    });
    uppy.on("file-removed", (file, reason) => {
      ctx.emit("fileRemoved", file);
    });
    onUnmounted(() => {
      uppy.close();
    });
    function upload() {
      uppy.upload();
    }

    function cancel() {
      uppy.cancelAll();
    }

    return {
      uppy,
      upload,
      cancel,
    };
  },
};
</script>

<template>
  <dashboard
    ref="dash"
    :uppy="uppy"
    :props="{
      proudlyDisplayPoweredByUppy: false,
      hideUploadButton: true,
      height,
      metaFields: [
        { id: 'name', name: 'Name', placeholder: 'file name' },
        {
          id: 'caption',
          name: 'Caption',
          placeholder: 'describe what the image is about',
        },
      ],
    }"
    :plugins="['ImageEditor']"
  />
</template>

<style scoped>
.app-card {
  box-shadow: 0 4px 15px 0 rgb(0 74 96 / 15%);
}
</style>
