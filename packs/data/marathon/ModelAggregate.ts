
// @ts-nocheck

import { join, relative } from '@std/path';
import { createLogger } from './utils/Logger.ts';
import { writeJsonFile } from './utils/Write.ts';



//#region CONFIG

const CONFIG = {
	gridSize: 4,
	cellSize: 16,
	sourceRelativePath: 'models/entity/holo/palette',
	outputRelativePath: 'models/entity/holo/aggregated',
	batchRelativePath: 'models/entity/holo/batch',
} as const;

const logger = createLogger('ModelAggregate');



//#region TYPES

type Vec3 = [number, number, number];

type JsonObject = Record<string, unknown>;

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface Cube extends JsonObject {
	origin: Vec3;
}

interface Bone extends JsonObject {
	name: string;
	parent?: string;
	cubes?: Cube[];
}

interface Geometry extends JsonObject {
	description?: JsonObject;
	bones: Bone[];
}

interface GeometryFile extends JsonObject {
	format_version: string;
	'minecraft:geometry': Geometry[];
}



//#region ENTRY

function main() {
	const rpRoot = resolveResourcePackRoot();
	const sourceDir = join(rpRoot, CONFIG.sourceRelativePath);

	ensureDirectoryExists(sourceDir, 'palette source directory');

	const sourceFiles = collectGeoFiles(sourceDir);
	if (sourceFiles.length === 0) {
		throw new Error(`No .geo.json files found in ${sourceDir}`);
	}

	const outputNameSet = new Set<string>();
	let totalGeometries = 0;

	logger.info(`Found ${sourceFiles.length} palette geometry files.`);

	for (const sourceFile of sourceFiles) {
		const sourceData = readGeometryFile(sourceFile);
		const sourceGeometry = getPrimaryGeometry(sourceData, sourceFile);
		const sourceRelativeFile = toPortablePath(relative(sourceDir, sourceFile));

		const outputName = buildOutputName(sourceRelativeFile);
		if (outputNameSet.has(outputName)) {
			throw new Error(`Output filename collision detected: ${outputName}`);
		}
		outputNameSet.add(outputName);

		const outputGeometries: Geometry[] = [];
		let sourceGeometryCount = 0;

		for (let x = 0; x < CONFIG.gridSize; x += 1) {
			for (let y = 0; y < CONFIG.gridSize; y += 1) {
				for (let z = 0; z < CONFIG.gridSize; z += 1) {
					const suffix = `${x}_${y}_${z}`;
					const offset: Vec3 = [x * CONFIG.cellSize, y * CONFIG.cellSize, z * CONFIG.cellSize];
					const outputBones = offsetBonesForCell(sourceGeometry.bones, offset, suffix, sourceFile);

					const outputGeometry: Geometry = {
						...sourceGeometry,
						description: {
							...(isObject(sourceGeometry.description) ? sourceGeometry.description : {}),
							identifier: buildInstanceIdentifier(sourceGeometry.description, x, y, z),
						},
						bones: outputBones,
					};

					outputGeometries.push(outputGeometry);
					sourceGeometryCount += 1;
					totalGeometries += 1;
				}
			}
		}

		const outputFile: GeometryFile = {
			format_version: sourceData.format_version,
			'minecraft:geometry': outputGeometries,
		};

		const outputTarget = `RP/${CONFIG.outputRelativePath}/${outputName}`;
		writeJsonFile(outputTarget, outputFile, logger);

		logger.info(`${sourceRelativeFile}: wrote ${sourceGeometryCount} geometries in ${outputName}`);

		const batchGeometry = buildBatchGeometry(sourceData, sourceGeometry, sourceFile);
		const batchFile: GeometryFile = {
			format_version: sourceData.format_version,
			'minecraft:geometry': [batchGeometry],
		};
		const batchTarget = `RP/${CONFIG.batchRelativePath}/${outputName}`;
		writeJsonFile(batchTarget, batchFile, logger);

		logger.info(`${sourceRelativeFile}: wrote batch geometry in ${outputName}`);
	}

	logger.info(
		`Completed ${totalGeometries} geometries into ${sourceFiles.length} output files with grid ${CONFIG.gridSize}x${CONFIG.gridSize}x${CONFIG.gridSize} at cell size ${CONFIG.cellSize}.`,
	);
}

main();



//#region BATCH

function buildBatchGeometry(sourceData: GeometryFile, sourceGeometry: Geometry, filePath: string): Geometry {
	const allBones: Bone[] = [];

	for (let x = 0; x < CONFIG.gridSize; x += 1) {
		for (let y = 0; y < CONFIG.gridSize; y += 1) {
			for (let z = 0; z < CONFIG.gridSize; z += 1) {
				const suffix = `${x}_${y}_${z}`;
				const offset: Vec3 = [x * CONFIG.cellSize, y * CONFIG.cellSize, -z * CONFIG.cellSize];
				const flatBone = flattenBonesForBatchCell(sourceGeometry.bones, offset, suffix);
				allBones.push(flatBone);
			}
		}
	}

	return {
		description: {
			...(isObject(sourceGeometry.description) ? sourceGeometry.description : {}),
			identifier: buildBatchIdentifier(sourceGeometry.description),
			visible_bounds_width: 10,
			visible_bounds_height: 6,
			visible_bounds_offset: [0, 2, 0],
		},
		bones: allBones,
	};
}

function buildBatchIdentifier(description: JsonObject | undefined): string {
	const identifier = isObject(description) ? description.identifier : undefined;
	if (typeof identifier === 'string' && identifier.length > 0) {
		return identifier.replace('.palette.', '.batch.');
	}
	return 'geometry.r4isen1920_litematicape.holo.batch';
}

function flattenBonesForBatchCell(sourceBones: Bone[], offset: Vec3, suffix: string): Bone {
	const allCubes: Cube[] = [];

	for (const bone of sourceBones) {
		if (!Array.isArray(bone.cubes)) continue;

		for (const cube of bone.cubes) {
			const origin = asVec3(cube.origin, `Invalid cube origin in batch flatten for bone '${bone.name}'`);
			allCubes.push({
				...cube,
				origin: [origin[0] + offset[0], origin[1] + offset[1], origin[2] + offset[2]],
			});
		}
	}

	return {
		name: `cube_${suffix}`,
		pivot: [0, 0, 0],
		cubes: allCubes,
	} as Bone;
}


//#region TRANSFORM

function offsetBonesForCell(sourceBones: Bone[], offset: Vec3, suffix: string, filePath: string): Bone[] {
	const sourceNames = new Set<string>();
	for (const sourceBone of sourceBones) {
		sourceNames.add(sourceBone.name);
	}

	for (const sourceBone of sourceBones) {
		if (typeof sourceBone.parent === 'string' && !sourceNames.has(sourceBone.parent)) {
			throw new Error(`Parent bone not found in source geometry ${filePath}: ${sourceBone.parent}`);
		}
	}

	const outputNames = new Set<string>();
	const outputBones = sourceBones.map((sourceBone, index) => offsetBone(sourceBone, offset, suffix, filePath, index));

	for (const bone of outputBones) {
		if (outputNames.has(bone.name)) {
			throw new Error(`Duplicate output bone name in ${filePath}: ${bone.name}`);
		}
		outputNames.add(bone.name);
	}

	for (const bone of outputBones) {
		if (typeof bone.parent === 'string' && !outputNames.has(bone.parent)) {
			throw new Error(`Parent bone not found after suffixing in ${filePath}: ${bone.parent}`);
		}
	}

	return outputBones;
}

function offsetBone(sourceBone: Bone, offset: Vec3, suffix: string, filePath: string, boneIndex: number): Bone {
	const duplicated = structuredClone(sourceBone) as Bone;

	if (typeof duplicated.name !== 'string' || duplicated.name.length === 0) {
		throw new Error(`Invalid bone name at index ${boneIndex} in ${filePath}`);
	}

	duplicated.name = `${duplicated.name}_${suffix}`;
	if (typeof duplicated.parent === 'string') {
		duplicated.parent = `${duplicated.parent}_${suffix}`;
	}

	if (Array.isArray(duplicated.cubes)) {
		duplicated.cubes = duplicated.cubes.map((cube, cubeIndex) => offsetCubeOrigin(cube, offset, duplicated.name, cubeIndex, filePath));
	}

	return duplicated;
}

function offsetCubeOrigin(cube: Cube, offset: Vec3, boneName: string, cubeIndex: number, filePath: string): Cube {
	const origin = asVec3(cube.origin, `Invalid cube origin in ${filePath} bone '${boneName}' cube ${cubeIndex}`);

	return {
		...cube,
		origin: [origin[0] + offset[0], origin[1] + offset[1], origin[2] + offset[2]],
	};
}



//#region IO

function collectGeoFiles(directory: string): string[] {
	const files: string[] = [];

	for (const entry of Deno.readDirSync(directory)) {
		const fullPath = join(directory, entry.name);
		if (entry.isDirectory) {
			files.push(...collectGeoFiles(fullPath));
			continue;
		}

		if (entry.isFile && entry.name.endsWith('.geo.json')) {
			files.push(fullPath);
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
}

function readGeometryFile(filePath: string): GeometryFile {
	const content = Deno.readTextFileSync(filePath);

	let parsed: JsonValue;
	try {
		parsed = JSON.parse(content) as JsonValue;
	}
	catch (error) {
		throw new Error(`Failed to parse JSON at ${filePath}: ${(error as Error).message}`);
	}

	if (!isObject(parsed)) {
		throw new Error(`Geometry file must be a JSON object: ${filePath}`);
	}

	const formatVersion = parsed.format_version;
	const geometryList = parsed['minecraft:geometry'];

	if (typeof formatVersion !== 'string' || formatVersion.length === 0) {
		throw new Error(`Missing or invalid format_version in ${filePath}`);
	}

	if (!Array.isArray(geometryList)) {
		throw new Error(`Missing or invalid minecraft:geometry array in ${filePath}`);
	}

	return parsed as unknown as GeometryFile;
}

function getPrimaryGeometry(data: GeometryFile, filePath: string): Geometry {
	const geometry = data['minecraft:geometry'][0];
	if (!isObject(geometry)) {
		throw new Error(`Missing primary geometry object in ${filePath}`);
	}

	const bones = (geometry as Geometry).bones;
	if (!Array.isArray(bones)) {
		throw new Error(`Missing bones array in ${filePath}`);
	}

	for (const [index, bone] of bones.entries()) {
		if (!isObject(bone) || typeof (bone as Bone).name !== 'string' || (bone as Bone).name.length === 0) {
			throw new Error(`Invalid bone at index ${index} in ${filePath}`);
		}
	}

	return geometry as Geometry;
}



//#region UTILS

function resolveResourcePackRoot(): string {
	const marathonRpDir = Deno.env.get('MARATHON_RP_DIR');
	if (typeof marathonRpDir === 'string' && marathonRpDir.trim().length > 0) {
		return marathonRpDir;
	}

	const fallback = join(Deno.cwd(), 'packs', 'RP');
	logger.warn(`MARATHON_RP_DIR not set. Falling back to ${fallback}`);
	return fallback;
}

function ensureDirectoryExists(directory: string, label: string) {
	try {
		const stat = Deno.statSync(directory);
		if (!stat.isDirectory) {
			throw new Error();
		}
	}
	catch {
		throw new Error(`Missing ${label}: ${directory}`);
	}
}

function buildOutputName(sourceRelativeFile: string): string {
	const noExtension = sourceRelativeFile.replace(/\.geo\.json$/i, '');
	// const flattened = noExtension.replaceAll('/', '_').replaceAll('\\', '_');
	return `${noExtension}.geo.json`;
}

function buildInstanceIdentifier(description: JsonObject | undefined, x: number, y: number, z: number): string {
	const identifier = isObject(description) ? description.identifier : undefined;
	if (typeof identifier === 'string' && identifier.length > 0) {
		return `${identifier}.instance.${x}_${y}_${z}`;
	}

	return `geometry.r4isen1920_litematicape.holo.instance.${x}_${y}_${z}`;
}

function asVec3(value: unknown, errorMessage: string): Vec3 {
	if (!Array.isArray(value) || value.length !== 3) {
		throw new Error(errorMessage);
	}

	const [x, y, z] = value;
	if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
		throw new Error(errorMessage);
	}

	return [x, y, z];
}

function isObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPortablePath(path: string): string {
	return path.replaceAll('\\', '/');
}
