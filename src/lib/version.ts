/**
 * Application Semantic Versioning
 * Format: MAJOR.MINOR.PATCH (SemVer 2.0.0)
 * 
 * - MAJOR: Incompatible updates or foundational redesigns
 * - MINOR: Backward-compatible functionality additions (e.g. Rich Text Editor, Novu Notifications)
 * - PATCH: Backward-compatible bug fixes and adjustments
 */

export const APP_VERSION = '1.1.0';

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  releaseName: string;
  releaseDate: string;
}

export const APP_VERSION_INFO: VersionInfo = {
  version: APP_VERSION,
  major: 1,
  minor: 1,
  patch: 0,
  releaseName: 'Rich Text & Novu Notifications Release',
  releaseDate: '2026-10-10',
};
