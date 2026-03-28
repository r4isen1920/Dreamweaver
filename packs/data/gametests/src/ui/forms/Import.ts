import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import Codec from "../../codec/Codec.js";
import { showForm } from "../FormHelper.js";
import { showCaptureResult } from "./CaptureResult.js";
import DreamweaverLogger from "../../utils/Logger.js";

const log = DreamweaverLogger.get("Import");

//#region Import Form

export async function showImportForm(player: Player): Promise<void> {
	const firstForm = new ModalFormData()
		.title("§l§dImport Schematic")
		.textField("Paste schematic string:", "DW01:...");

	const firstRes = await showForm(firstForm, player);
	if (firstRes.canceled || !firstRes.formValues) return;

	const firstInput = (firstRes.formValues[0] as string).trim();
	if (!firstInput) return;

	const header = Codec.parseHeader(firstInput);
	if (!header) {
		player.sendMessage("§cInvalid schematic string.");
		return;
	}

	const collected: string[] = [firstInput];

	if (header.total > 1) {
		log.info(
			`${player.name} importing multi-part schematic (${header.total} parts)`,
		);
		player.sendMessage(
			`§7Multi-part schematic detected (${header.total} parts). Paste each remaining part.`,
		);
		for (let i = 2; i <= header.total; i++) {
			const partForm = new ModalFormData()
				.title(`§l§dImport §r§7(${i}/${header.total})`)
				.textField(`Paste part ${i} of ${header.total}:`, "DW01:...");

			const partRes = await showForm(partForm, player);
			if (partRes.canceled || !partRes.formValues) {
				log.info(`${player.name} cancelled import at part ${i}`);
				player.sendMessage("§cImport cancelled.");
				return;
			}

			const partInput = (partRes.formValues[0] as string).trim();
			if (!partInput) {
				player.sendMessage("§cEmpty part — import cancelled.");
				return;
			}
			collected.push(partInput);
		}
	}

	try {
		const schematic = Codec.decode(collected);
		log.info(
			`${player.name} imported schematic (${schematic.size.x}×${schematic.size.y}×${schematic.size.z})`,
		);
		player.sendMessage(
			`§aSchematic loaded! §7(${schematic.size.x}×${schematic.size.y}×${schematic.size.z})`,
		);
		await showCaptureResult(player, schematic);
	} catch (e) {
		log.error(`Decode failed for ${player.name}: ${e}`);
		player.sendMessage(`§cFailed to decode schematic: ${e}`);
	}
}

//#endregion
