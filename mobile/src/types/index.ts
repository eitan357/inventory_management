export interface User {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  role: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Action {
  id: string;
  name: string;
  badge: string;
  statusPage: string;
}

export interface Signee {
  id: string;
  name: string;
  signeeId: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  nickname: string;
  related: string;
  pn: string;
  type: 'SN' | 'Generic';
  sortOrder: number | null;
}

export interface AppConfig {
  ACTION_NIPUK_ID: string;
  ACTION_ZIKUY_ID: string;
  ACTION_TRANSFER_ID: string;
  STATUS_ACTIVE_NAME: string;
  CATALOG_TYPE_SN: string;
  CATALOG_TYPE_GENERIC: string;
  TEAM_ROLE_MAIN: string;
  TEAM_ROLE_EXTERNAL: string;
  ACTION_BADGE_STORAGE: string;
  ACTION_BADGE_FAULTY: string;
}

export interface StartupData {
  authorized: boolean;
  user?: User;
  teams?: Team[];
  locations?: Location[];
  actions?: Action[];
  signees?: Signee[];
  catalog?: CatalogItem[];
  config?: AppConfig;
}

export interface InventoryRow {
  productId: string;
  productName: string;
  teamId: string;
  teamName: string;
  locationId: string;
  locationName: string;
  signeeId: string;
  signeeName: string;
  qty: number;
  actionId: string;
  actionName: string;
}

export interface TsReportItem {
  sn: string;
  teamId: string;
  signeeId: string;
  locationId: string;
  actionId: string;
  prevTeamId: string | null;
  prevSigneeId: string | null;
  date: string;
}
