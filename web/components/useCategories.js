'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

let cache = null;

export function useCategories() {
  const [cats, setCats] = useState(cache || []);
  useEffect(() => {
    if (cache) return;
    api('/categories')
      .then((c) => {
        cache = c;
        setCats(c);
      })
      .catch(() => {});
  }, []);
  return cats;
}
