
import DataStream from 'datastream-js'

class T3DataStream extends DataStream {

  save = function (downloadName) {

    const blob = new Blob(this.buffer);
    const url = window.webkitURL || window.URL;

    if (!url || !url.createObjectURL) {
      throw new Error("DataStream.save: Can't create object URL.");
    }

    const objectUrl = url.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = downloadName;
    link.click();
    url.revokeObjectURL(objectUrl);
  }

  // Overriding the writeType method
  writeType(type, value, options) {
    if (typeof type === 'function') {
      return type(this, value);
    }

    if (typeof type === 'object' && !Array.isArray(type)) {
      return type.set(this, value, options);
    }

    let length = null;
    let encoding: any = 'ASCII';
    const initialPosition = this.position;

    if (typeof type === 'string') {
      if (/:/.test(type)) {
        [type, length] = type.split(':');
        length = parseInt(length, 10);
      }
      if (/,/.test(type)) {
        [type, encoding] = type.split(',');
        encoding = parseInt(encoding, 10);
      }
    }

    switch (type) {
      case 'uint8':
        this.writeUint8(value);
        break;
      case 'int8':
        this.writeInt8(value);
        break;
      case 'uint16':
        this.writeUint16(value, this.endianness);
        break;
      case 'int16':
        this.writeInt16(value, this.endianness);
        break;
      case 'uint32':
        this.writeUint32(value, this.endianness);
        break;
      case 'int32':
        this.writeInt32(value, this.endianness);
        break;
      case 'float32':
        this.writeFloat32(value, this.endianness);
        break;
      case 'float64':
        this.writeFloat64(value, this.endianness);
        break;
      case 'uint16be':
        this.writeUint16(value, DataStream.BIG_ENDIAN);
        break;
      case 'int16be':
        this.writeInt16(value, DataStream.BIG_ENDIAN);
        break;
      case 'uint32be':
        this.writeUint32(value, DataStream.BIG_ENDIAN);
        break;
      case 'int32be':
        this.writeInt32(value, DataStream.BIG_ENDIAN);
        break;
      case 'float32be':
        this.writeFloat32(value, DataStream.BIG_ENDIAN);
        break;
      case 'float64be':
        this.writeFloat64(value, DataStream.BIG_ENDIAN);
        break;
      case 'uint16le':
        this.writeUint16(value, DataStream.LITTLE_ENDIAN);
        break;
      case 'int16le':
        this.writeInt16(value, DataStream.LITTLE_ENDIAN);
        break;
      case 'uint32le':
        this.writeUint32(value, DataStream.LITTLE_ENDIAN);
        break;
      case 'int32le':
        this.writeInt32(value, DataStream.LITTLE_ENDIAN);
        break;
      case 'float32le':
        this.writeFloat32(value, DataStream.LITTLE_ENDIAN);
        break;
      case 'float64le':
        this.writeFloat64(value, DataStream.LITTLE_ENDIAN);
        break;
      case 'cstring':
        this.writeCString(value, length);
        length = null;
        break;
      case 'string':
        this.writeString(value, encoding, length);
        length = null;
        break;
      case 'u16string':
        this.writeUCS2String(value, this.endianness, length);
        length = null;
        break;
      case 'u16stringle':
        this.writeUCS2String(value, DataStream.LITTLE_ENDIAN, length);
        length = null;
        break;
      case 'u16stringbe':
        this.writeUCS2String(value, DataStream.BIG_ENDIAN, length);
        length = null;
        break;
      default:
        if (type.length === 3) {
          const [_, subType] = type;
          for (let i = 0; i < value.length; i++) {
            this.writeType(subType, value[i], null);
          }
          break;
        }
        this.writeStruct(type, value);
    }

    if (length !== null) {
      this.position = initialPosition;
      this._realloc(length);
      this.position = initialPosition + length;
    }
  }

}

export default T3DataStream
