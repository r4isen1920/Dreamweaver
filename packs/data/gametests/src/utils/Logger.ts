import { Logger as Log, LogLevel } from "@bedrock-oss/bedrock-boost";
import { OnWorldLoad } from "@bedrock-oss/stylish";

export default class LitematicaPELogger {
	private constructor() {}

	public static get(whatFor?: string): Log {
		const tags = new Set<string>();
		if (whatFor) {
			tags.add(whatFor);
		}
		return Log.getLogger("LitematicaPE", ...Array.from(tags));
	}

	@OnWorldLoad
	public static init() {
		Log.setTagsOutputVisibility(true);
		Log.setLevel(LogLevel.Debug);
	}
}
