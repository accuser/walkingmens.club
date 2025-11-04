import { error } from '@sveltejs/kit';
import { getClubByHostname } from '$lib/clubs';
import type { PageServerLoad } from './$types';
import QRCode from 'qrcode';

export const load: PageServerLoad = async ({ url }) => {
	const hostname = url.hostname;

	// Poster only works on subdomains, not the main landing page
	if (hostname === 'walkingmens.club' || hostname === 'localhost') {
		throw error(404, {
			message: 'Poster generation is only available for individual club pages'
		});
	}

	const club = getClubByHostname(hostname);

	if (!club) {
		throw error(404, {
			message: `No walking club found for ${hostname}`
		});
	}

	// Generate QR code as data URL
	const clubUrl = `https://${club.hostname}`;
	const qrCodeDataUrl = await QRCode.toDataURL(clubUrl, {
		width: 300,
		margin: 2,
		color: {
			dark: '#1e293b', // slate-900
			light: '#ffffff'
		}
	});

	return {
		club,
		qrCodeDataUrl,
		clubUrl
	};
};
