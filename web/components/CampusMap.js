'use client';
// Mapa del campus con Leaflet. Se carga solo en el navegador (ver MapLoader.js).
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { MapContainer, Marker, Popup, Rectangle, TileLayer, useMapEvents } from 'react-leaflet';
import { BOUNDS, CENTER, inCampus } from '@/lib/campus';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; OpenStreetMap contributors';
const campusRect = [
  [BOUNDS.minLat, BOUNDS.minLng],
  [BOUNDS.maxLat, BOUNDS.maxLng],
];

const pin = (color) =>
  L.divIcon({
    className: '',
    html: `<div class="lc-pin" style="color:${color}"><span style="background:${color}"></span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });

const ICONS = { perdido: pin('#e5484d'), encontrado: pin('#12a150'), nuevo: pin('#f5a524') };

function Base({ children, height = 520, zoom = 17, center }) {
  return (
    <MapContainer
      center={center || [CENTER.lat, CENTER.lng]}
      zoom={zoom}
      minZoom={15}
      maxBounds={[
        [BOUNDS.minLat - 0.01, BOUNDS.minLng - 0.01],
        [BOUNDS.maxLat + 0.01, BOUNDS.maxLng + 0.01],
      ]}
      scrollWheelZoom
      style={{ height, width: '100%' }}
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <Rectangle bounds={campusRect} pathOptions={{ color: '#1d2b53', weight: 1.5, dashArray: '6 6', fillOpacity: 0.03 }} />
      {children}
    </MapContainer>
  );
}

// Mapa con todos los reportes
export function ItemsMap({ items, height }) {
  return (
    <Base height={height}>
      {items
        .filter((i) => typeof i.lat === 'number')
        .map((i) => (
          <Marker key={i.id} position={[i.lat, i.lng]} icon={ICONS[i.tipo]}>
            <Popup>
              <div className="w-48">
                {i.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image_url} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
                )}
                <p className="text-[11px] font-bold uppercase" style={{ color: i.tipo === 'perdido' ? '#e5484d' : '#12a150' }}>
                  {i.tipo}
                </p>
                <p className="font-semibold">{i.titulo}</p>
                <p className="text-xs opacity-70">{i.zona}</p>
                <Link href={`/objeto/${i.id}`} className="mt-1 inline-block text-xs font-bold underline">
                  Ver detalle
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
    </Base>
  );
}

// Mapa con un solo punto (detalle)
export function SinglePinMap({ item, height = 240 }) {
  if (typeof item.lat !== 'number') return null;
  return (
    <Base height={height} zoom={18} center={[item.lat, item.lng]}>
      <Marker position={[item.lat, item.lng]} icon={ICONS[item.tipo]} />
    </Base>
  );
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      if (inCampus(e.latlng.lat, e.latlng.lng)) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Selector de ubicación para el formulario de reporte
export function LocationPicker({ value, onChange, height = 300 }) {
  return (
    <Base height={height}>
      <ClickHandler onPick={onChange} />
      {value && <Marker position={[value.lat, value.lng]} icon={ICONS.nuevo} />}
    </Base>
  );
}
