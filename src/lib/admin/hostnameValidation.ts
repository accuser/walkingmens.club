/**
 * Hostname validation and subdomain management utilities
 */

import type { D1Database } from '../database/types';

export interface HostnameValidationResult {
	valid: boolean;
	available: boolean;
	error?: string;
	suggestions?: string[];
}

export interface SubdomainStatus {
	hostname: string;
	configured: boolean;
	dnsStatus: 'active' | 'pending' | 'error' | 'unknown';
	lastChecked: Date;
	error?: string;
}

export interface DNSConfigurationGuide {
	hostname: string;
	recordType: 'CNAME' | 'A';
	name: string;
	value: string;
	instructions: string[];
}

export class HostnameValidationService {
	constructor(private db: D1Database) {}

	/**
	 * Validate hostname format and availability
	 */
	async validateHostname(hostname: string): Promise<HostnameValidationResult> {
		// Basic format validation
		const formatValidation = this.validateHostnameFormat(hostname);
		if (!formatValidation.valid) {
			return formatValidation;
		}

		// Check availability in database
		try {
			const existing = await this.db
				.prepare('SELECT id FROM clubs WHERE hostname = ?')
				.bind(hostname)
				.first<{ id: string }>();

			if (existing) {
				return {
					valid: true,
					available: false,
					error: 'Hostname is already in use',
					suggestions: this.generateHostnameSuggestions(hostname)
				};
			}

			return {
				valid: true,
				available: true
			};
		} catch (error) {
			console.error('Error checking hostname availability:', error);
			return {
				valid: true,
				available: false,
				error: 'Unable to check hostname availability'
			};
		}
	}

	/**
	 * Validate hostname format
	 */
	private validateHostnameFormat(hostname: string): HostnameValidationResult {
		// Remove protocol if present
		const cleanHostname = hostname.replace(/^https?:\/\//, '');

		// Basic validation rules
		if (!cleanHostname) {
			return {
				valid: false,
				available: false,
				error: 'Hostname cannot be empty'
			};
		}

		if (cleanHostname.length < 3) {
			return {
				valid: false,
				available: false,
				error: 'Hostname must be at least 3 characters long'
			};
		}

		if (cleanHostname.length > 63) {
			return {
				valid: false,
				available: false,
				error: 'Hostname cannot exceed 63 characters'
			};
		}

		// Check for valid characters (letters, numbers, hyphens)
		if (!/^[a-z0-9-]+$/i.test(cleanHostname)) {
			return {
				valid: false,
				available: false,
				error: 'Hostname can only contain letters, numbers, and hyphens'
			};
		}

		// Cannot start or end with hyphen
		if (cleanHostname.startsWith('-') || cleanHostname.endsWith('-')) {
			return {
				valid: false,
				available: false,
				error: 'Hostname cannot start or end with a hyphen'
			};
		}

		// Cannot contain consecutive hyphens
		if (cleanHostname.includes('--')) {
			return {
				valid: false,
				available: false,
				error: 'Hostname cannot contain consecutive hyphens'
			};
		}

		// Reserved hostnames
		const reserved = ['www', 'api', 'admin', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev'];
		if (reserved.includes(cleanHostname.toLowerCase())) {
			return {
				valid: false,
				available: false,
				error: 'This hostname is reserved and cannot be used'
			};
		}

		return {
			valid: true,
			available: true
		};
	}

	/**
	 * Generate hostname suggestions when the desired one is taken
	 */
	private generateHostnameSuggestions(hostname: string): string[] {
		const suggestions: string[] = [];
		const base = hostname.toLowerCase();

		// Add numeric suffixes
		for (let i = 1; i <= 5; i++) {
			suggestions.push(`${base}${i}`);
			suggestions.push(`${base}-${i}`);
		}

		// Add descriptive suffixes
		const suffixes = ['club', 'group', 'walkers', 'hiking', 'outdoor'];
		for (const suffix of suffixes) {
			suggestions.push(`${base}-${suffix}`);
		}

		// Add location-based suggestions if the base seems to be a location
		const locationSuffixes = ['north', 'south', 'east', 'west', 'central'];
		for (const suffix of locationSuffixes) {
			suggestions.push(`${base}-${suffix}`);
			suggestions.push(`${suffix}-${base}`);
		}

		return suggestions.slice(0, 8); // Return max 8 suggestions
	}

	/**
	 * Check subdomain DNS status
	 */
	async checkSubdomainStatus(hostname: string): Promise<SubdomainStatus> {
		try {
			// In a real implementation, this would check DNS records
			// For now, we'll simulate the check
			const fullDomain = `${hostname}.walkingmens.club`;

			// Simulate DNS lookup (in production, use DNS resolution)
			const configured = await this.simulateDNSCheck(fullDomain);

			return {
				hostname: fullDomain,
				configured,
				dnsStatus: configured ? 'active' : 'pending',
				lastChecked: new Date()
			};
		} catch (error) {
			console.error('Error checking subdomain status:', error);
			return {
				hostname: `${hostname}.walkingmens.club`,
				configured: false,
				dnsStatus: 'error',
				lastChecked: new Date(),
				error: 'Failed to check DNS status'
			};
		}
	}

	/**
	 * Generate DNS configuration guide
	 */
	generateDNSConfigurationGuide(hostname: string): DNSConfigurationGuide {
		const fullDomain = `${hostname}.walkingmens.club`;

		return {
			hostname: fullDomain,
			recordType: 'CNAME',
			name: hostname,
			value: 'walkingmens.club',
			instructions: [
				'1. Log in to your DNS provider (e.g., Cloudflare, Route 53, etc.)',
				`2. Create a new CNAME record with the following details:`,
				`   - Name: ${hostname}`,
				`   - Value: walkingmens.club`,
				`   - TTL: 300 (or Auto)`,
				'3. Save the record and wait for DNS propagation (usually 5-15 minutes)',
				'4. Test the subdomain by visiting the URL in your browser',
				'5. Contact support if you encounter any issues'
			]
		};
	}

	/**
	 * Get all configured subdomains with their status
	 */
	async getAllSubdomainStatuses(): Promise<SubdomainStatus[]> {
		try {
			const clubs = await this.db
				.prepare('SELECT hostname FROM clubs ORDER BY hostname')
				.all<{ hostname: string }>();

			if (!clubs.results) {
				return [];
			}

			const statuses: SubdomainStatus[] = [];

			for (const club of clubs.results) {
				const status = await this.checkSubdomainStatus(club.hostname);
				statuses.push(status);
			}

			return statuses;
		} catch (error) {
			console.error('Error getting subdomain statuses:', error);
			return [];
		}
	}

	/**
	 * Simulate DNS check (replace with real DNS resolution in production)
	 */
	private async simulateDNSCheck(domain: string): Promise<boolean> {
		// In production, this would use DNS resolution
		// For demo purposes, we'll simulate based on some criteria

		// Simulate that some domains are configured
		const configuredDomains = ['delabole.walkingmens.club', 'test.walkingmens.club'];
		return configuredDomains.includes(domain);
	}
}
