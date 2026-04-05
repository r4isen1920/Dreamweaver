import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { showForm } from "../FormHelper.js";
import { giveWand } from "../Commands.js";
import { captureFlow } from "./CaptureResult.js";
import { showImportForm } from "./Import.js";

//#region Main Menu

export async function showMainMenu(player: Player): Promise<void> {
	const form = new ActionFormData()
		.title("§l§dLitematicaPE")
		.button("Get Wand", "textures/items/stick")
		.button("Capture Selection")
		.button("Import Schematic")
		.button("Cancel");

	const res = await showForm(form, player);
	if (res.canceled || res.selection === undefined) return;

	switch (res.selection) {
		case 0:
			giveWand(player);
			break;
		case 1:
			await captureFlow(player);
			break;
		case 2:
			await showImportForm(player);
			break;
	}
}

//#endregion
