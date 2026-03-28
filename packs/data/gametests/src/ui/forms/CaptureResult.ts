import { Player, GameMode } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { Schematic } from "../../codec/Schematic.js";
import Codec from "../../codec/Codec.js";
import { SelectionManager } from "../Selection.js";
import { CaptureService } from "../../services/Capture.js";
import { showForm } from "../FormHelper.js";
import { formatCount } from "../../utils/String.js";
import { showExportForm } from "./Export.js";
import { showMaterialList } from "./MaterialList.js";
import { confirmPlace, confirmPreview } from "./PlacementForm.js";
import DreamweaverLogger from "../../utils/Logger.js";

const log = DreamweaverLogger.get("CaptureResult");

//#region Capture Flow

export async function captureFlow(player: Player): Promise<void> {
	const sel = SelectionManager.get(player);
	if (!sel.isComplete()) {
		player.sendMessage(
			"§cSelect two positions first using the Dreamweaver Wand.",
		);
		return;
	}

	const vol = sel.getVolume()!;
	log.info(`${player.name} starting capture...`);
	player.sendMessage("§7Capturing...");

	const schematic = await CaptureService.capture(player.dimension, vol);
	log.info(`${player.name} captured ${schematic.getTotalNonAir()} blocks`);
	await showCaptureResult(player, schematic);
}

//#endregion

//#region Capture Result

export async function showCaptureResult(
	player: Player,
	schematic: Schematic,
): Promise<void> {
	const { size } = schematic;
	const total = schematic.getTotalNonAir();
	const isCreative = player.getGameMode() === GameMode.Creative;

	const form = new ActionFormData()
		.title("§l§dCapture Result")
		.body(
			`§7Size: §f${size.x}§7×§f${size.y}§7×§f${size.z}\n§7Blocks: §f${formatCount(total)}`,
		)
		.button("Export to Chat")
		.button(isCreative ? "Place at Position" : "Preview at Position")
		.button("Material List")
		.button("Cancel");

	const res = await showForm(form, player);
	if (res.canceled || res.selection === undefined) return;

	switch (res.selection) {
		case 0: {
			const encoded = Codec.encode(schematic);
			await showExportForm(player, encoded);
			break;
		}
		case 1: {
			if (isCreative) {
				await confirmPlace(player, schematic);
			} else {
				await confirmPreview(player, schematic);
			}
			break;
		}
		case 2: {
			await showMaterialList(player, schematic);
			break;
		}
	}
}

//#endregion
