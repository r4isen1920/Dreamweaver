import { system, BlockVolume, InputPermissionCategory, type Player, type Vector3 } from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import LitematicaPELogger from "./Logger.js";

const log = LitematicaPELogger.get("ChunkLoader");

//#region Types

export interface RestoreHandle {
	wasRelocated: boolean;
	restore(): void;
}

//#endregion

//#region Constants

const LOAD_DISTANCE_THRESHOLD = 64;

//#endregion

//#region Chunk Loader

/**
 * Ensures the target area is loaded by teleporting the player to its center
 * if needed, waiting for chunks, and returning a handle to restore the
 * player's original position afterward.
 *
 * Movement is disabled while the area is being loaded and re-enabled on
 * {@link RestoreHandle.restore}.
 */
export async function ensureLoaded(
	player: Player,
	area: BlockVolume,
): Promise<RestoreHandle> {
	const min = Vec3.from(area.getMin());
	const max = Vec3.from(area.getMax());
	const center = min.add(max).scale(0.5);

	const playerPos = Vec3.from(player.location);
	const distance = playerPos.distance(center);

	if (distance <= LOAD_DISTANCE_THRESHOLD) {
		return { wasRelocated: false, restore() {} };
	}

	// Save original state
	const savedPos: Vector3 = { x: player.location.x, y: player.location.y, z: player.location.z };
	const savedDimension = player.dimension;

	// Lock movement and teleport
	player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
	player.teleport(center);

	const waitTicks = 10 + Math.min(30, Math.max(1, 2 * (distance - 128)));
	log.info(
		`Teleported ${player.name} to ${center.toString("short")} for chunk loading (waiting ${waitTicks} ticks)`,
	);

	await system.waitTicks(waitTicks);

	return {
		wasRelocated: true,
		restore() {
			player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
			player.teleport(savedPos, { dimension: savedDimension });
			log.info(`Restored ${player.name} to original position`);
		},
	};
}

//#endregion
