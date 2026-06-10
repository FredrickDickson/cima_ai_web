create table if not exists public.contract_clause_actions (
    id uuid default gen_random_uuid() primary key,
    analysis_id uuid references public.contract_analyses(id) on delete cascade not null,
    clause_name text not null,
    action_id text not null,
    result_text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(analysis_id, clause_name, action_id)
);

alter table public.contract_clause_actions enable row level security;

create policy "Users can manage their own clause actions" 
    on public.contract_clause_actions
    for all 
    using (
        exists (
            select 1 from public.contract_analyses ca 
            where ca.id = analysis_id 
            and ca.user_id = auth.uid()
        )
    );
