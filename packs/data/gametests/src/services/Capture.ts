import { system, BlockVolume, Dimension, type Player } from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic, AIR_INDEX } from "../codec/Schematic.js";
import { posToIndex } from "../utils/Indexing.js";
import DreamweaverLogger from "../utils/Logger.js";
import { ensureLoaded } from "../utils/ChunkLoader.js";
import { showActionBarProgress, clearActionBar } from "../utils/ProgressBar.js";

const PROGRESS_INTERVAL = 200;

//#region Capture
/**
 * Handles capturing a region of the world into a Schematic object.
 * It iterates through the specified volume, reads block data, and constructs a Schematic representation.
 */
export class CaptureService {
	private static readonly log = DreamweaverLogger.get("Capture");

	/**
	 * Given a dimension and a block volume, captures the blocks within that volume and returns a Schematic object representing it.
	 * This function runs the capture process as a job and slices it into several ticks.
	 * @param dimension 
	 * @param volume 
	 * @param player The player performing the capture, used for chunk loading and progress display.
	 * @returns 
	 */
	static async capture(
		dimension: Dimension,
		volume: BlockVolume,
		player: Player,
	): Promise<Schematic> {
		const handle = await ensureLoaded(player, volume);

		const min = Vec3.from(volume.getMin());
		const span = volume.getSpan();
		const schematic = new Schematic(span);
		const total = volume.getCapacity();

		return new Promise((resolve) => {
			let processed = 0;

			system.runJob(
				(function* () {
					for (const loc of volume.getBlockLocationIterator()) {
						const block = dimension.getBlock(loc);
						processed++;

						if (!block || block.isAir) {
							if (processed % PROGRESS_INTERVAL === 0) {
								showActionBarProgress(player, "§7Capturing...", processed, total);
							}
							yield;
							continue;
						}

						const rel = Vec3.from(loc).subtract(min);
						const idx = posToIndex(rel, span);
						const states = block.permutation.getAllStates();
						const palIdx = schematic.palette.getOrAdd(block.typeId, states);
						schematic.blocks[idx] = palIdx;

						if (processed % PROGRESS_INTERVAL === 0) {
							showActionBarProgress(player, "§7Capturing...", processed, total);
						}
						yield;
					}

					clearActionBar(player);
					handle.restore();

					CaptureService.log.info(
						`Capture complete: ${schematic.getTotalNonAir()} blocks, ${schematic.palette.length} palette entries`,
					);
					resolve(schematic);
				})(),
			);
		});
	}
}

