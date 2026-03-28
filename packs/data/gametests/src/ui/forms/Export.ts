import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { showForm } from "../FormHelper.js";
import DreamweaverLogger from "../../utils/Logger.js";

const log = DreamweaverLogger.get("Export");

//#region Export Form

export async function showExportForm(
	player: Player,
	parts: string[],
): Promise<void> {
	log.info(
		`${player.name} exporting schematic (${parts.length} part${parts.length > 1 ? "s" : ""})`,
	);

	for (let i = 0; i < parts.length; i++) {
		const label =
			parts.length > 1
				? `Part ${i + 1} of ${parts.length} — copy this string:`
				: "Copy the string below:";

		const form = new ModalFormData()
			.title(
				parts.length > 1
					? `§l§dExport §r§7(${i + 1}/${parts.length})`
					: "§l§dExport Schematic",
			)
			.textField(label, "DW01:...", { defaultValue: parts[i] });

		const res = await showForm(form, player);
		if (res.canceled) {
			log.info(`${player.name} cancelled export at part ${i + 1}`);
			return;
		}
	}

	log.info(`${player.name} completed export`);
}

//#endregion
