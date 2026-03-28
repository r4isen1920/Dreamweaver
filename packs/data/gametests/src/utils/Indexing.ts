import { Vec3 } from "@bedrock-oss/bedrock-boost";
import type { Vector3 } from "@minecraft/server";

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
