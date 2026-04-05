import {
	system,
	Dimension,
	Entity,
	type Player,
	type Vector3,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic } from "../codec/Schematic.js";
import { getBlockShape, CUBE_SHAPE } from "../codec/ShapeMap.js";
import { getBlockTextureIndex } from "../codec/TextureMap.js";
import DreamweaverLogger from "../utils/Logger.js";
import { showActionBarProgress, clearActionBar } from "../utils/ProgressBar.js";

const log = DreamweaverLogger.get("Hologram");

const PROGRESS_INTERVAL = 200;
const HOLOGRAM_ENTITY = "dreamweaver:hologram";
const BATCH_ENTITY = "dreamweaver:hologram_batch";

const BATCH_GRID = 4;
const BITS_PER_MASK = 16;
const SPAWNS_PER_TICK = 4;


//#region SESSION

export class HologramSession {
	readonly schematic: Schematic;
	readonly origin: Vec3;
	readonly dimension: Dimension;
	readonly player: Player;
	private entities: Entity[] = [];
	private jobId?: number;

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

	async preview(): Promise<number> {
		const totalNonAir = this.schematic.getTotalNonAir();
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const session = this;
		let batchCount = 0;
		let fallbackCount = 0;

		return new Promise((resolve) => {
			session.jobId = system.runJob(
				(function* () {
					const sizeX = session.schematic.size.x;
					const sizeY = session.schematic.size.y;
					const sizeZ = session.schematic.size.z;

					for (let chunkY = 0; chunkY < sizeY; chunkY += BATCH_GRID) {
						for (let chunkZ = 0; chunkZ < sizeZ; chunkZ += BATCH_GRID) {
							for (let chunkX = 0; chunkX < sizeX; chunkX += BATCH_GRID) {
								const groups = new Map<number, number[]>();
								const fallbacks: { worldPos: Vec3; typeId: string }[] = [];

								for (let ly = 0; ly < BATCH_GRID && chunkY + ly < sizeY; ly += 1) {
									for (let lz = 0; lz < BATCH_GRID && chunkZ + lz < sizeZ; lz += 1) {
										for (let lx = 0; lx < BATCH_GRID && chunkX + lx < sizeX; lx += 1) {
											const gx = chunkX + lx;
											const gy = chunkY + ly;
											const gz = chunkZ + lz;

											const entry = session.schematic.getBlock(gx, gy, gz);
											if (!entry) continue;

											const worldPos = session.origin.add(gx, gy, gz);
											const shape = getBlockShape(entry.typeId, entry.states);

											if (shape !== CUBE_SHAPE) {
												fallbacks.push({ worldPos, typeId: entry.typeId });
												continue;
											}

											const texIdx = getBlockTextureIndex(entry.typeId);
											const cellIndex = ly * BATCH_GRID * BATCH_GRID + lz * BATCH_GRID + lx;

											let cells = groups.get(texIdx);
											if (cells === undefined) {
												cells = [];
												groups.set(texIdx, cells);
											}
											cells.push(cellIndex);
										}
									}
								}

								const chunkWorldPos = session.origin.add(
									chunkX + 0.5, chunkY, chunkZ + 0.5,
								);
								let spawnedThisTick = 0;

								for (const [texIdx, cells] of groups) {
									const masks = encodeBitmask(cells);

									try {
										const entity = session.dimension.spawnEntity(
											BATCH_ENTITY,
											chunkWorldPos,
										);
										entity.setProperty("dreamweaver:tex", texIdx);
										entity.setProperty("dreamweaver:m0", masks[0]);
										entity.setProperty("dreamweaver:m1", masks[1]);
										entity.setProperty("dreamweaver:m2", masks[2]);
										entity.setProperty("dreamweaver:m3", masks[3]);
										session.entities.push(entity);
										batchCount += cells.length;
										spawnedThisTick += 1;
										if (spawnedThisTick >= SPAWNS_PER_TICK) {
											spawnedThisTick = 0;
											yield;
										}
									} catch {
										// Skip if entity spawn fails
									}
								}

								for (const fb of fallbacks) {
									try {
										const entity = session.dimension.spawnEntity(
											HOLOGRAM_ENTITY,
											{ x: fb.worldPos.x + 0.5, y: fb.worldPos.y, z: fb.worldPos.z + 0.5 },
										);
										entity.runCommand(
											`replaceitem entity @s slot.weapon.mainhand 0 ${fb.typeId}`,
										);
										session.entities.push(entity);
										fallbackCount += 1;
										spawnedThisTick += 1;
										if (spawnedThisTick >= SPAWNS_PER_TICK) {
											spawnedThisTick = 0;
											yield;
										}
									} catch {
										// Skip if entity spawn fails
									}
								}

								if ((batchCount + fallbackCount) % PROGRESS_INTERVAL === 0) {
									showActionBarProgress(
										session.player, "\u00a77Previewing...",
										batchCount + fallbackCount, totalNonAir,
									);
								}
								yield;
							}
						}
					}

					session.jobId = undefined;
					clearActionBar(session.player);
					log.info(
						`Batch preview: ${batchCount} batched, ${fallbackCount} fallback, ${session.entities.length} entities`,
					);
					resolve(batchCount + fallbackCount);
				})(),
			);
		});
	}

	clearPreview(): void {
		this.cancel();
		for (const entity of this.entities) {
			try {
				entity.triggerEvent("dreamweaver:instant_despawn");
			} catch {
				// Entity already invalid/removed
			}
		}
		this.entities = [];
		log.info("Cleared hologram preview");
	}

	get isPreviewing(): boolean {
		return this.entities.length > 0 || this.jobId !== undefined;
	}

	cancel(): void {
		if (this.jobId !== undefined) {
			system.clearJob(this.jobId);
			this.jobId = undefined;
		}
	}
}


//#region BITMASK

function encodeBitmask(cellIndices: number[]): [number, number, number, number] {
	const masks: [number, number, number, number] = [0, 0, 0, 0];

	for (const idx of cellIndices) {
		const maskIndex = (idx / BITS_PER_MASK) | 0;
		const bit = idx % BITS_PER_MASK;
		masks[maskIndex] |= (1 << bit);
	}

	return masks;
}
