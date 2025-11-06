/**
 * Response compression and caching headers service
 * Implements request/response compression and optimal caching strategies
 */

import { gzip, deflate } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);

export interface CompressionOptions {
	enabled: boolean;
	threshold: number; // Minimum size in bytes to compress
	level: number; // Compression level (1-9)
	types: string[]; // MIME types to compress
}

export interface CacheOptions {
	maxAge: number; // Cache duration in seconds
	staleWhileRevalidate: number; // SWR duration in seconds
	mustRevalidate: boolean;
	public: boolean;
	immutable: boolean;
}

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
	enabled: true,
	threshold: 1024, // 1KB
	level: 6, // Balanced compression
	types: [
		'text/html',
		'text/css',
		'text/javascript',
		'application/javascript',
		'application/json',
		'text/xml',
		'application/xml',
		'text/plain',
		'image/svg+xml'
	]
};

const CACHE_STRATEGIES = {
	// Static assets (images, CSS, JS)
	static: {
		maxAge: 31536000, // 1 year
		staleWhileRevalidate: 86400, // 1 day
		mustRevalidate: false,
		public: true,
		immutable: true
	},
	// API responses
	api: {
		maxAge: 300, // 5 minutes
		staleWhileRevalidate: 60, // 1 minute
		mustRevalidate: true,
		public: false,
		immutable: false
	},
	// Club data (frequently accessed, changes infrequently)
	clubData: {
		maxAge: 3600, // 1 hour
		staleWhileRevalidate: 300, // 5 minutes
		mustRevalidate: false,
		public: true,
		immutable: false
	},
	// Dynamic content
	dynamic: {
		maxAge: 0,
		staleWhileRevalidate: 0,
		mustRevalidate: true,
		public: false,
		immutable: false
	}
} as const;

/**
 * Compression and caching service
 */
export class CompressionService {
	constructor(
		private compressionOptions: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
	) {}

	/**
	 * Compress response data if applicable
	 */
	async compressResponse(
		data: string | Buffer,
		acceptEncoding: string = '',
		contentType: string = 'text/html'
	): Promise<{
		data: Buffer;
		encoding?: string;
		originalSize: number;
		compressedSize: number;
		compressionRatio: number;
	}> {
		const originalData = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
		const originalSize = originalData.length;

		// Check if compression is enabled and data meets threshold
		if (!this.compressionOptions.enabled || 
			originalSize < this.compressionOptions.threshold ||
			!this.shouldCompress(contentType)) {
			return {
				data: originalData,
				originalSize,
				compressedSize: originalSize,
				compressionRatio: 1.0
			};
		}

		try {
			// Determine best compression method based on Accept-Encoding header
			const encoding = this.getBestEncoding(acceptEncoding);
			
			if (!encoding) {
				return {
					data: originalData,
					originalSize,
					compressedSize: originalSize,
					compressionRatio: 1.0
				};
			}

			let compressedData: Buffer;
			
			switch (encoding) {
				case 'gzip':
					compressedData = await gzipAsync(originalData, { 
						level: this.compressionOptions.level 
					});
					break;
				case 'deflate':
					compressedData = await deflateAsync(originalData, { 
						level: this.compressionOptions.level 
					});
					break;
				default:
					return {
						data: originalData,
						originalSize,
						compressedSize: originalSize,
						compressionRatio: 1.0
					};
			}

			const compressedSize = compressedData.length;
			const compressionRatio = originalSize / compressedSize;

			// Only use compression if it actually reduces size significantly
			if (compressionRatio < 1.1) {
				return {
					data: originalData,
					originalSize,
					compressedSize: originalSize,
					compressionRatio: 1.0
				};
			}

			return {
				data: compressedData,
				encoding,
				originalSize,
				compressedSize,
				compressionRatio
			};
		} catch (error) {
			console.error('Compression failed:', error);
			return {
				data: originalData,
				originalSize,
				compressedSize: originalSize,
				compressionRatio: 1.0
			};
		}
	}

	/**
	 * Generate cache headers based on content type and strategy
	 */
	generateCacheHeaders(
		strategy: keyof typeof CACHE_STRATEGIES,
		customOptions?: Partial<CacheOptions>
	): Record<string, string> {
		const options = { ...CACHE_STRATEGIES[strategy], ...customOptions };
		const headers: Record<string, string> = {};

		// Cache-Control header
		const cacheControlParts: string[] = [];
		
		if (options.public) {
			cacheControlParts.push('public');
		} else {
			cacheControlParts.push('private');
		}

		if (options.maxAge > 0) {
			cacheControlParts.push(`max-age=${options.maxAge}`);
		} else {
			cacheControlParts.push('no-cache');
		}

		if (options.staleWhileRevalidate > 0) {
			cacheControlParts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
		}

		if (options.mustRevalidate) {
			cacheControlParts.push('must-revalidate');
		}

		if (options.immutable) {
			cacheControlParts.push('immutable');
		}

		headers['Cache-Control'] = cacheControlParts.join(', ');

		// ETag for cache validation
		headers['ETag'] = this.generateETag();

		// Vary header for content negotiation
		headers['Vary'] = 'Accept-Encoding, Accept';

		return headers;
	}

	/**
	 * Generate cache headers for club data
	 */
	generateClubDataHeaders(lastModified?: Date): Record<string, string> {
		const headers = this.generateCacheHeaders('clubData');
		
		if (lastModified) {
			headers['Last-Modified'] = lastModified.toUTCString();
		}

		// Add specific headers for club data
		headers['X-Content-Type-Options'] = 'nosniff';
		headers['X-Frame-Options'] = 'DENY';
		
		return headers;
	}

	/**
	 * Generate cache headers for API responses
	 */
	generateApiHeaders(cacheable: boolean = true): Record<string, string> {
		const strategy = cacheable ? 'api' : 'dynamic';
		const headers = this.generateCacheHeaders(strategy);
		
		// Add API-specific headers
		headers['Content-Type'] = 'application/json; charset=utf-8';
		headers['X-Content-Type-Options'] = 'nosniff';
		
		return headers;
	}

	/**
	 * Generate cache headers for static assets
	 */
	generateStaticAssetHeaders(contentType: string): Record<string, string> {
		const headers = this.generateCacheHeaders('static');
		
		headers['Content-Type'] = contentType;
		
		// Add security headers for static assets
		if (contentType.startsWith('image/')) {
			headers['X-Content-Type-Options'] = 'nosniff';
		}
		
		return headers;
	}

	/**
	 * Check if request supports compression
	 */
	supportsCompression(acceptEncoding: string = ''): boolean {
		return this.getBestEncoding(acceptEncoding) !== null;
	}

	/**
	 * Get compression statistics
	 */
	getCompressionStats(): {
		enabled: boolean;
		threshold: number;
		supportedTypes: string[];
		supportedEncodings: string[];
	} {
		return {
			enabled: this.compressionOptions.enabled,
			threshold: this.compressionOptions.threshold,
			supportedTypes: [...this.compressionOptions.types],
			supportedEncodings: ['gzip', 'deflate']
		};
	}

	/**
	 * Check if content type should be compressed
	 */
	private shouldCompress(contentType: string): boolean {
		const baseType = contentType.split(';')[0].trim().toLowerCase();
		return this.compressionOptions.types.includes(baseType);
	}

	/**
	 * Get best compression encoding based on Accept-Encoding header
	 */
	private getBestEncoding(acceptEncoding: string): string | null {
		const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());
		
		// Prefer gzip over deflate
		if (encodings.some(e => e.includes('gzip'))) {
			return 'gzip';
		}
		
		if (encodings.some(e => e.includes('deflate'))) {
			return 'deflate';
		}
		
		return null;
	}

	/**
	 * Generate ETag for cache validation
	 */
	private generateETag(): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2);
		return `"${timestamp}-${random}"`;
	}
}

/**
 * Middleware function for SvelteKit to add compression and caching
 */
export function createCompressionMiddleware(options?: Partial<CompressionOptions>) {
	const service = new CompressionService(options ? { ...DEFAULT_COMPRESSION_OPTIONS, ...options } : undefined);
	
	return {
		service,
		
		/**
		 * Handle response compression and caching for SvelteKit
		 */
		async handleResponse(
			response: Response,
			request: Request,
			cacheStrategy: keyof typeof CACHE_STRATEGIES = 'dynamic'
		): Promise<Response> {
			const acceptEncoding = request.headers.get('accept-encoding') || '';
			const contentType = response.headers.get('content-type') || 'text/html';
			
			// Get response body
			const originalBody = await response.text();
			
			// Compress if applicable
			const compressionResult = await service.compressResponse(
				originalBody,
				acceptEncoding,
				contentType
			);
			
			// Generate cache headers
			const cacheHeaders = service.generateCacheHeaders(cacheStrategy);
			
			// Create new response with compression and caching
			const headers = new Headers(response.headers);
			
			// Add compression headers
			if (compressionResult.encoding) {
				headers.set('Content-Encoding', compressionResult.encoding);
			}
			headers.set('Content-Length', compressionResult.data.length.toString());
			
			// Add cache headers
			Object.entries(cacheHeaders).forEach(([key, value]) => {
				headers.set(key, value);
			});
			
			// Add performance headers
			headers.set('X-Compression-Ratio', compressionResult.compressionRatio.toFixed(2));
			headers.set('X-Original-Size', compressionResult.originalSize.toString());
			headers.set('X-Compressed-Size', compressionResult.compressedSize.toString());
			
			return new Response(compressionResult.data, {
				status: response.status,
				statusText: response.statusText,
				headers
			});
		}
	};
}

// Export default instance
export const compressionService = new CompressionService();