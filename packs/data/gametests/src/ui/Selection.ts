import {
	Player,
	BlockVolume,
	type ItemStack,
	type PlayerInteractWithBlockBeforeEvent,
	type PlayerBreakBlockBeforeEvent,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import LitematicaPELogger from "../utils/Logger.js";
import {
	BeforePlayerInteractWithBlock,
	BeforePlayerBreakBlock,
} from "../utils/EventDecorators.js";

const log = LitematicaPELogger.get("Selection");

//#region Constants

export const WAND_ITEM = "minecraft:stick";
export const WAND_NAME = "§dLitematicaPE Wand";
const VOLUME_WARN = 262_144; // 64³

//#endregion

//#region Selection

export class Selection {
	pos1?: Vec3;
	pos2?: Vec3;

	isComplete(): boolean {
		return this.pos1 !== undefined && this.pos2 !== undefined;
	}

	getVolume(): BlockVolume | undefined {
		if (!this.pos1 || !this.pos2) return undefined;
		return new BlockVolume(this.pos1, this.pos2);
	}

	getBlockCount(): number {
		return this.getVolume()?.getCapacity() ?? 0;
	}

	clear(): void {
		this.pos1 = undefined;
		this.pos2 = undefined;
	}
}

//#endregion

//#region Helpers

function isWandItem(item?: ItemStack): boolean {
	return item?.typeId === WAND_ITEM && item?.nameTag === WAND_NAME;
}

function isWandHeld(player: Player): boolean {
	const item = player
		.getComponent("inventory")
		?.container?.getItem(player.selectedSlotIndex);
	return isWandItem(item);
}

//#endregion

//#region Manager

export class SelectionManager {
	private static selections = new Map<string, Selection>();

	static get(player: Player): Selection {
		let sel = this.selections.get(player.id);
		if (!sel) {
			sel = new Selection();
			this.selections.set(player.id, sel);
		}
		return sel;
	}

	@BeforePlayerInteractWithBlock
	static onWandInteract(ev: PlayerInteractWithBlockBeforeEvent): void {
		if (!isWandItem(ev.itemStack)) return;

		ev.cancel = true;
		const pos = Vec3.from(ev.block.location);
		const sel = SelectionManager.get(ev.player);
		sel.pos1 = pos;

		log.info(`${ev.player.name} set pos1 to ${pos.toString('short')}`);
		ev.player.sendMessage(`§dPos1 §7set to §f${pos.toString('short')}`);
		SelectionManager.showSelectionInfo(ev.player, sel);
	}

	@BeforePlayerBreakBlock
	static onWandBreak(ev: PlayerBreakBlockBeforeEvent): void {
		if (!isWandHeld(ev.player)) return;

		ev.cancel = true;
		const pos = Vec3.from(ev.block.location);
		const sel = SelectionManager.get(ev.player);
		sel.pos2 = pos;

		log.info(`${ev.player.name} set pos2 to ${pos.toString('short')}`);
		ev.player.sendMessage(`§dPos2 §7set to §f${pos.toString('short')}`);
		SelectionManager.showSelectionInfo(ev.player, sel);
	}

	private static showSelectionInfo(player: Player, sel: Selection): void {
		if (!sel.isComplete()) return;

		const vol = sel.getVolume()!;
		const span = vol.getSpan();
		const count = vol.getCapacity();

		let msg = `§7Selection: §f${span.x}§7x§f${span.y}§7x§f${span.z} §7(${count} blocks)`;
		if (count > VOLUME_WARN) {
			msg += `\n§eWarning: Large selection (>${VOLUME_WARN} blocks). Capture may be slow.`;
		}
		player.sendMessage(msg);
	}
}

//#endregion
