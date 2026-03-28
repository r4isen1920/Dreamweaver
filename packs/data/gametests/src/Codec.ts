import {
	BlockPalette,
	Schematic,
	PaletteEntry,
	BlockStates,
} from "./Schematic.js";
import { deflateSync, inflateSync } from "fflate";

//#region Codec

const MAGIC = "DW1:";
const MAX_PART_LENGTH = 65535;

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const MC_PREFIX = "minecraft:";

export interface PartHeader {
	part: number;
	total: number;
	data: string;
}

export class Codec {
	static encode(schematic: Schematic): string[] {
		const raw = Codec.serializeBinary(schematic);
		const compressed = deflateSync(raw);
		const b64 = Codec.toBase64(compressed);

		// Dynamic chunk sizing: header = "DW1:X/Y:" where X and Y grow with part count
		let totalParts = 1;
		while (true) {
			const headerLen = MAGIC.length + String(totalParts).length * 2 + 2;
			const chunkSize = MAX_PART_LENGTH - headerLen;
			const needed = Math.max(1, Math.ceil(b64.length / chunkSize));
			if (needed <= totalParts) {
				totalParts = needed;
				break;
			}
			totalParts = needed;
		}

		const headerLen = MAGIC.length + String(totalParts).length * 2 + 2;
		const chunkSize = MAX_PART_LENGTH - headerLen;

		const parts: string[] = [];
		for (let i = 0; i < totalParts; i++) {
			const chunk = b64.slice(i * chunkSize, (i + 1) * chunkSize);
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
			return {
				part: parseInt(match[1]),
				total: parseInt(match[2]),
				data: match[3],
			};
		}
		return { part: 1, total: 1, data: rest };
	}

	static decode(parts: string[]): Schematic {
		const parsed = parts.map((p) => {
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

		const b64 = parsed.map((p) => p.data.replace(/\s/g, "")).join("");
		if (b64.length === 0) throw new Error("Empty schematic data");

		let compressed: Uint8Array;
		try {
			compressed = Codec.fromBase64(b64);
		} catch {
			throw new Error(
				"Schematic data appears truncated. Ensure all parts were copied in full.",
			);
		}

		let raw: Uint8Array;
		try {
			raw = inflateSync(compressed);
		} catch {
			throw new Error(
				"Corrupt schematic data. Ensure all parts were copied correctly.",
			);
		}

		return Codec.deserializeBinary(raw);
	}

	//#region Binary serialization

	private static serializeBinary(schematic: Schematic): Uint8Array {
		const buf = new BinaryWriter();

		// Header: version (1 byte) + size (3× uint16 LE = 6 bytes) = 7 bytes
		buf.writeUint8(schematic.version);
		buf.writeUint16(schematic.size.x);
		buf.writeUint16(schematic.size.y);
		buf.writeUint16(schematic.size.z);

		// Palette
		const entries = schematic.palette.toArray();
		buf.writeVarint(entries.length);
		for (const entry of entries) {
			const typeId = entry.typeId.startsWith(MC_PREFIX)
				? entry.typeId.slice(MC_PREFIX.length)
				: ":" + entry.typeId;
			buf.writeString(typeId);

			const stateKeys = Object.keys(entry.states);
			buf.writeVarint(stateKeys.length);
			for (const key of stateKeys) {
				const shortKey = key.startsWith(MC_PREFIX)
					? key.slice(MC_PREFIX.length)
					: ":" + key;
				buf.writeString(shortKey);

				const val = entry.states[key];
				if (typeof val === "boolean") {
					buf.writeUint8(val ? 1 : 0);
				} else if (typeof val === "number") {
					buf.writeUint8(2);
					buf.writeInt32(val);
				} else {
					buf.writeUint8(3);
					buf.writeString(val);
				}
			}
		}

		// Blocks: RLE with zigzag-encoded varints
		const blocks = schematic.blocks;
		if (blocks.length > 0) {
			let current = blocks[0];
			let count = 1;
			for (let i = 1; i < blocks.length; i++) {
				if (blocks[i] === current) {
					count++;
				} else {
					buf.writeZigzag(current);
					buf.writeVarint(count);
					current = blocks[i];
					count = 1;
				}
			}
			buf.writeZigzag(current);
			buf.writeVarint(count);
		}

		return buf.finish();
	}

	private static deserializeBinary(data: Uint8Array): Schematic {
		const buf = new BinaryReader(data);

		const version = buf.readUint8();
		if (version !== Schematic.FORMAT_VERSION) {
			throw new Error(`Unsupported format version: ${version}`);
		}

		const sizeX = buf.readUint16();
		const sizeY = buf.readUint16();
		const sizeZ = buf.readUint16();

		// Palette
		const paletteLen = buf.readVarint();
		const entries: PaletteEntry[] = [];
		for (let i = 0; i < paletteLen; i++) {
			const rawId = buf.readString();
			const typeId = rawId.startsWith(":") ? rawId.slice(1) : MC_PREFIX + rawId;

			const stateCount = buf.readVarint();
			const states: BlockStates = {};
			for (let s = 0; s < stateCount; s++) {
				const rawKey = buf.readString();
				const key = rawKey.startsWith(":")
					? rawKey.slice(1)
					: MC_PREFIX + rawKey;

				const tag = buf.readUint8();
				if (tag <= 1) {
					states[key] = tag === 1;
				} else if (tag === 2) {
					states[key] = buf.readInt32();
				} else {
					states[key] = buf.readString();
				}
			}
			entries.push({ typeId, states });
		}

		const palette = BlockPalette.fromArray(entries);

		// Blocks: RLE zigzag varints
		const capacity = sizeX * sizeY * sizeZ;
		const blocks: number[] = new Array(capacity);
		let pos = 0;
		while (pos < capacity) {
			const value = buf.readZigzag();
			const count = buf.readVarint();
			for (let j = 0; j < count; j++) blocks[pos++] = value;
		}

		return new Schematic({ x: sizeX, y: sizeY, z: sizeZ }, palette, blocks);
	}

	//#endregion

	//#region Base64

	private static toBase64(bytes: Uint8Array): string {
		let result = "";
		for (let i = 0; i < bytes.length; i += 3) {
			const b0 = bytes[i];
			const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
			const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

			result += B64[b0 >> 2];
			result += B64[((b0 & 3) << 4) | (b1 >> 4)];
			if (i + 1 < bytes.length) result += B64[((b1 & 0xf) << 2) | (b2 >> 6)];
			if (i + 2 < bytes.length) result += B64[b2 & 0x3f];
		}
		return result;
	}

	private static fromBase64(b64: string): Uint8Array {
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

		return new Uint8Array(bytes);
	}

	//#endregion
}

//#endregion

//#region Binary helpers

class BinaryWriter {
	private chunks: number[] = [];

	writeUint8(v: number): void {
		this.chunks.push(v & 0xff);
	}

	writeUint16(v: number): void {
		this.chunks.push(v & 0xff, (v >> 8) & 0xff);
	}

	writeInt32(v: number): void {
		this.chunks.push(
			v & 0xff,
			(v >> 8) & 0xff,
			(v >> 16) & 0xff,
			(v >> 24) & 0xff,
		);
	}

	writeVarint(v: number): void {
		while (v >= 0x80) {
			this.chunks.push((v & 0x7f) | 0x80);
			v >>>= 7;
		}
		this.chunks.push(v);
	}

	writeZigzag(v: number): void {
		this.writeVarint((v << 1) ^ (v >> 31));
	}

	writeString(s: string): void {
		const encoded: number[] = [];
		for (let i = 0; i < s.length; i++) {
			const code = s.charCodeAt(i);
			if (code < 0x80) {
				encoded.push(code);
			} else if (code < 0x800) {
				encoded.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
			} else {
				encoded.push(
					0xe0 | (code >> 12),
					0x80 | ((code >> 6) & 0x3f),
					0x80 | (code & 0x3f),
				);
			}
		}
		this.writeVarint(encoded.length);
		for (const b of encoded) this.chunks.push(b);
	}

	finish(): Uint8Array {
		return new Uint8Array(this.chunks);
	}
}

class BinaryReader {
	private data: Uint8Array;
	private pos = 0;

	constructor(data: Uint8Array) {
		this.data = data;
	}

	readUint8(): number {
		return this.data[this.pos++];
	}

	readUint16(): number {
		const v = this.data[this.pos] | (this.data[this.pos + 1] << 8);
		this.pos += 2;
		return v;
	}

	readInt32(): number {
		const v =
			this.data[this.pos] |
			(this.data[this.pos + 1] << 8) |
			(this.data[this.pos + 2] << 16) |
			(this.data[this.pos + 3] << 24);
		this.pos += 4;
		return v;
	}

	readVarint(): number {
		let v = 0;
		let shift = 0;
		while (true) {
			const b = this.data[this.pos++];
			v |= (b & 0x7f) << shift;
			if ((b & 0x80) === 0) return v >>> 0;
			shift += 7;
		}
	}

	readZigzag(): number {
		const n = this.readVarint();
		return (n >>> 1) ^ -(n & 1);
	}

	readString(): string {
		const len = this.readVarint();
		let result = "";
		const end = this.pos + len;
		while (this.pos < end) {
			const b = this.data[this.pos];
			if (b < 0x80) {
				result += String.fromCharCode(b);
				this.pos++;
			} else if (b < 0xe0) {
				result += String.fromCharCode(
					((b & 0x1f) << 6) | (this.data[this.pos + 1] & 0x3f),
				);
				this.pos += 2;
			} else {
				result += String.fromCharCode(
					((b & 0xf) << 12) |
						((this.data[this.pos + 1] & 0x3f) << 6) |
						(this.data[this.pos + 2] & 0x3f),
				);
				this.pos += 3;
			}
		}
		return result;
	}
}

//#endregion
