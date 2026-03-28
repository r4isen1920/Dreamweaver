import { Player, GameMode } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { Schematic } from "../../codec/Schematic.js";
import { PlacementSession } from "../../services/Placement.js";
import { showForm } from "../FormHelper.js";
import { formatCount } from "../../utils/String.js";
import DreamweaverLogger from "../../utils/Logger.js";

const log = DreamweaverLogger.get("PlacementForm");

//#region Place

export async function confirmPlace(
	player: Player,
	schematic: Schematic,
): Promise<void> {
	const total = schematic.getTotalNonAir();
	const form = new MessageFormData()
		.title("§l§dConfirm Placement")
		.body(
			`Place §f${formatCount(total)}§r blocks at your current position?\n§7You may be teleported to load the area.`,
		)
		.button1("Cancel")
		.button2("Place");

	const res = await showForm(form, player);
	if (res.canceled || res.selection !== 1) return;

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
	const total = schematic.getTotalNonAir();
	const form = new MessageFormData()
		.title("§l§dPreview Placement")
		.body(
			`Preview §f${formatCount(total)}§r blocks at your current position?\n§7Blocks will revert after 10 seconds.\n§7You may be teleported to load the area.`,
		)
		.button1("Cancel")
		.button2("Preview");

	const res = await showForm(form, player);
	if (res.canceled || res.selection !== 1) return;

	const origin = Vec3.from(player.location).floor();
	const session = new PlacementSession(schematic, origin, player.dimension, player);
	const placed = await session.preview();
	log.info(`${player.name} previewing ${placed} blocks`);
	player.sendMessage(
		`§aPreview: ${formatCount(placed)} blocks. §7Reverting in 10s...`,
	);
}

//#endregion
