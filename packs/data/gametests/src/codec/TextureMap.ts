import { TEXTURE_INDEX } from "../generated/TextureIndex.js";

//#region OVERRIDES

const BLOCK_TEXTURE_OVERRIDES: Record<string, string> = {
	"oak_planks": "planks_oak",
	"spruce_planks": "planks_spruce",
	"birch_planks": "planks_birch",
	"jungle_planks": "planks_jungle",
	"acacia_planks": "planks_acacia",
	"dark_oak_planks": "planks_big_oak",
	"grass_block": "grass_side",
	"podzol": "dirt_podzol_side",
	"mycelium": "mycelium_side",
	"crafting_table": "crafting_table_side",
	"furnace": "furnace_front_off",
	"blast_furnace": "blast_furnace_front_off",
	"smoker": "smoker_front_off",
	"bookshelf": "bookshelf",
	"tnt": "tnt_side",
	"pumpkin": "pumpkin_side",
	"carved_pumpkin": "pumpkin_face_off",
	"jack_o_lantern": "pumpkin_face_on",
	"melon_block": "melon_side",
	"hay_block": "hay_block_side",
	"bone_block": "bone_block_side",
	"quartz_block": "quartz_block_side",
	"quartz_pillar": "quartz_block_lines",
	"basalt": "basalt_side",
	"polished_basalt": "polished_basalt_side",
	"deepslate": "deepslate",
	"oak_log": "log_oak",
	"spruce_log": "log_spruce",
	"birch_log": "log_birch",
	"jungle_log": "log_jungle",
	"acacia_log": "log_acacia",
	"dark_oak_log": "log_big_oak",
	"crimson_stem": "crimson_log_side",
	"warped_stem": "warped_log_side",
	"stripped_oak_log": "stripped_oak_log",
	"stripped_spruce_log": "stripped_spruce_log",
	"stripped_birch_log": "stripped_birch_log",
	"stripped_jungle_log": "stripped_jungle_log",
	"stripped_acacia_log": "stripped_acacia_log",
	"stripped_dark_oak_log": "stripped_dark_oak_log",
};


//#region LOOKUP

export function getBlockTextureName(typeId: string): string {
	const shortId = typeId.startsWith("minecraft:") ? typeId.slice(10) : typeId;

	const override = BLOCK_TEXTURE_OVERRIDES[shortId];
	if (override !== undefined) return override;

	return shortId;
}

export function getBlockTextureIndex(typeId: string): number {
	const name = getBlockTextureName(typeId);
	const index = TEXTURE_INDEX[name];
	return index !== undefined ? index : 0;
}
