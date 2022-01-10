import {Status} from "/src/Server/Status.enum.js";

export class Packet {
  constructor(structure) {
    this.structure = structure;
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  parseRaw(raw, data = this.structure.client) {
    this.raw = raw;
    this.length = this.raw[0];
    // Read packet name
    this.id = this.raw[1];
    this.name = data[this.id].name;
    this.parseRawBody("", data[this.raw[1]].container, 2);
  }

  parseRawBody(name, types, pos) {
    for(let key in types) {
      if(typeof(types[key].type) == "object") {
        this.parseRawBody(name, types[key].type, pos);
      }else {
        let type = this.structure.types[types[key].type];
        type.name = types[key].type;
        //console.log(type.name);
        if(type.size == "dynamic") {
          let value = "";
          switch (type.name) {
            case "varint":
              // Parse a varint to number value
              value = 0;
              let i = 0;
              while(true) {
                let cacheValue = this.raw[pos + i];
                value = value + ((cacheValue & 127) << (i * 7));
                i = i + 1;
                if(i > 5) {
                  throw new Exception("Length of varint is to high");
                }
                if((cacheValue & 128) != 128) {
                  pos = pos + i;
                  break;
                }
              }
              break;
            case "string":
              let length = this.raw[pos];
              pos = pos + 1;
              let splitRaw = this.raw.slice(pos, (pos + length));
              value = this.decoder.decode(splitRaw);
              pos = pos + length;
              break;
            default:

          }
          this[types[key].name] = value;
        }else {
          let splitRaw = this.raw.slice(pos, (pos + type.size));
          pos = pos + type.size;
          let dataView = new DataView(splitRaw.buffer);

          // Get value
          let value = 0;
          switch (type.name) {
            case "u8":
              value = dataView.getUint8();
              break;
            case "u16":
              value = dataView.getUint16();
              break;
            case "i8":
              value = dataView.getInt8();
              break;
            case "i32":
              value = dataView.getInt32();
              break;
            case "i64":
              value = dataView.getBigInt64();
              break;
            case "f32":
              value = dataView.getFloat32();
              break;
            case "f64":
              value = dataView.getFloat64();
              break;
            default:
          }
          this[types[key].name] = value;
        }
      }
    }
  }

  getRaw(data = this.structure.server) {
    this.cacheRaw = [];
    this.length = 0;
    this.cacheRaw[0] = 0;
    this.cacheRaw[1] = data.packetFromName[this.name];
    this.getRawBody("", data[this.cacheRaw[1]].container, 2);
    this.length = this.cacheRaw.length - 1;
    this.cacheRaw[0] = this.length;
    this.raw = new Uint8Array(this.cacheRaw);
  }

  getRawBody(name, types, pos) {
    for(let key in types) {
      if(typeof(types[key].type) == "object") {
        this.getRawBody(name, types[key].type, pos);
      }else {
        let type = this.structure.types[types[key].type];
        type.name = types[key].type;
        let value = this[types[key].name];
        if(type.size == "dynamic") {
          switch (type.name) {
            case "varint":
              pos = this.addVarint(value, pos);
              break;
            case "string":
              value = Array.from(this.encoder.encode(value)); // Check alternative
              let length = value.length;
              this.cacheRaw[pos] = length;
              this.cacheRaw = this.cacheRaw.concat(value);
              pos = pos + length + 1;
              break;
            case "buffer":
              value = Array.from(this.encoder.encode(value));
              // parse length as varint!
              let bufferLength = value.length;
              pos = this.addVarint(bufferLength, pos);
              this.cacheRaw = this.cacheRaw.concat(value);
              pos = pos + bufferLength + 1;
              break;
            default:

          }
          this[types[key].name] = value;
        }else {
          let cacheArray;

          switch (type.name) {
            case "u8":
              cacheArray = Uint8Array.of(value);
              break;
            case "u16":
              cacheArray = new Uint8Array(Uint16Array.of(value).buffer);
              break;
            case "i8":
              cacheArray = new Uint8Array(Int8Array.of(value).buffer);
              break;
            case "i32":
              cacheArray = new Uint8Array(Int32Array.of(value).buffer);
              break;
            case "i64":
              cacheArray = new Uint8Array(BigInt64Array.of(value).buffer);
              break;
            case "f32":
              cacheArray = new Uint8Array(Float32Array.of(value).buffer);
              break;
            case "f64":
              cacheArray = new Uint8Array(Float64Array.of(value).buffer);
              break;
            default:
          }
          this.cacheRaw = this.cacheRaw.concat(Array.from(cacheArray));
        }
      }
    }
  }

  addVarint(value, pos) {
    // Parse a number to varint value
    let i = 0;
    while(true) {
      if((value & ~127) == 0) {
        this.cacheRaw[pos + i] = value;
        pos = pos + i;
        break;
      }
      this.cacheRaw[pos + i] = ((value & 127) | 128);
      i = i + 1;
    }
    return pos;
  }

}
