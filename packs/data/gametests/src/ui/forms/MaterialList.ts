import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { Schematic } from "../../codec/Schematic.js";
import { showForm } from "../FormHelper.js";
import { formatCount } from "../../utils/String.js";

//#region Material List

export async function showMaterialList(
	player: Player,
	schematic: Schematic,
): Promise<void> {
	const counts = schematic.getBlockCount();
	const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

	let body = "§l§7Material List§r\n\n";
	for (const [typeId, count] of sorted) {
		const name = typeId.replace("minecraft:", "");
		body += `§f${name} §7× ${formatCount(count)}\n`;
	}

	const form = new ActionFormData()
		.title("§l§dMaterials")
		.body(body)
		.button("Back");

	await showForm(form, player);
}

//#endregion
