import { Player } from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic } from "../../codec/Schematic.js";
import { PlacementSession } from "../../services/Placement.js";
import { HologramSession } from "../../services/Hologram.js";
import { formatCount } from "../../utils/String.js";
import LitematicaPELogger from "../../utils/Logger.js";

const log = LitematicaPELogger.get("PlacementForm");

//#region Place

export async function confirmPlace(
	player: Player,
	schematic: Schematic,
): Promise<void> {
	const origin = Vec3.from(player.location).floor();
	const session = new PlacementSession(schematic, origin, player.dimension, player);
	const placed = await session.place();
	log.info(`${player.name} placed ${placed} blocks`);
	player.sendMessage(`§aPlaced ${formatCount(placed)} blocks.`);
}

//#endregion

//#region Preview

export async function confirmPreview(
	player: Player,
	schematic: Schematic,
): Promise<void> {
	const origin = Vec3.from(player.location).floor();
	const session = new HologramSession(schematic, origin, player.dimension, player);
	const spawned = await session.preview();
	log.info(`${player.name} previewing ${spawned} hologram blocks (batch)`);
	player.sendMessage(
		`§aPreview: ${formatCount(spawned)} holograms spawned.`,
	);
}

//#endregion
