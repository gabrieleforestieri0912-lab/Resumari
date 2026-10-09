/**
 * Costanti condivise delle API key.
 *
 * Modulo senza import server-only (`@/lib/supabase`, `@/lib/db`): può essere
 * importato sia dalle route sia dai componenti client, così la pagina
 * /api-keys mostra gli stessi limiti che il server applica davvero.
 */

/** Prefisso delle chiavi emesse: le identifica a colpo d'occhio nei log. */
export const KEY_PREFIX = 'rsm_live_'

/**
 * Numero massimo di chiavi attive per utente.
 * Applicato da `POST /api/keys` e mostrato nella pagina /api-keys.
 */
export const MAX_API_KEYS_PER_USER = 3
