/**
 * Flat 2D schematic Google Maps styles for the OpenLawn Run Sheet reskin.
 * Intentionally top-down / plan-like — not 3D terrain or satellite.
 */
export const flatRunSheetMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#eef1e8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6550' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#eef1e8' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c5cdb8' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.fill',
    stylers: [{ color: '#e4e9dc' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#dce5d0' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ visibility: 'on' }, { color: '#cfdcb8' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c8d0bc' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#f3f5ee' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#b7c2a8' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c9d6cf' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7a8a80' }],
  },
];

export const flatRunSheetMapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: flatRunSheetMapStyles,
};
