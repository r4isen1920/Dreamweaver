import {
	BlockVolume,
	ItemStack,
	ItemLockMode,
	Player,
	type Vector3,
} from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";

//#region Constants

export const NAMESPACE = "dw";
export const WAND_ITEM = "minecraft:stick";
export const WAND_NAME = "§dDreamweaver Wand";
export const VOLUME_WARN = 262_144; // 64³
export const PREVIEW_TICKS = 200; // 10 seconds

//#endregion

//#region Wand

export function giveWand(player: Player): void {
	const item = new ItemStack(WAND_ITEM);
	item.nameTag = WAND_NAME;
	item.lockMode = ItemLockMode.inventory;
	item.keepOnDeath = true;

	const inventory = player.getComponent("inventory");
	inventory?.container?.addItem(item);
	player.sendMessage(
		"§dReceived Dreamweaver Wand! §7Right-click to set Pos1, break to set Pos2.",
	);
}

//#endregion

//#region Volume

export function makeVolume(a: Vector3, b: Vector3): BlockVolume {
	return new BlockVolume(a, b);
}

//#endregion

//#region Indexing

export function posToIndex(pos: Vector3, size: Vector3): number {
	return pos.y * size.x * size.z + pos.z * size.x + pos.x;
}

export function indexToPos(index: number, size: Vector3): Vec3 {
	const y = Math.floor(index / (size.x * size.z));
	const rem = index % (size.x * size.z);
	const z = Math.floor(rem / size.x);
	const x = rem % size.x;
	return Vec3.from(x, y, z);
}

//#endregion

//#region Formatting

export function vec3String(v: Vector3): string {
	return `${v.x}, ${v.y}, ${v.z}`;
}

export function formatCount(n: number): string {
	return n.toLocaleString();
}

//#endregion
