import { createContext } from '@lit-labs/context';
import type { SubsonicClient } from '../sdk/subsonic';

/**
 * Subsonic Context
 * Used to provide the SubsonicClient throughout the application tree.
 */
export const subsonicContext = createContext<SubsonicClient | null>('subsonic');
