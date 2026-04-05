import type { BlockStates } from "./Schematic.js";

export const CUBE_SHAPE = "cube";

//#region SHAPE SETS

const EXACT_MATCHES: Record<string, string> = {
	"minecraft:chest": "chest",
	"minecraft:trapped_chest": "chest",
	"minecraft:ender_chest": "chest",
	"minecraft:torch": "torch",
	"minecraft:soul_torch": "torch",
	"minecraft:redstone_torch": "torch",
	"minecraft:vine": "vine",
	"minecraft:glow_lichen": "vine",
	"minecraft:sculk_vein": "vine",
};

const SUFFIX_RULES: [string, string][] = [
	["_slab", "slab"],
	["_stairs", "stair"],
	["_wall", "wall"],
	["_fence", "fence"],
	["_fence_gate", "cube"],
	["_sign", "sign"],
	["_hanging_sign", "sign"],
];


//#region LOOKUP

export function getBlockShape(typeId: string, _states?: BlockStates): string {
	const exact = EXACT_MATCHES[typeId];
	if (exact !== undefined) return exact;

	for (const [suffix, shape] of SUFFIX_RULES) {
		if (typeId.endsWith(suffix)) return shape;
	}

	return CUBE_SHAPE;
}
