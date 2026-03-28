
/**
 * A collection of simple utils for binary serialization.
 * Supplements Codec.
 */
export default class CodecBinary {

	//#region Writer
	/**
	 * A simple binary writer that supports basic types and variable-length encoding.
	 * Handles chunking and Base64 encoding.
	 */
	public static Writer = class BinaryWriter {
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
	};


	//#region Reader
	/**
	 * A simple binary reader that supports basic types and variable-length encoding.
	 * Reads through a Uint8Array sequentially, maintaining an internal position.
	 */
	static Reader = class BinaryReader {
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
	};
}
