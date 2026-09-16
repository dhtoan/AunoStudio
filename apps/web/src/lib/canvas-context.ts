export type BrowserCanvas = HTMLCanvasElement | OffscreenCanvas;
export type BrowserCanvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function getCanvas2DContext(
	canvas: BrowserCanvas,
	options?: CanvasRenderingContext2DSettings
): BrowserCanvas2DContext | null {
	// SAFETY: Both canvas implementations return their 2D context for the literal `2d` id.
	// TypeScript falls back to the broad RenderingContext overload when the receiver is a union.
	return canvas.getContext('2d', options) as BrowserCanvas2DContext | null;
}

export function getWebGL2Context(
	canvas: BrowserCanvas,
	options?: WebGLContextAttributes
): WebGL2RenderingContext | null {
	// SAFETY: Both canvas implementations return WebGL2RenderingContext for the literal `webgl2` id.
	return canvas.getContext('webgl2', options) as WebGL2RenderingContext | null;
}
