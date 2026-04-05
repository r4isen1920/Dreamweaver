export interface Logger {
	info: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	error: (...args: unknown[]) => void;
}

function normalizePrefix(prefix: string): string {
	const trimmed = prefix.trim();
	if (trimmed.length === 0) {
		throw new Error('Logger prefix must not be empty.');
	}

	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		return trimmed;
	}

	return `[${trimmed}]`;
}

export function createLogger(prefix: string): Logger {
	const resolvedPrefix = normalizePrefix(prefix);

	return {
		info: (...args: unknown[]) => console.log(resolvedPrefix, ...args),
		warn: (...args: unknown[]) => console.warn(resolvedPrefix, ...args),
		error: (...args: unknown[]) => console.error(resolvedPrefix, ...args),
	};
}
