import {
	system,
	BlockPermutation,
	BlockVolume,
	Dimension,
	type Player,
	type Vector3,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic, AIR_INDEX } from "../codec/Schematic.js";
import DreamweaverLogger from "../utils/Logger.js";
import { ensureLoaded, type RestoreHandle } from "../utils/ChunkLoader.js";
import { showActionBarProgress, clearActionBar } from "../utils/ProgressBar.js";

const log = DreamweaverLogger.get("Placement");

const PREVIEW_TICKS = 200; // 10 seconds
const PROGRESS_INTERVAL = 200;

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
	readonly player: Player;
	private savedBlocks: SavedBlock[] = [];
	private previewHandle?: number;
	private jobId?: number;
	private restoreHandle?: RestoreHandle;

	constructor(
		schematic: Schematic,
		origin: Vector3,
		dimension: Dimension,
		player: Player,
	) {
		this.schematic = schematic;
		this.origin = Vec3.from(origin);
		this.dimension = dimension;
		this.player = player;
	}

	//#endregion

	//#region Placement

	async place(): Promise<number> {
		this.savedBlocks = [];

		const end = this.origin.add(this.schematic.size).subtract(1, 1, 1);
		const volume = new BlockVolume(this.origin, end);
		this.restoreHandle = await ensureLoaded(this.player, volume);

		let placed = 0;
		const totalNonAir = this.schematic.getTotalNonAir();
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

						if (placed % PROGRESS_INTERVAL === 0) {
							showActionBarProgress(self.player, "§7Placing...", placed, totalNonAir);
						}
						yield;
					}

					self.jobId = undefined;
					clearActionBar(self.player);
					self.restoreHandle?.restore();
					self.restoreHandle = undefined;
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

	async undo(): Promise<void> {
		const blocks = this.savedBlocks;
		this.savedBlocks = [];
		const dim = this.dimension;

		if (blocks.length > 0) {
			const positions = blocks.map((b) => b.pos);
			const min = positions.reduce(
				(a, b) => Vec3.from(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)),
				Vec3.from(positions[0]),
			);
			const max = positions.reduce(
				(a, b) => Vec3.from(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)),
				Vec3.from(positions[0]),
			);
			const undoHandle = await ensureLoaded(this.player, new BlockVolume(min, max));

			return new Promise((resolve) => {
				const total = blocks.length;
				const player = this.player;
				let done = 0;

				system.runJob(
					(function* () {
						for (const saved of blocks) {
							const block = dim.getBlock(saved.pos);
							block?.setPermutation(saved.permutation);
							done++;

							if (done % PROGRESS_INTERVAL === 0) {
								showActionBarProgress(player, "§7Undoing...", done, total);
							}
							yield;
						}
						clearActionBar(player);
						undoHandle.restore();
						log.info(`Undid ${blocks.length} blocks`);
						resolve();
					})(),
				);
			});
		}
	}

	cancel(): void {
		if (this.jobId !== undefined) {
			system.clearJob(this.jobId);
			this.jobId = undefined;
		}
		if (this.restoreHandle) {
			this.restoreHandle.restore();
			this.restoreHandle = undefined;
		}
	}

	getMaterials(): Map<string, number> {
		return this.schematic.getBlockCount();
	}
}

//#endregion
