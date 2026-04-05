// @ts-nocheck

import { ensureDirSync } from '@std/fs';
import { join } from '@std/path';
import { createLogger } from './utils/Logger.ts';
import { writeJsonFile } from './utils/Write.ts';



//#region config

const CONFIG = {
	gridSize: 4,
	batchGeoRelativePath: 'models/entity/holo/batch/common',
	gametestsSrcPath: 'data/gametests/src/generated',
	cubeBoneNames: ['cube'],

	bitsPerMask: 16,
	maskProps: ['r4isen1920_litematicape:m0', 'r4isen1920_litematicape:m1', 'r4isen1920_litematicape:m2', 'r4isen1920_litematicape:m3'],
} as const;

const logger = createLogger('RenderControllerGen');



//#region entry

function main() {
	const textureNames = loadTextureList();
	if (textureNames.length === 0) {
		throw new Error('No texture names found in block_textures.json');
	}

	logger.info(`Found ${textureNames.length} block textures.`);

	const renderController = buildRenderController(textureNames);
	writeJsonFile('RP/render_controllers/r4isen1920_litematicape_batch.rc.json', renderController, logger);

	const textureIndex = buildTextureIndexTs(textureNames);
	writeTextureIndexFile(textureIndex);

	logger.info('Render controller and texture index generated.');
}

main();



//#region RENDER CONTROLLER

function buildRenderController(textureNames: string[]): Record<string, unknown> {
	const textureArray = textureNames.map((name) => `Texture.block.${name}`);
	const partVisibility = buildPartVisibility();

	return {
		format_version: '1.8.0',
		render_controllers: {
			'controller.render.r4isen1920_litematicape.batch.cube': {
				arrays: {
					textures: {
						'Array.block_textures': textureArray,
					},
				},
				geometry: 'Geometry.batch_cube',
				materials: [{ '*': 'Material.default' }],
				textures: ["Array.block_textures[q.property('r4isen1920_litematicape:tex')]"],
				part_visibility: [partVisibility],
				is_hurt_color: {},
				on_fire_color: {},
			},
		},
	};
}

function buildPartVisibility(): Record<string, string> {
	const visibility: Record<string, string> = {};
	const totalCells = CONFIG.gridSize ** 3;

	for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
		const x = cellIndex % CONFIG.gridSize;
		const z = Math.floor(cellIndex / CONFIG.gridSize) % CONFIG.gridSize;
		const y = Math.floor(cellIndex / (CONFIG.gridSize * CONFIG.gridSize));
		const suffix = `${x}_${y}_${z}`;

		const maskIndex = Math.floor(cellIndex / CONFIG.bitsPerMask);
		const bit = cellIndex % CONFIG.bitsPerMask;
		const maskProp = CONFIG.maskProps[maskIndex];

		const molang = bit === 0
			? `math.mod(q.property('${maskProp}'), 2)`
			: `math.mod(math.floor(q.property('${maskProp}') / ${2 ** bit}), 2)`;

		for (const boneName of CONFIG.cubeBoneNames) {
			visibility[`${boneName}_${suffix}`] = molang;
		}
	}

	return visibility;
}



//#region TEXTURE INDEX

function buildTextureIndexTs(textureNames: string[]): string {
	const lines = ['export const TEXTURE_INDEX: Record<string, number> = {'];

	for (let i = 0; i < textureNames.length; i += 1) {
		const comma = i < textureNames.length - 1 ? ',' : '';
		lines.push(`\t"${textureNames[i]}": ${i}${comma}`);
	}

	lines.push('};');
	lines.push('');
	return lines.join('\n');
}

function writeTextureIndexFile(content: string) {
	const scriptDir = import.meta.dirname!;
	const targetDir = join(scriptDir, '..', 'gametests', 'src', 'generated');

	ensureDirSync(targetDir);

	const targetFile = join(targetDir, 'TextureIndex.ts');
	logger.info(`Writing texture index to ${targetFile}...`);
	Deno.writeTextFileSync(targetFile, content);
}



//#region io

function loadTextureList(): string[] {
	const filePath = join(import.meta.dirname!, 'block_textures.json');
	const content = Deno.readTextFileSync(filePath);
	const names = JSON.parse(content) as string[];
	return names.sort((a, b) => a.localeCompare(b));
}
