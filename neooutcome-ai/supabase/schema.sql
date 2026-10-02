-- NeoOutcome demo persistence only.
-- Do not import PhysioNet/PICDB or patient-level clinical data here.

create extension if not exists pgcrypto;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_ref text not null,
  patient_label text not null,
  scheduled_at timestamptz not null,
  appointment_type text not null,
  reason text not null,
  clinician_name text not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

revoke all on public.appointments from anon;
grant select, insert, update, delete on public.appointments to authenticated;

drop policy if exists "Clinicians manage their own appointments" on public.appointments;
create policy "Clinicians manage their own appointments"
  on public.appointments
  for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
