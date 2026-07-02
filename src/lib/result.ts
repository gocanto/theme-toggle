/** A successful or failed operation result. */
export type Result<T, E extends Error> = { readonly _tag: 'ok'; readonly value: T } | { readonly _tag: 'err'; readonly error: E };

/** Build a successful result. */
export function ok<T>(value: T): Result<T, never> {
	return { _tag: 'ok', value };
}

/** Build a failed result. */
export function err<E extends Error>(error: E): Result<never, E> {
	return { _tag: 'err', error };
}
