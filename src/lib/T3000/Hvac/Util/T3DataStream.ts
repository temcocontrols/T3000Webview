

import DataStream from 'datastream-js'

class T3DataStream extends DataStream {

  /**
   * Saves the data stream buffer as a downloadable file in the browser
   * @param fileName - The name to use for the downloaded file
   * @throws Error if the browser doesn't support URL.createObjectURL
   */
  save(fileName: string): void {
    // Create a Blob from the buffer
    const blob = new Blob([this.buffer]);

    // Get the URL API (with fallback for webkit)
    const urlAPI = window.URL || window.webkitURL;

    // Check if createObjectURL is supported
    if (!urlAPI || !urlAPI.createObjectURL) {
      throw new Error("DataStream.save: Can't create object URL. Browser may not support this feature.");
    }

    // Create a download link and trigger it
    const objectUrl = urlAPI.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.click();

    // Clean up the object URL to free memory
    urlAPI.revokeObjectURL(objectUrl);
  }

  /**
   * Writes a value of the specified data type to the stream
   * @param dataType - The data type to use for writing (can be a function, object with set method,
   *                  or string indicating the primitive type)
   * @param dataValue - The value to write to the stream
   * @param writeOptions - Additional options for specialized write operations
   * @returns The result of the write operation if a custom function is used
   */
  writeType(dataType: any, dataValue: any, writeOptions?: any): any {
    // Handle function type writers
    if (typeof dataType === 'function') {
      return dataType(this, dataValue);
    }

    // Handle object type writers with set method
    if (typeof dataType === 'object' && !dataType.length) {
      return dataType.set(this, dataValue, writeOptions);
    }

    let desiredLength = null;
    let textEncoding: any = 'ASCII';
    const startPosition = this.position;

    // Parse type format "type:length" or "type,encoding"
    if (typeof dataType === 'string') {
      // Extract length specification if present (type:length)
      if (dataType.includes(':')) {
        const parts = dataType.split(':');
        dataType = parts[0];
        desiredLength = parseInt(parts[1], 10);
      }

      // Extract encoding specification if present (type,encoding)
      if (dataType.includes(',')) {
        const parts = dataType.split(',');
        dataType = parts[0];
        textEncoding = parseInt(parts[1], 10);
      }
    }

    // Handle different data types
    switch (dataType) {
      // Unsigned integers
      case 'uint8':
        this.writeUint8(dataValue);
        break;
      case 'uint16':
        this.writeUint16(dataValue, this.endianness);
        break;
      case 'uint32':
        this.writeUint32(dataValue, this.endianness);
        break;

      // Signed integers
      case 'int8':
        this.writeInt8(dataValue);
        break;
      case 'int16':
        this.writeInt16(dataValue, this.endianness);
        break;
      case 'int32':
        this.writeInt32(dataValue, this.endianness);
        break;

      // Floating point numbers
      case 'float32':
        this.writeFloat32(dataValue, this.endianness);
        break;
      case 'float64':
        this.writeFloat64(dataValue, this.endianness);
        break;

      // Big-endian specific types
      case 'uint16be':
        this.writeUint16(dataValue, DataStream.BIG_ENDIAN);
        break;
      case 'int16be':
        this.writeInt16(dataValue, DataStream.BIG_ENDIAN);
        break;
      case 'uint32be':
        this.writeUint32(dataValue, DataStream.BIG_ENDIAN);
        break;
      case 'int32be':
        this.writeInt32(dataValue, DataStream.BIG_ENDIAN);
        break;
      case 'float32be':
        this.writeFloat32(dataValue, DataStream.BIG_ENDIAN);
        break;
      case 'float64be':
        this.writeFloat64(dataValue, DataStream.BIG_ENDIAN);
        break;

      // Little-endian specific types
      case 'uint16le':
        this.writeUint16(dataValue, DataStream.LITTLE_ENDIAN);
        break;
      case 'int16le':
        this.writeInt16(dataValue, DataStream.LITTLE_ENDIAN);
        break;
      case 'uint32le':
        this.writeUint32(dataValue, DataStream.LITTLE_ENDIAN);
        break;
      case 'int32le':
        this.writeInt32(dataValue, DataStream.LITTLE_ENDIAN);
        break;
      case 'float32le':
        this.writeFloat32(dataValue, DataStream.LITTLE_ENDIAN);
        break;
      case 'float64le':
        this.writeFloat64(dataValue, DataStream.LITTLE_ENDIAN);
        break;

      // String types
      case 'cstring':
        this.writeCString(dataValue, desiredLength);
        desiredLength = null;
        break;
      case 'string':
        this.writeString(dataValue, textEncoding, desiredLength);
        desiredLength = null;
        break;

      // Unicode string types
      case 'u16string':
        this.writeUCS2String(dataValue, this.endianness, desiredLength);
        desiredLength = null;
        break;
      case 'u16stringle':
        this.writeUCS2String(dataValue, DataStream.LITTLE_ENDIAN, desiredLength);
        desiredLength = null;
        break;
      case 'u16stringbe':
        this.writeUCS2String(dataValue, DataStream.BIG_ENDIAN, desiredLength);
        desiredLength = null;
        break;

      default:
        // Handle array types
        if (Array.isArray(dataType) && dataType.length === 3) {
          const subType = dataType[1];
          for (let i = 0; i < dataValue.length; i++) {
            this.writeType(subType, dataValue[i], null);
          }
          break;
        }
        // Handle struct types
        this.writeStruct(dataType, dataValue);
    }

    // Handle fixed-length writes by reallocating and adjusting position
    if (desiredLength !== null) {
      this.position = startPosition;
      this._realloc(desiredLength);
      this.position = startPosition + desiredLength;
    }
  }

}

export default T3DataStream
