'use client';
import dynamic from 'next/dynamic';

const loading = () => <div className="size-full min-h-60 animate-pulse rounded-2xl bg-surface-2" />;

// Leaflet usa "window", por eso se importa sin renderizado en servidor
export const ItemsMap = dynamic(() => import('./CampusMap').then((m) => m.ItemsMap), { ssr: false, loading });
export const SinglePinMap = dynamic(() => import('./CampusMap').then((m) => m.SinglePinMap), { ssr: false, loading });
export const LocationPicker = dynamic(() => import('./CampusMap').then((m) => m.LocationPicker), { ssr: false, loading });
