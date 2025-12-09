export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  home_address_text: string | null;
}

export interface PlannedRoute {
  id: string;
  user_id: string;
  origin_text: string;
  destination_text: string;
  scheduled_date: string; // ISO String
  avoid_risky_zones: boolean;
}

export interface FavoritePlace {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address_text?: string;
}

export interface RouteHistoryItem {
  id: string;
  user_id: string;
  origin_text: string;
  destination_text: string;
  status: 'safe' | 'warning' | 'danger';
  duration_minutes: number;
  traveled_at: string; // Fecha formateada o ISO
}