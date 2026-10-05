import { BUSINESS_CONFIG } from './constants/site';

const directionsUrl = new URL('https://www.google.fr/maps/dir/');
const destination = `${BUSINESS_CONFIG.geo.latitude},${BUSINESS_CONFIG.geo.longitude}`;

directionsUrl.searchParams.set('api', '1');
directionsUrl.searchParams.set('destination', destination);
directionsUrl.searchParams.set('travelmode', 'driving');

export const CABINET_DIRECTIONS_URL = directionsUrl.toString();
