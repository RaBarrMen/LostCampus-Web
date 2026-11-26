'use client';
import { supabase } from './supabase';

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Todas las peticiones pasan por el api-gateway con el JWT del usuario
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let res;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const first = data?.details?.[0]?.mensaje;
    throw new ApiError(first || data?.error || 'Ocurrió un error', res.status, data?.details);
  }
  return data;
}

export const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== null && s.set(k, v));
  const str = s.toString();
  return str ? `?${str}` : '';
};
