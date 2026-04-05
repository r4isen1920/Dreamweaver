// @ts-nocheck

import { join } from '@std/path';
import { createLogger } from './utils/Logger.ts';
import { writeJsonFile } from './utils/Write.ts';



//#region config

const CONFIG = {
	batchGeometryId: 'geometry.dreamweaver.holo.batch.common.cube',
} as const;

const logger = createLogger('ClientEntity');



//#region entry

function main() {
	const textureNames = loadTextureList();
	if (textureNames.length === 0) {
		throw new Error('No texture names found in block_textures.json');
	}

	logger.info(`Found ${textureNames.length} block textures.`);

	const clientEntity = buildClientEntity(textureNames);
	writeJsonFile('RP/entity/dreamweaver/hologram_batch.ce.json', clientEntity, logger);

	logger.info('Batch client entity generated.');
}

main();



//#region BUILD

function buildClientEntity(textureNames: string[]): Record<string, unknown> {
	const textures: Record<string, string> = {
		default: 'textures/entity/armor_stand',
	};

	for (const name of textureNames) {
		textures[`block.${name}`] = `textures/blocks/${name}`;
	}

	return {
		format_version: '1.26.0',
		'minecraft:client_entity': {
			description: {
				identifier: 'dreamweaver:hologram_batch',
				materials: {
					default: 'entity_alphatest',
				},
				geometry: {
					batch_cube: CONFIG.batchGeometryId,
				},
				textures,
				scripts: {
					animate: ['root'],
					should_update_bones_and_effects_offscreen: true,
				},
				animations: {
					root: 'animation.dreamweaver.hologram_batch',
				},
				render_controllers: [
					'controller.render.dreamweaver.batch.cube',
				],
			},
		},
	};
}



//#region io

function loadTextureList(): string[] {
	const filePath = join(import.meta.dirname!, 'block_textures.json');
	const content = Deno.readTextFileSync(filePath);
	const names = JSON.parse(content) as string[];
	return names.sort((a, b) => a.localeCompare(b));
}
