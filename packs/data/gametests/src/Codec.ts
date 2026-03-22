import { BlockPalette, Schematic, PaletteEntry, BlockStates } from "./Schematic.js";

//#region Codec

const MAGIC = "DW1:";
const CHUNK_SIZE = 90;

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

interface SerializedSchematic {
  v: number;
  s: [number, number, number];
  p: [string, BlockStates][];
  b: number[];
}

export interface PartHeader {
  part: number;
  total: number;
  data: string;
}

export class Codec {
  static encode(schematic: Schematic): string[] {
    const data: SerializedSchematic = {
      v: schematic.version,
      s: [schematic.size.x, schematic.size.y, schematic.size.z],
      p: schematic.palette.toArray().map(e => [e.typeId, e.states]),
      b: Codec.rleEncode(schematic.blocks),
    };
    const json = JSON.stringify(data);
    const b64 = Codec.toBase64(json);

    const totalParts = Math.max(1, Math.ceil(b64.length / CHUNK_SIZE));
    const parts: string[] = [];
    for (let i = 0; i < totalParts; i++) {
      const chunk = b64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      parts.push(`${MAGIC}${i + 1}/${totalParts}:${chunk}`);
    }
    return parts;
  }

  static parseHeader(str: string): PartHeader | null {
    const trimmed = str.trim();
    if (!trimmed.startsWith(MAGIC)) return null;
    const rest = trimmed.slice(MAGIC.length);
    const match = rest.match(/^(\d+)\/(\d+):(.*)$/);
    if (match) {
      return { part: parseInt(match[1]), total: parseInt(match[2]), data: match[3] };
    }
    return { part: 1, total: 1, data: rest };
  }

  static decode(parts: string[]): Schematic {
    const parsed = parts.map(p => {
      const h = Codec.parseHeader(p);
      if (!h) throw new Error("Invalid Dreamweaver schematic string");
      return h;
    });

    parsed.sort((a, b) => a.part - b.part);
    const total = parsed[0].total;
    for (let i = 0; i < total; i++) {
      if (!parsed[i] || parsed[i].part !== i + 1) {
        throw new Error(`Missing part ${i + 1} of ${total}`);
      }
    }

    const b64 = parsed.map(p => p.data.replace(/\s/g, "")).join("");
    if (b64.length === 0) throw new Error("Empty schematic data");

    const json = Codec.fromBase64(b64);

    if (!json.endsWith("}")) {
      throw new Error("Schematic data appears truncated. Ensure all parts were copied in full.");
    }

    let data: SerializedSchematic;
    try {
      data = JSON.parse(json);
    } catch (e) {
      throw new Error("Corrupt schematic data. Ensure all parts were copied correctly.");
    }

    if (data.v !== Schematic.FORMAT_VERSION) {
      throw new Error(`Unsupported format version: ${data.v}`);
    }

    const entries: PaletteEntry[] = data.p.map(([typeId, states]) => ({ typeId, states }));
    const palette = BlockPalette.fromArray(entries);
    const blocks = Codec.rleDecode(data.b);
    const size = { x: data.s[0], y: data.s[1], z: data.s[2] };
    return new Schematic(size, palette, blocks);
  }

  //#region RLE

  private static rleEncode(arr: number[]): number[] {
    if (arr.length === 0) return [];
    const result: number[] = [];
    let current = arr[0];
    let count = 1;

    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === current) {
        count++;
      } else {
        result.push(current, count);
        current = arr[i];
        count = 1;
      }
    }
    result.push(current, count);
    return result;
  }

  private static rleDecode(rle: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < rle.length; i += 2) {
      const value = rle[i];
      const count = rle[i + 1];
      for (let j = 0; j < count; j++) {
        result.push(value);
      }
    }
    return result;
  }

  //#endregion

  //#region Base64

  private static toBase64(str: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    }

    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

      result += B64[(b0 >> 2)];
      result += B64[((b0 & 3) << 4) | (b1 >> 4)];
      result += i + 1 < bytes.length ? B64[((b1 & 0xf) << 2) | (b2 >> 6)] : "";
      result += i + 2 < bytes.length ? B64[(b2 & 0x3f)] : "";
    }
    return result;
  }

  private static fromBase64(b64: string): string {
    const lookup = new Map<string, number>();
    for (let i = 0; i < B64.length; i++) lookup.set(B64[i], i);

    const clean = b64.replace(/[^A-Za-z0-9\-_]/g, "");
    const bytes: number[] = [];

    for (let i = 0; i < clean.length; i += 4) {
      const c0 = lookup.get(clean[i]) ?? 0;
      const c1 = lookup.get(clean[i + 1]) ?? 0;
      const c2 = lookup.get(clean[i + 2]) ?? 0;
      const c3 = lookup.get(clean[i + 3]) ?? 0;

      bytes.push((c0 << 2) | (c1 >> 4));
      if (i + 2 < clean.length) bytes.push(((c1 & 0xf) << 4) | (c2 >> 2));
      if (i + 3 < clean.length) bytes.push(((c2 & 3) << 6) | c3);
    }

    let result = "";
    for (let i = 0; i < bytes.length;) {
      const b = bytes[i];
      if (b < 0x80) {
        result += String.fromCharCode(b);
        i++;
      } else if (b < 0xe0) {
        result += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
        i += 2;
      } else {
        result += String.fromCharCode(((b & 0xf) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
        i += 3;
      }
    }
    return result;
  }

  //#endregion
}

//#endregion
