-- Table des dépenses
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade not null,
  payer_id uuid references auth.users(id) on delete cascade not null,
  debtor_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  created_at timestamptz default now() not null
);

-- Table des remboursements
create table if not exists reimbursements (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade not null,
  reimbursed_by uuid references auth.users(id) on delete cascade not null,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  created_at timestamptz default now() not null
);

-- RLS expenses
alter table expenses enable row level security;

create policy "Visible par payer ou debtor" on expenses
  for select using (
    auth.uid() = payer_id or auth.uid() = debtor_id
  );

create policy "Créé par l'utilisateur connecté" on expenses
  for insert with check (auth.uid() = created_by);

create policy "Suppression par créateur" on expenses
  for delete using (auth.uid() = created_by);

-- RLS reimbursements
alter table reimbursements enable row level security;

create policy "Visible si lié à une dépense accessible" on reimbursements
  for select using (
    exists (
      select 1 from expenses e
      where e.id = expense_id
        and (e.payer_id = auth.uid() or e.debtor_id = auth.uid())
    )
  );

create policy "Remboursement par le débiteur ou le créancier" on reimbursements
  for insert with check (
    auth.uid() = reimbursed_by and
    exists (
      select 1 from expenses e
      where e.id = expense_id
        and (e.payer_id = auth.uid() or e.debtor_id = auth.uid())
    )
  );
