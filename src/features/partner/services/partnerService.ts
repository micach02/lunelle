import { FunctionsHttpError } from '@supabase/supabase-js';
import { mapIntimacyRecord } from '@/features/intimacy/services/intimacyService';
import { mapPeriod } from '@/features/periods/services/periodService';
import { mapSymptomLog } from '@/features/symptoms/services/symptomService';
import { getSupabase } from '@/lib/supabase';
import { UserFacingError } from '@/lib/errors';
import type { Json, TableRow } from '@/types/database';
import {
  SYMPTOM_KEYS,
  type IntimacyInput,
  type IntimacyRecord,
  type Period,
  type PeriodInput,
  type SymptomInput,
  type SymptomLog,
} from '@/types/domain';
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  type CycleSettingsInput,
} from '@/features/cycle/services/cycleCalculator';

/** What the owner chooses to share beyond cycle & periods (always included). */
export interface ShareScopes {
  symptoms: boolean;
  intimacy: boolean;
  notes: boolean;
  /** Partner may add and edit (never delete) records in the shared categories. */
  canEdit: boolean;
}

export type ShareStatus = 'pending' | 'accepted';

/** The owner's view of their own active share. */
export interface OutgoingShare {
  id: string;
  partnerEmail: string;
  status: ShareStatus;
  scopes: ShareScopes;
  invitedAt: string;
  acceptedAt: string | null;
  lastEmailedAt: string | null;
}

/** The partner's view of an invitation or accepted share. */
export interface IncomingShare {
  id: string;
  ownerName: string;
  status: ShareStatus;
  scopes: ShareScopes;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface SharedData {
  ownerName: string;
  scopes: ShareScopes;
  settings: CycleSettingsInput;
  periods: Period[];
  /** null when the owner does not share symptoms. */
  symptoms: SymptomLog[] | null;
  /** null when the owner does not share intimacy records. */
  intimacy: IntimacyRecord[] | null;
}

const OUTGOING_COLUMNS =
  'id, partner_email, status, share_symptoms, share_intimacy, share_notes, can_edit, created_at, accepted_at, last_emailed_at';

function mapOutgoing(
  row: Pick<
    TableRow<'partner_shares'>,
    | 'id'
    | 'partner_email'
    | 'status'
    | 'share_symptoms'
    | 'share_intimacy'
    | 'share_notes'
    | 'can_edit'
    | 'created_at'
    | 'accepted_at'
    | 'last_emailed_at'
  >,
): OutgoingShare {
  return {
    id: row.id,
    partnerEmail: row.partner_email,
    status: row.status === 'accepted' ? 'accepted' : 'pending',
    scopes: {
      symptoms: row.share_symptoms,
      intimacy: row.share_intimacy,
      notes: row.share_notes,
      canEdit: row.can_edit,
    },
    invitedAt: row.created_at,
    acceptedAt: row.accepted_at,
    lastEmailedAt: row.last_emailed_at,
  };
}

// -----------------------------------------------------------------------------
// Owner
// -----------------------------------------------------------------------------

export async function getOutgoingShare(): Promise<OutgoingShare | null> {
  const { data, error } = await getSupabase()
    .from('partner_shares')
    .select(OUTGOING_COLUMNS)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOutgoing(data) : null;
}

export async function createInvite(partnerEmail: string, scopes: ShareScopes): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_partner_invite', {
    p_partner_email: partnerEmail,
    p_share_symptoms: scopes.symptoms,
    p_share_intimacy: scopes.intimacy,
    p_share_notes: scopes.notes,
    p_can_edit: scopes.canEdit,
  });
  if (error) throw error;
  return data;
}

/** Ask the Edge Function to email the invitation. */
export async function sendInviteEmail(shareId: string): Promise<void> {
  const { error } = await getSupabase().functions.invoke('send-partner-invite', { body: { shareId } });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    let message: string | undefined;
    let code: string | undefined;
    try {
      const body = (await (error.context as Response).json()) as { message?: unknown; error?: unknown };
      if (typeof body.message === 'string') message = body.message;
      if (typeof body.error === 'string') code = body.error;
    } catch {
      /* fall through to the generic message */
    }
    throw new UserFacingError(message ?? 'We couldn’t send the invitation email. Please try again.', code);
  }
  throw new UserFacingError(
    'We couldn’t reach the email service. Check that the send-partner-invite function is deployed.',
  );
}

export async function updateShareScopes(shareId: string, scopes: ShareScopes): Promise<void> {
  const { error } = await getSupabase().rpc('update_partner_share', {
    p_share_id: shareId,
    p_share_symptoms: scopes.symptoms,
    p_share_intimacy: scopes.intimacy,
    p_share_notes: scopes.notes,
    p_can_edit: scopes.canEdit,
  });
  if (error) throw error;
}

export async function revokeShare(shareId: string): Promise<void> {
  const { error } = await getSupabase().rpc('revoke_partner_share', { p_share_id: shareId });
  if (error) throw error;
}

// -----------------------------------------------------------------------------
// Partner
// -----------------------------------------------------------------------------

export async function listIncomingShares(): Promise<IncomingShare[]> {
  const { data, error } = await getSupabase().rpc('get_partner_invitations');
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.status === 'pending' || row.status === 'accepted')
    .map((row) => ({
      id: row.share_id,
      ownerName: row.owner_name,
      status: row.status as ShareStatus,
      scopes: {
        symptoms: row.share_symptoms,
        intimacy: row.share_intimacy,
        notes: row.share_notes,
        canEdit: row.can_edit,
      },
      invitedAt: row.invited_at,
      acceptedAt: row.accepted_at,
    }));
}

export async function acceptShare(shareId: string): Promise<void> {
  const { error } = await getSupabase().rpc('accept_partner_invite', { p_share_id: shareId });
  if (error) throw error;
}

/** Decline a pending invitation, or stop viewing an accepted share. */
export async function leaveShare(shareId: string): Promise<void> {
  const { error } = await getSupabase().rpc('leave_partner_share', { p_share_id: shareId });
  if (error) throw error;
}

// -----------------------------------------------------------------------------
// Password-less partner sign-in
// -----------------------------------------------------------------------------

/** Link types the send-partner-* functions can produce. */
const SIGN_IN_LINK_TYPES = ['magiclink', 'signup', 'invite', 'email'] as const;
export type SignInLinkType = (typeof SIGN_IN_LINK_TYPES)[number];

export function isSignInLinkType(value: string | null): value is SignInLinkType {
  return value !== null && (SIGN_IN_LINK_TYPES as readonly string[]).includes(value);
}

/** Exchange the one-time token from a partner email link for a session. */
export async function verifySignInLink(tokenHash: string, type: SignInLinkType): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw error;
}

/**
 * Ask for a fresh sign-in link. The server always answers the same way so it
 * never reveals whether an address has access to anything.
 */
export async function requestSignInLink(email: string): Promise<void> {
  const { error } = await getSupabase().functions.invoke('send-partner-signin', {
    body: { email: email.trim().toLowerCase() },
  });
  if (error) {
    throw new UserFacingError('We couldn’t send a sign-in link right now. Please try again in a minute.');
  }
}

type JsonObject = { [key: string]: Json | undefined };

function asObject(value: Json | undefined): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value: Json | undefined): JsonObject[] {
  return Array.isArray(value) ? value.map((v) => asObject(v)) : [];
}

/** Parse the JSON returned by get_partner_shared_data into domain objects. */
export function parseSharedData(raw: Json): SharedData {
  const root = asObject(raw);
  const settings = asObject(root.settings);
  return {
    ownerName: typeof root.owner_name === 'string' ? root.owner_name : 'Your partner',
    scopes: {
      symptoms: root.share_symptoms === true,
      intimacy: root.share_intimacy === true,
      notes: root.share_notes === true,
      canEdit: root.can_edit === true,
    },
    settings: {
      averageCycleLength:
        typeof settings.average_cycle_length === 'number' ? settings.average_cycle_length : DEFAULT_CYCLE_LENGTH,
      averagePeriodLength:
        typeof settings.average_period_length === 'number' ? settings.average_period_length : DEFAULT_PERIOD_LENGTH,
    },
    periods: asArray(root.periods).map((p) =>
      mapPeriod({ id: String(p.id), start_date: String(p.start_date), end_date: (p.end_date as string | null) ?? null }),
    ),
    symptoms: Array.isArray(root.symptoms)
      ? asArray(root.symptoms).map((s) =>
          mapSymptomLog({
            id: String(s.id),
            symptom_date: String(s.symptom_date),
            symptoms: s.symptoms ?? [],
            mood: (s.mood as string | null) ?? null,
            notes: (s.notes as string | null) ?? null,
          }),
        )
      : null,
    intimacy: Array.isArray(root.intimacy)
      ? asArray(root.intimacy).map((i) =>
          mapIntimacyRecord({
            id: String(i.id),
            occurred_at: String(i.occurred_at),
            protection_method: String(i.protection_method),
            ejaculation: String(i.ejaculation),
            emergency_contraception: i.emergency_contraception === true,
            notes: (i.notes as string | null) ?? null,
          }),
        )
      : null,
  };
}

export async function getSharedData(shareId: string): Promise<SharedData> {
  const { data, error } = await getSupabase().rpc('get_partner_shared_data', { p_share_id: shareId });
  if (error) throw error;
  return parseSharedData(data);
}

// -----------------------------------------------------------------------------
// Partner edits (only when the owner allowed it; never deletes)
// -----------------------------------------------------------------------------

export async function partnerSavePeriod(shareId: string, input: PeriodInput, id?: string): Promise<void> {
  const { error } = await getSupabase().rpc('partner_save_period', {
    p_share_id: shareId,
    p_period_id: id ?? null,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
  });
  if (error) throw error;
}

export async function partnerSaveSymptoms(shareId: string, input: SymptomInput, id?: string): Promise<void> {
  const { error } = await getSupabase().rpc('partner_save_symptoms', {
    p_share_id: shareId,
    p_log_id: id ?? null,
    p_symptom_date: input.date,
    p_symptoms: SYMPTOM_KEYS.filter((k) => input.symptoms.includes(k)),
    p_mood: input.mood,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw error;
}

export async function partnerSaveIntimacy(shareId: string, input: IntimacyInput, id?: string): Promise<void> {
  const { error } = await getSupabase().rpc('partner_save_intimacy', {
    p_share_id: shareId,
    p_record_id: id ?? null,
    p_occurred_at: input.occurredAt,
    p_protection_method: input.protectionMethod,
    p_ejaculation: input.ejaculation,
    p_emergency_contraception: input.emergencyContraception,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw error;
}
