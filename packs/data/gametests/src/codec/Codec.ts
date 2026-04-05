import {
	BlockPalette,
	Schematic,
	PaletteEntry,
	BlockStates,
} from "./Schematic.js";
import { deflateSync, inflateSync } from "fflate";
import CodecBinary from "./Binary.js";



//#region Codec
/**
 * Handles encoding/decoding schematics to/from compact string format. The format is:
 * - Binary serialization of the schematic data (version, size, palette, blocks)
 * - Compression via DEFLATE
 * - To Base64
 * - Split into chunks with headers
 */
export default class Codec {
	/**
	 * The prefix for each part of the encoded schematic, followed by "part/total:" and the chunk data.
	 * It is used to identify and parse the parts during decoding. 
	 * 
	 * The prefix also denotes the format version, for future compatibility.
	 */
	private static readonly MAGIC = "DW01:";
	/**
	 * Maximum length of each part, including the header.
	 * This number could theoretically be much higher--that is, within the 32-bit int limit--but intentionally keeping it small
	 * to ensure a balance in stability, compatibility, and performance. Especially fucking bedrock has to work cross-platform kms
	 */
	private static readonly MAX_PART_LENGTH = 65_535;
	/** Characters used for Base64 encoding */
	private static readonly B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	/** Prefix for Minecraft block IDs--to differentiate custom blocks from vanilla ones */
	private static readonly MC_PREFIX = "minecraft:";


	/** Cannot be instantiated */
	private constructor() {}


	/**
	 * Transforms a Schematic object into a compact string format suitable for sharing.
	 * @param schematic The schematic to encode.
	 * @returns An array of strings representing the encoded schematic parts.
	 */
	static encode(schematic: Schematic): string[] {
		const raw = Codec.serializeBinary(schematic);
		const compressed = deflateSync(raw);
		const b64 = Codec.toBase64(compressed);

		// Dynamic chunk sizing: header = "DW01:X/Y:" where X and Y grow with part count
		let totalParts = 1;
		while (true) {
			const headerLen = this.MAGIC.length + String(totalParts).length * 2 + 2;
			const chunkSize = this.MAX_PART_LENGTH - headerLen;
			const needed = Math.max(1, Math.ceil(b64.length / chunkSize));
			if (needed <= totalParts) {
				totalParts = needed;
				break;
			}
			totalParts = needed;
		}

		const headerLen = this.MAGIC.length + String(totalParts).length * 2 + 2;
		const chunkSize = this.MAX_PART_LENGTH - headerLen;

		const parts: string[] = [];
		for (let i = 0; i < totalParts; i++) {
			const chunk = b64.slice(i * chunkSize, (i + 1) * chunkSize);
			parts.push(`${this.MAGIC}${i + 1}/${totalParts}:${chunk}`);
		}
		return parts;
	}

	/**
	 * Describes the header of each part in the encoded schematic string, used for parsing and reassembling the data during decoding.
	 * @param str The encoded schematic string part.
	 * @returns The parsed header information or null if the string is invalid.
	 */
	static parseHeader(str: string): PartHeader | null {
		const trimmed = str.trim();
		if (!trimmed.startsWith(this.MAGIC)) return null;
		const rest = trimmed.slice(this.MAGIC.length);
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

	/**
	 * Parses the encoded schematic parts, validates them, and reconstructs the original Schematic object.
	 * @param parts Parts of the encoded schematic string, each containing a header and Base64 data.
	 * @returns The reconstructed Schematic object.
	 */
	static decode(parts: string[]): Schematic {
		const parsed = parts.map((p) => {
			const h = Codec.parseHeader(p);
			if (!h) throw new Error("Invalid LitematicaPE schematic string");
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



	//#region Serialization

	private static serializeBinary(schematic: Schematic): Uint8Array {
		const buf = new CodecBinary.Writer();

		// Header: version (1 byte) + size (3× uint16 LE = 6 bytes) = 7 bytes
		buf.writeUint8(schematic.version);
		buf.writeUint16(schematic.size.x);
		buf.writeUint16(schematic.size.y);
		buf.writeUint16(schematic.size.z);

		// Palette
		const entries = schematic.palette.toArray();
		buf.writeVarint(entries.length);
		for (const entry of entries) {
			const typeId = entry.typeId.startsWith(this.MC_PREFIX)
				? entry.typeId.slice(this.MC_PREFIX.length)
				: ":" + entry.typeId;
			buf.writeString(typeId);

			const stateKeys = Object.keys(entry.states);
			buf.writeVarint(stateKeys.length);
			for (const key of stateKeys) {
				const shortKey = key.startsWith(this.MC_PREFIX)
					? key.slice(this.MC_PREFIX.length)
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
		const buf = new CodecBinary.Reader(data);

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
			const typeId = rawId.startsWith(":") ? rawId.slice(1) : this.MC_PREFIX + rawId;

			const stateCount = buf.readVarint();
			const states: BlockStates = {};
			for (let s = 0; s < stateCount; s++) {
				const rawKey = buf.readString();
				const key = rawKey.startsWith(":")
					? rawKey.slice(1)
					: this.MC_PREFIX + rawKey;

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



	//#region Base64

	private static toBase64(bytes: Uint8Array): string {
		let result = "";
		for (let i = 0; i < bytes.length; i += 3) {
			const b0 = bytes[i];
			const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
			const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

			result += this.B64[b0 >> 2];
			result += this.B64[((b0 & 3) << 4) | (b1 >> 4)];
			if (i + 1 < bytes.length) result += this.B64[((b1 & 0xf) << 2) | (b2 >> 6)];
			if (i + 2 < bytes.length) result += this.B64[b2 & 0x3f];
		}
		return result;
	}

	private static fromBase64(b64: string): Uint8Array {
		const lookup = new Map<string, number>();
		for (let i = 0; i < this.B64.length; i++) lookup.set(this.B64[i], i);

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
}



//#region Types
/**
 * Describes the header of each part in the encoded schematic string, used for parsing and reassembling the data during decoding.
 */
export interface PartHeader {
	/** The index of this part in the sequence. */
	part: number;
	/** The total number of parts in the sequence. */
	total: number;
	/** The Base64-encoded data of this part. */
	data: string;
}
