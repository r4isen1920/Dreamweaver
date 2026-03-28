import { system, BlockVolume, Dimension } from "@minecraft/server";
import { Vec3, Logger } from "@bedrock-oss/bedrock-boost";
import { Schematic, AIR_INDEX } from "./Schematic.js";
import { posToIndex } from "./Utils.js";

const log = Logger.getLogger("Capture");

//#region Capture

export class CaptureService {
	static capture(
		dimension: Dimension,
		volume: BlockVolume,
	): Promise<Schematic> {
		const min = Vec3.from(volume.getMin());
		const span = volume.getSpan();
		const schematic = new Schematic(span);

		return new Promise((resolve) => {
			system.runJob(
				(function* () {
					for (const loc of volume.getBlockLocationIterator()) {
						const block = dimension.getBlock(loc);
						if (!block || block.typeId === "minecraft:air") {
							yield;
							continue;
						}

						const rel = Vec3.from(loc).subtract(min);
						const idx = posToIndex(rel, span);
						const states = block.permutation.getAllStates();
						const palIdx = schematic.palette.getOrAdd(block.typeId, states);
						schematic.blocks[idx] = palIdx;
						yield;
					}

					log.info(
						`Capture complete: ${schematic.getTotalNonAir()} blocks, ${schematic.palette.length} palette entries`,
					);
					resolve(schematic);
				})(),
			);
		});
	}
}

//#endregion
