

class SVGImporter {

  // This method imports an SVG file, creates a URL for it, and processes the file using the given callback.
  ImportSVG(file: any, callback: (url: string, blob: Blob, uint8Array: Uint8Array) => void) {
    // Log the input file for debugging purposes.
    console.log("=S.SVGImporter - Input file:", file);
    const fileType = file.type;

    // Check if the file type is supported (i.e. SVG).
    if (fileType === 'image/svg+xml') {
      // Create a new FileReader instance to read the file.
      const reader = new FileReader();

      // Define the onload event handler for the FileReader.
      reader.onload = function () {
        // Convert the reader's result to an ArrayBuffer.
        const arrayBuffer = reader.result as ArrayBuffer;
        // Create a Blob from the ArrayBuffer, using the file type.
        const blob = new Blob([arrayBuffer], { type: fileType });
        // Create a Uint8Array from the ArrayBuffer.
        const uint8Array = new Uint8Array(arrayBuffer);
        // Obtain the URL creator from the window (supporting both standard and webkit versions).
        const urlCreator = window.URL || window.webkitURL;
        let url = '';

        // If the URL creator is available and can create object URLs.
        if (urlCreator && urlCreator.createObjectURL) {
          // Create an object URL for the Blob.
          url = urlCreator.createObjectURL(blob);
          console.log("=S.SVGImporter - Generated URL:", url);
          console.log("=S.SVGImporter - Generated Blob:", blob);
          console.log("=S.SVGImporter - Generated Uint8Array:", uint8Array);

          // If a callback is provided, call it with the generated URL, Blob, and Uint8Array.
          if (callback) {
            callback(url, blob, uint8Array);
          }
        }

        // This is a Microsoft-specific file close operation, if available.
        if (file.msClose !== undefined) {
          console.log("=S.SVGImporter - Calling msClose");
          file.msClose();
        }
      };

      // Read the file as an ArrayBuffer.
      reader.readAsArrayBuffer(file);
    } else {
      // Log a message if the file type is unsupported.
      console.log("=S.SVGImporter - Unsupported file type:", fileType);
    }
  }
}

export default SVGImporter;
