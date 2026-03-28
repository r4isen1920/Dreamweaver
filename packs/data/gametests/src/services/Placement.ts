import {
	system,
	BlockPermutation,
	Dimension,
	type Vector3,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic, AIR_INDEX } from "../codec/Schematic.js";
import DreamweaverLogger from "../utils/Logger.js";

const log = DreamweaverLogger.get("Placement");

const PREVIEW_TICKS = 200; // 10 seconds

//#region Types

interface SavedBlock {
	pos: Vec3;
	permutation: BlockPermutation;
}

//#endregion

//#region Session

export class PlacementSession {
	readonly schematic: Schematic;
	readonly origin: Vec3;
	readonly dimension: Dimension;
	private savedBlocks: SavedBlock[] = [];
	private previewHandle?: number;
	private jobId?: number;

	constructor(schematic: Schematic, origin: Vector3, dimension: Dimension) {
		this.schematic = schematic;
		this.origin = Vec3.from(origin);
		this.dimension = dimension;
	}

	//#endregion

	//#region Placement

	place(): Promise<number> {
		this.savedBlocks = [];
		let placed = 0;
		const self = this;

		return new Promise((resolve) => {
			self.jobId = system.runJob(
				(function* () {
					for (let i = 0; i < self.schematic.blocks.length; i++) {
						const palIdx = self.schematic.blocks[i];
						if (palIdx === AIR_INDEX) continue;

						const rel = self.schematic.posAt(i);
						const worldPos = self.origin.add(rel);
						const entry = self.schematic.palette.get(palIdx);
						if (!entry) continue;

						const block = self.dimension.getBlock(worldPos);
						if (!block) continue;

						self.savedBlocks.push({
							pos: Vec3.from(worldPos),
							permutation: block.permutation,
						});
						block.setPermutation(
							BlockPermutation.resolve(entry.typeId, entry.states),
						);
						placed++;
						yield;
					}

					self.jobId = undefined;
					log.info(`Placed ${placed} blocks`);
					resolve(placed);
				})(),
			);
		});
	}

	async preview(): Promise<number> {
		const placed = await this.place();
		this.previewHandle = system.runTimeout(() => {
			this.clearPreview();
		}, PREVIEW_TICKS);
		return placed;
	}

	clearPreview(): void {
		if (this.previewHandle !== undefined) {
			system.clearRun(this.previewHandle);
			this.previewHandle = undefined;
		}
		this.cancel();
		this.undo();
	}

	undo(): Promise<void> {
		const blocks = this.savedBlocks;
		this.savedBlocks = [];
		const dim = this.dimension;

		return new Promise((resolve) => {
			system.runJob(
				(function* () {
					for (const saved of blocks) {
						const block = dim.getBlock(saved.pos);
						block?.setPermutation(saved.permutation);
						yield;
					}
					log.info(`Undid ${blocks.length} blocks`);
					resolve();
				})(),
			);
		});
	}

	cancel(): void {
		if (this.jobId !== undefined) {
			system.clearJob(this.jobId);
			this.jobId = undefined;
		}
	}

	getMaterials(): Map<string, number> {
		return this.schematic.getBlockCount();
	}
}

//#endregion
