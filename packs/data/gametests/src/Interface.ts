import { Player, GameMode } from "@minecraft/server";
import {
	ActionFormData,
	ModalFormData,
	MessageFormData,
	FormCancelationReason,
} from "@minecraft/server-ui";
import { Vec3, Logger } from "@bedrock-oss/bedrock-boost";
import { Schematic } from "./Schematic.js";
import { Codec, PartHeader } from "./Codec.js";
import { SelectionManager } from "./Selection.js";
import { CaptureService } from "./Capture.js";
import { PlacementSession } from "./Placement.js";
import { WAND_ITEM, WAND_NAME, formatCount, giveWand } from "./Utils.js";

const log = Logger.getLogger("Interface");

//#region Helpers

type FormData = ActionFormData | ModalFormData | MessageFormData;

async function showForm<T extends FormData>(
	form: T,
	player: Player,
	retries = 5,
): Promise<Awaited<ReturnType<T["show"]>>> {
	for (let i = 0; i < retries; i++) {
		const res = await (form as any).show(player);
		if (res.cancelationReason !== FormCancelationReason.UserBusy) return res;
	}
	return (form as any).show(player);
}

//#endregion

//#region Forms

export class DreamweaverUI {
	static async showMainMenu(player: Player): Promise<void> {
		const form = new ActionFormData()
			.title("§l§dDreamweaver")
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
				await this.captureFlow(player);
				break;
			case 2:
				await this.showImportForm(player);
				break;
		}
	}

	private static async captureFlow(player: Player): Promise<void> {
		const sel = SelectionManager.get(player);
		if (!sel.isComplete()) {
			player.sendMessage(
				"§cSelect two positions first using the Dreamweaver Wand.",
			);
			return;
		}

		const vol = sel.getVolume()!;
		player.sendMessage("§7Capturing...");

		const schematic = await CaptureService.capture(player.dimension, vol);
		log.info(`${player.name} captured ${schematic.getTotalNonAir()} blocks`);
		await this.showCaptureResult(player, schematic);
	}

	static async showCaptureResult(
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
				await this.showExportForm(player, encoded);
				break;
			}
			case 1: {
				if (isCreative) {
					await this.confirmPlace(player, schematic);
				} else {
					await this.confirmPreview(player, schematic);
				}
				break;
			}
			case 2: {
				await this.showMaterialList(player, schematic);
				break;
			}
		}
	}

	static async showExportForm(player: Player, parts: string[]): Promise<void> {
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
				.textField(label, "DW1:...", { defaultValue: parts[i] });

			const res = await showForm(form, player);
			if (res.canceled) return;
		}
	}

	static async showImportForm(player: Player): Promise<void> {
		const firstForm = new ModalFormData()
			.title("§l§dImport Schematic")
			.textField("Paste schematic string:", "DW1:...");

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
			player.sendMessage(
				`§7Multi-part schematic detected (${header.total} parts). Paste each remaining part.`,
			);
			for (let i = 2; i <= header.total; i++) {
				const partForm = new ModalFormData()
					.title(`§l§dImport §r§7(${i}/${header.total})`)
					.textField(`Paste part ${i} of ${header.total}:`, "DW1:...");

				const partRes = await showForm(partForm, player);
				if (partRes.canceled || !partRes.formValues) {
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
			await this.showCaptureResult(player, schematic);
		} catch (e) {
			log.error(`Decode failed for ${player.name}:`, e);
			player.sendMessage(`§cFailed to decode schematic: ${e}`);
		}
	}

	static async showMaterialList(
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

	private static async confirmPlace(
		player: Player,
		schematic: Schematic,
	): Promise<void> {
		const total = schematic.getTotalNonAir();
		const form = new MessageFormData()
			.title("§l§dConfirm Placement")
			.body(`Place §f${formatCount(total)}§r blocks at your current position?`)
			.button1("Cancel")
			.button2("Place");

		const res = await showForm(form, player);
		if (res.canceled || res.selection !== 1) return;

		const origin = Vec3.from(player.location).floor();
		const session = new PlacementSession(schematic, origin, player.dimension);
		const placed = await session.place();
		log.info(`${player.name} placed ${placed} blocks`);
		player.sendMessage(`§aPlaced ${formatCount(placed)} blocks.`);
	}

	private static async confirmPreview(
		player: Player,
		schematic: Schematic,
	): Promise<void> {
		const total = schematic.getTotalNonAir();
		const form = new MessageFormData()
			.title("§l§dPreview Placement")
			.body(
				`Preview §f${formatCount(total)}§r blocks at your current position?\n§7Blocks will revert after 10 seconds.`,
			)
			.button1("Cancel")
			.button2("Preview");

		const res = await showForm(form, player);
		if (res.canceled || res.selection !== 1) return;

		const origin = Vec3.from(player.location).floor();
		const session = new PlacementSession(schematic, origin, player.dimension);
		const placed = await session.preview();
		log.info(`${player.name} previewing ${placed} blocks`);
		player.sendMessage(
			`§aPreview: ${formatCount(placed)} blocks. §7Reverting in 10s...`,
		);
	}
}

//#endregion
