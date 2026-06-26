/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlaceType = 'public' | 'private';

export interface CommentInterface {
  id: string;
  userId: string;
  userName: string;
  text: string;
  rating: number;
  createdAt: number;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: PlaceType;
  description: string;
  energyLevel?: number; // 0-100
  creator?: string;
  tags?: string[];
  createdAt: number;
  comments: CommentInterface[];
}

export interface UserSettings {
  showPublic: boolean;
  showPrivate: boolean;
  selectedPlaceId?: string;
}
