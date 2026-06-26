/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Place } from './types';

export const KNOWN_PLACES: Place[] = [
  {
    id: 'stonehenge',
    name: 'Стоунхендж',
    lat: 51.1789,
    lng: -1.8262,
    type: 'public',
    description: 'Древний мегалитический памятник, считающийся одним из самых мощных энергетических центров Земли.',
    energyLevel: 95,
    creator: 'System',
    tags: ['археология', 'ритуалы', 'мегалит'],
    createdAt: Date.now(),
    comments: [],
  },
  {
    id: 'pyramids-giza',
    name: 'Пирамиды Гизы',
    lat: 29.9792,
    lng: 31.1342,
    type: 'public',
    description: 'Величественные пирамиды, связанные с сакральной геометрией и космическими энергиями.',
    energyLevel: 98,
    creator: 'System',
    tags: ['пирамиды', 'история', 'геометрия'],
    createdAt: Date.now(),
    comments: [],
  },
  {
    id: 'mount-kailash',
    name: 'Гора Кайлас',
    lat: 31.0675,
    lng: 81.3119,
    type: 'public',
    description: 'Священная вершина, центр вселенной в нескольких религиях. Вершина мира.',
    energyLevel: 100,
    creator: 'System',
    tags: ['святыня', 'горы', 'духовность'],
    createdAt: Date.now(),
    comments: [],
  },
  {
    id: 'belukha-mountain',
    name: 'Гора Белуха',
    lat: 49.8078,
    lng: 86.5897,
    type: 'public',
    description: 'Высшая точка Алтая, "пуп Земли". Считается входом в мифическую Шамбалу.',
    energyLevel: 92,
    creator: 'System',
    tags: ['Алтай', 'Шамбала', 'природа'],
    createdAt: Date.now(),
    comments: [],
  },
  {
    id: 'machu-picchu',
    name: 'Мачу-Пикчу',
    lat: -13.1631,
    lng: -72.5450,
    type: 'public',
    description: 'Затерянный город инков, пропитанный энергией предков и величественных гор.',
    energyLevel: 90,
    creator: 'System',
    tags: ['инки', 'археология', 'высокогорье'],
    createdAt: Date.now(),
    comments: [],
  }
];
