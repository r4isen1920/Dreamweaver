import {
	system,
	BlockPermutation,
	BlockVolume,
	Dimension,
	Entity,
	type Player,
	type Vector3,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic, AIR_INDEX } from "../codec/Schematic.js";
import DreamweaverLogger from "../utils/Logger.js";
import { ensureLoaded, type RestoreHandle } from "../utils/ChunkLoader.js";
import { showActionBarProgress, clearActionBar } from "../utils/ProgressBar.js";

const log = DreamweaverLogger.get("Placement");

const PROGRESS_INTERVAL = 200;
const HOLOGRAM_ENTITY = "dreamweaver:hologram";
const CULL_DISTANCE = 64;
const CULL_INTERVAL = 10;
const SPAWNS_PER_TICK = 20;

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
	private jobId?: number;
	private restoreHandle?: RestoreHandle;
	private hologramEntities: Entity[] = [];
	private cullRunId?: number;

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

	//#region Hologram Preview

	async preview(): Promise<number> {
		const totalNonAir = this.schematic.getTotalNonAir();
		const self = this;
		let spawned = 0;

		return new Promise((resolve) => {
			self.jobId = system.runJob(
				(function* () {
					const playerPos = Vec3.from(self.player.location);

					for (let i = 0; i < self.schematic.blocks.length; i++) {
						const palIdx = self.schematic.blocks[i];
						if (palIdx === AIR_INDEX) continue;

						const rel = self.schematic.posAt(i);
						const worldPos = self.origin.add(rel);

						if (playerPos.distance(worldPos) > CULL_DISTANCE) continue;

						const entry = self.schematic.palette.get(palIdx);
						if (!entry) continue;

						try {
							const entity = self.dimension.spawnEntity(
								HOLOGRAM_ENTITY,
								{ x: worldPos.x + 0.5, y: worldPos.y, z: worldPos.z + 0.5 },
							);
							entity.runCommand(
								`replaceitem entity @s slot.weapon.mainhand 0 ${entry.typeId}`,
							);
							self.hologramEntities.push(entity);
							spawned++;
						} catch {
							// Skip if entity spawn fails (e.g. unloaded chunk)
						}

						if (spawned % PROGRESS_INTERVAL === 0) {
							showActionBarProgress(self.player, "§7Previewing...", spawned, totalNonAir);
						}
						if (spawned % SPAWNS_PER_TICK === 0) yield;
					}

					self.jobId = undefined;
					clearActionBar(self.player);
					self.startCulling();
					log.info(`Previewing ${spawned} hologram entities`);
					resolve(spawned);
				})(),
			);
		});
	}

	private startCulling(): void {
		if (this.cullRunId !== undefined) return;
		this.cullRunId = system.runInterval(() => {
			const playerPos = Vec3.from(this.player.location);
			this.hologramEntities = this.hologramEntities.filter((entity) => {
				try {
					if (playerPos.distance(entity.location) > CULL_DISTANCE) {
						entity.triggerEvent("dreamweaver:instant_despawn");
						return false;
					}
					return true;
				} catch {
					// Entity already invalid/removed
					return false;
				}
			});

			if (this.hologramEntities.length === 0) {
				this.stopCulling();
			}
		}, CULL_INTERVAL);
	}

	private stopCulling(): void {
		if (this.cullRunId !== undefined) {
			system.clearRun(this.cullRunId);
			this.cullRunId = undefined;
		}
	}

	clearPreview(): void {
		this.cancel();
		this.stopCulling();
		for (const entity of this.hologramEntities) {
			try {
				entity.triggerEvent("dreamweaver:instant_despawn");
			} catch {
				// Entity already invalid/removed
			}
		}
		this.hologramEntities = [];
		log.info("Cleared hologram preview");
	}

	get isPreviewing(): boolean {
		return this.hologramEntities.length > 0 || this.jobId !== undefined;
	}

	//#endregion

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
