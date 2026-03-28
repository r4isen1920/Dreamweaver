import { posToIndex, indexToPos } from "./Utils.js";
import { BlockVolume, type Vector3 } from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";

//#region Types

export type BlockStates = Record<string, boolean | number | string>;

export interface PaletteEntry {
	typeId: string;
	states: BlockStates;
}

export const AIR_INDEX = -1;

//#endregion

//#region Palette

export class BlockPalette {
	private entries: PaletteEntry[] = [];
	private indexMap = new Map<string, number>();

	private hash(typeId: string, states: BlockStates): string {
		const keys = Object.keys(states).sort();
		const parts = keys.map((k) => `${k}=${states[k]}`);
		return `${typeId}|${parts.join(",")}`;
	}

	getOrAdd(typeId: string, states: BlockStates): number {
		const key = this.hash(typeId, states);
		const existing = this.indexMap.get(key);
		if (existing !== undefined) return existing;

		const index = this.entries.length;
		this.entries.push({ typeId, states });
		this.indexMap.set(key, index);
		return index;
	}

	get(index: number): PaletteEntry | undefined {
		return this.entries[index];
	}

	get length(): number {
		return this.entries.length;
	}

	toArray(): PaletteEntry[] {
		return [...this.entries];
	}

	static fromArray(arr: PaletteEntry[]): BlockPalette {
		const palette = new BlockPalette();
		for (const entry of arr) {
			palette.getOrAdd(entry.typeId, entry.states);
		}
		return palette;
	}
}

//#endregion

//#region Schematic

export class Schematic {
	static readonly FORMAT_VERSION = 1;

	readonly version: number;
	readonly size: Vec3;
	readonly palette: BlockPalette;
	readonly blocks: number[];

	constructor(size: Vector3, palette?: BlockPalette, blocks?: number[]) {
		this.version = Schematic.FORMAT_VERSION;
		this.size = Vec3.from(size);
		this.palette = palette ?? new BlockPalette();
		const capacity = new BlockVolume(
			Vec3.Zero,
			Vec3.from(size.x - 1, size.y - 1, size.z - 1),
		).getCapacity();
		this.blocks = blocks ?? new Array(capacity).fill(AIR_INDEX);
	}

	getBlock(x: number, y: number, z: number): PaletteEntry | null {
		const idx = this.blocks[posToIndex({ x, y, z }, this.size)];
		if (idx === AIR_INDEX) return null;
		return this.palette.get(idx) ?? null;
	}

	setBlock(x: number, y: number, z: number, paletteIndex: number): void {
		this.blocks[posToIndex({ x, y, z }, this.size)] = paletteIndex;
	}

	getBlockCount(): Map<string, number> {
		const counts = new Map<string, number>();
		for (const idx of this.blocks) {
			if (idx === AIR_INDEX) continue;
			const entry = this.palette.get(idx);
			if (!entry) continue;
			counts.set(entry.typeId, (counts.get(entry.typeId) ?? 0) + 1);
		}
		return counts;
	}

	getTotalNonAir(): number {
		let count = 0;
		for (const idx of this.blocks) {
			if (idx !== AIR_INDEX) count++;
		}
		return count;
	}

	getVolume(): number {
		return this.blocks.length;
	}

	posAt(index: number): Vec3 {
		return indexToPos(index, this.size);
	}
}

//#endregion
