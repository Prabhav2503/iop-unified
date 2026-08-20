// ─── Centralised React Query hooks ───────────────────────────────────────────
//
// Every useQuery call in the app goes through one of these hooks so that:
//   • Query keys are defined in a single place — renaming one here fixes all.
//   • Default transforms (extracting .data, surfacing .error as a string) are
//     applied consistently across pages.
//   • useMutation hooks invalidate the right keys on success, so any page that
//     reads from those keys automatically shows fresh data.
//
// Conventions
//   queryKey   — always an array: ['resource', ...params]
//   queryFn    — throws on error (the API helpers return { error } objects, so
//                we unwrap and re-throw here so React Query's retry/error logic
//                works correctly).
//   select     — extracts the data array so callers get a plain array, not
//                the raw response object.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllInitiatives, createInitiative, deleteInitiative } from '../API/initiative';
import { getAllTasks, createTask, deleteTask, updateTask } from '../API/task';
import { getAllTeamMembers, getTeamDropdown, getTeamMemberById, deleteTeamMember } from '../API/team';
import { getAllContacts, getVisibleContacts, createContact, deleteContact, toggleContactVisibility } from '../API/contact';
import { getAllStartups, createStartup, deleteStartup } from '../API/startup';
import { getAllDatabaseRecords, createDatabaseRecord, updateDatabaseRecord, deleteDatabaseRecord } from '../API/database';

// ─── Query key registry ───────────────────────────────────────────────────────

export const KEYS = {
  initiatives: ['initiatives'],
  tasks: ['tasks'],
  team: ['team'],
  teamDropdown: ['team-dropdown'],
  teamMember: (id) => ['team-member', id],
  contacts: ['contacts'],
  startups: ['startups'],
  databaseRecords: ['database-records'],
};

// Helper: unwrap the API response or throw so React Query sees an error.
function unwrap(res) {
  if (res.error) throw new Error(res.error);
  return res.data ?? [];
}

// ─── Initiatives ──────────────────────────────────────────────────────────────

export function useInitiatives() {
  return useQuery({
    queryKey: KEYS.initiatives,
    queryFn: () => getAllInitiatives().then(unwrap),
  });
}

export function useCreateInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      createInitiative(payload).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.initiatives }),
  });
}

export function useDeleteInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      deleteInitiative(id).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.initiatives }),
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function useTasks() {
  return useQuery({
    queryKey: KEYS.tasks,
    queryFn: () => getAllTasks().then(unwrap),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      createTask(payload).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tasks }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      deleteTask(id).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tasks }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) =>
      updateTask(id, updates).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tasks }),
  });
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export function useTeamMembers() {
  return useQuery({
    queryKey: KEYS.team,
    queryFn: () => getAllTeamMembers().then(unwrap),
  });
}

export function useTeamDropdown() {
  return useQuery({
    queryKey: KEYS.teamDropdown,
    queryFn: () => getTeamDropdown().then(unwrap),
  });
}

export function useTeamMemberById(id) {
  return useQuery({
    queryKey: KEYS.teamMember(id),
    queryFn: () => getTeamMemberById(id).then((r) => { if (r.error) throw new Error(r.error); return r.data; }),
    enabled: Boolean(id),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      deleteTeamMember(id).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.team });
      qc.invalidateQueries({ queryKey: KEYS.teamDropdown });
    },
  });
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export function useContacts() {
  return useQuery({
    queryKey: KEYS.contacts,
    queryFn: () => getAllContacts().then(unwrap),
  });
}

// Privileged users see all contacts; executives see only visible ones.
export function useContactsForRole(isPrivileged) {
  return useQuery({
    queryKey: [...KEYS.contacts, isPrivileged ? 'all' : 'visible'],
    queryFn: isPrivileged
      ? () => getAllContacts().then(unwrap)
      : () => getVisibleContacts().then(unwrap),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      createContact(payload).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contacts }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      deleteContact(id).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contacts }),
  });
}

export function useToggleContactVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVisible }) =>
      toggleContactVisibility(id, isVisible).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contacts }),
  });
}

// ─── Startups ─────────────────────────────────────────────────────────────────

export function useStartups() {
  return useQuery({
    queryKey: KEYS.startups,
    queryFn: () => getAllStartups().then(unwrap),
  });
}

export function useCreateStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      createStartup(payload).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.startups }),
  });
}

export function useDeleteStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      deleteStartup(id).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.startups }),
  });
}

// ─── Database Records ─────────────────────────────────────────────────────────

export function useDatabaseRecords() {
  return useQuery({
    queryKey: KEYS.databaseRecords,
    queryFn: () => getAllDatabaseRecords().then(unwrap),
  });
}

export function useCreateDatabaseRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      createDatabaseRecord(payload).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.databaseRecords }),
  });
}

export function useUpdateDatabaseRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) =>
      updateDatabaseRecord(id, updates).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.databaseRecords }),
  });
}

export function useDeleteDatabaseRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      deleteDatabaseRecord(id).then((r) => { if (r.error) throw new Error(r.error); return r; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.databaseRecords }),
  });
}
