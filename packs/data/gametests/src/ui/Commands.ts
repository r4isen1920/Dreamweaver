import {
	Player,
	ItemStack,
	ItemLockMode,
	type ScriptEventCommandMessageAfterEvent,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { WAND_ITEM, WAND_NAME, SelectionManager } from "./Selection.js";
import { showMainMenu } from "./forms/MainMenu.js";
import { showImportForm } from "./forms/Import.js";
import { SystemScriptEventReceive } from "../utils/EventDecorators.js";
import LitematicaPELogger from "../utils/Logger.js";

const log = LitematicaPELogger.get("Commands");

//#region Constants

const NAMESPACE = "dw";

//#endregion

//#region Wand

export function giveWand(player: Player): void {
	const item = new ItemStack(WAND_ITEM);
	item.nameTag = WAND_NAME;
	item.lockMode = ItemLockMode.inventory;
	item.keepOnDeath = true;

	const inventory = player.getComponent("inventory");
	inventory?.container?.addItem(item);
	log.info(`${player.name} received LitematicaPE Wand`);
	player.sendMessage(
		"§dReceived LitematicaPE Wand! §7Right-click to set Pos1, break to set Pos2.",
	);
}

//#endregion

//#region Commands

export class CommandHandler {
	@SystemScriptEventReceive
	static onScriptEvent(ev: ScriptEventCommandMessageAfterEvent): void {
		if (!ev.id.startsWith(`${NAMESPACE}:`)) return;

		const player = ev.sourceEntity;
		if (!(player instanceof Player)) return;

		const cmd = ev.id.slice(NAMESPACE.length + 1);
		const args = ev.message.trim();

		log.info(`${player.name} executed command: ${cmd}${args ? ` ${args}` : ""}`);

		switch (cmd) {
			case "menu":
				showMainMenu(player);
				break;
			case "wand":
				giveWand(player);
				break;
			case "pos1":
				CommandHandler.setPos(player, 1, args);
				break;
			case "pos2":
				CommandHandler.setPos(player, 2, args);
				break;
			case "capture":
				showMainMenu(player);
				break;
			case "paste":
				showImportForm(player);
				break;
			case "cancel":
				CommandHandler.clearSelection(player);
				break;
			default:
				player.sendMessage(`§cUnknown command: ${cmd}`);
		}
	}

	//#endregion

	//#region Handlers

	private static setPos(player: Player, posNum: 1 | 2, args: string): void {
		const sel = SelectionManager.get(player);
		let pos: Vec3;

		if (args) {
			const parts = args.split(/\s+/).map(Number);
			if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
				pos = Vec3.from(parts[0], parts[1], parts[2]);
			} else {
				player.sendMessage("§cUsage: /scriptevent dw:pos1 <x> <y> <z>");
				return;
			}
		} else {
			pos = Vec3.from(player.location).floor();
		}

		if (posNum === 1) sel.pos1 = pos;
		else sel.pos2 = pos;

		player.sendMessage(
			`§dPos${posNum} §7set to §f${pos.x}, ${pos.y}, ${pos.z}`,
		);
	}

	private static clearSelection(player: Player): void {
		SelectionManager.get(player).clear();
		player.sendMessage("§7Selection cleared.");
	}
}

//#endregion
