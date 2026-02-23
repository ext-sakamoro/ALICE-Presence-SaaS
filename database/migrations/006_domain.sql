-- Presence SaaS domain tables
create table if not exists public.presence_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    channel text not null,
    status text not null default 'online' check (status in ('online', 'away', 'busy', 'offline')),
    metadata jsonb default '{}',
    client_ip inet,
    user_agent text,
    connected_at timestamptz default now(),
    last_heartbeat_at timestamptz default now(),
    disconnected_at timestamptz
);
create table if not exists public.presence_channels (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    max_occupancy integer default 1000,
    current_occupancy integer default 0,
    is_persistent boolean default false,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);
create table if not exists public.presence_events (
    id bigserial primary key,
    session_id uuid references public.presence_sessions(id) on delete cascade,
    channel text not null,
    event_type text not null check (event_type in ('join', 'leave', 'status_change', 'heartbeat', 'message')),
    payload jsonb default '{}',
    created_at timestamptz default now()
);
create index idx_presence_sessions_user on public.presence_sessions(user_id);
create index idx_presence_sessions_channel on public.presence_sessions(channel, status);
create index idx_presence_events_session on public.presence_events(session_id, created_at);
create index idx_presence_channels_name on public.presence_channels(name);
