import type { Player } from "@minecraft/server";

//#region Progress Bar

const BAR_LENGTH = 20;

export function getProgressBar(current: number, total: number): string {
	const progress = Math.max(0, Math.min(1, current / total));
	const filled = Math.round(BAR_LENGTH * progress);
	const bar =
		"§ao".repeat(filled) + "§8-".repeat(BAR_LENGTH - filled);
	return `§7[§r§l${bar}§r§7]§r ${Math.round(progress * 100)}%`;
}

export function showActionBarProgress(
	player: Player,
	label: string,
	current: number,
	total: number,
): void {
	player.onScreenDisplay.setActionBar(
		`${label}\n  ${getProgressBar(current, total)}`,
	);
}

export function clearActionBar(player: Player): void {
	player.onScreenDisplay.setActionBar("");
}

//#endregion
