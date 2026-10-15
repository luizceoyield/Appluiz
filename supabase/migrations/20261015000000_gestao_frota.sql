-- =====================================================================
-- Gestão de Frota e Reservas Antecipadas — Sicoob Centro
-- Execute este arquivo inteiro no Supabase: SQL Editor > New query > Run
--
-- Garantias implementadas NO BANCO (valem mesmo que o app tenha bug):
--   1. Impossível gravar duas reservas sobrepostas para o mesmo veículo
--      (constraint EXCLUDE: início < fim_existente E fim > início_existente).
--   2. Impossível apagar fisicamente qualquer registro (DELETE e TRUNCATE
--      bloqueados por trigger, sem permissão de DELETE para o app).
--      Exclusões são "desativações"; reservas são "canceladas".
--   3. Toda inclusão/alteração é copiada para a tabela "auditoria",
--      que é somente-inserção (histórico completo, inclusive valores antigos).
--   4. KM rodados = KM final - KM inicial, calculado pelo próprio banco.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.motoristas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(trim(nome)) > 0),
  cargo         text not null check (length(trim(cargo)) > 0),
  telefone      text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.veiculos (
  id            uuid primary key default gen_random_uuid(),
  placa         text not null unique check (length(trim(placa)) > 0),
  modelo        text not null check (length(trim(modelo)) > 0),
  marca         text,
  ano           integer check (ano is null or ano between 1950 and 2100),
  cor           text not null default '#00AE9D', -- cor usada no calendário
  km_atual      numeric(10,1) not null default 0 check (km_atual >= 0),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.reservas (
  id            uuid primary key default gen_random_uuid(),
  veiculo_id    uuid not null references public.veiculos(id) on delete restrict,
  motorista_id  uuid not null references public.motoristas(id) on delete restrict,
  inicio        timestamptz not null,
  fim           timestamptz not null,
  km_inicial    numeric(10,1) not null check (km_inicial >= 0),
  km_final      numeric(10,1),
  km_rodados    numeric(10,1) generated always as (km_final - km_inicial) stored,
  destino       text,
  finalidade    text,
  status        text not null default 'agendada'
                check (status in ('agendada', 'concluida', 'cancelada')),
  concluida_em  timestamptz,
  cancelada_em  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint reservas_fim_depois_inicio check (fim > inicio),
  constraint reservas_km_final_valido check (km_final is null or km_final >= km_inicial),
  constraint reservas_concluida_tem_km check (status <> 'concluida' or km_final is not null),

  -- BLOQUEIO REAL DE DOUBLE-BOOKING.
  -- Intervalo '[)' => uma reserva que termina às 10:00 não conflita com
  -- outra que começa às 10:00. Reservas canceladas não ocupam o veículo.
  constraint reservas_sem_conflito exclude using gist (
    veiculo_id with =,
    tstzrange(inicio, fim, '[)') with &&
  ) where (status <> 'cancelada')
);

create index if not exists reservas_inicio_idx on public.reservas (inicio);
create index if not exists reservas_status_idx on public.reservas (status);

create table if not exists public.auditoria (
  id             bigserial primary key,
  tabela         text not null,
  operacao       text not null,
  registro_id    uuid,
  dados_antigos  jsonb,
  dados_novos    jsonb,
  em             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Funções e triggers
-- ---------------------------------------------------------------------
create or replace function public.fn_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.fn_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.auditoria (tabela, operacao, registro_id, dados_novos)
    values (tg_table_name, tg_op, new.id, to_jsonb(new));
  else
    insert into public.auditoria (tabela, operacao, registro_id, dados_antigos, dados_novos)
    values (tg_table_name, tg_op, new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end $$;

create or replace function public.fn_bloquear_exclusao()
returns trigger language plpgsql as $$
begin
  raise exception 'Exclusão de dados não é permitida em %. Use desativar/cancelar.', tg_table_name
    using errcode = 'P0001';
end $$;

create or replace function public.fn_bloquear_alteracao_auditoria()
returns trigger language plpgsql as $$
begin
  raise exception 'A tabela de auditoria é somente-inserção.' using errcode = 'P0001';
end $$;

-- Ao concluir uma reserva, atualiza o hodômetro do veículo.
create or replace function public.fn_atualizar_km_veiculo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'concluida' and new.km_final is not null
     and (old.status is distinct from 'concluida' or old.km_final is distinct from new.km_final) then
    update public.veiculos
       set km_atual = greatest(km_atual, new.km_final)
     where id = new.veiculo_id;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['motoristas', 'veiculos', 'reservas'] loop
    execute format('drop trigger if exists trg_%1$s_atualizado_em on public.%1$s', t);
    execute format('create trigger trg_%1$s_atualizado_em before update on public.%1$s
                    for each row execute function public.fn_atualizado_em()', t);

    execute format('drop trigger if exists trg_%1$s_auditoria on public.%1$s', t);
    execute format('create trigger trg_%1$s_auditoria after insert or update on public.%1$s
                    for each row execute function public.fn_auditoria()', t);

    execute format('drop trigger if exists trg_%1$s_sem_delete on public.%1$s', t);
    execute format('create trigger trg_%1$s_sem_delete before delete on public.%1$s
                    for each row execute function public.fn_bloquear_exclusao()', t);

    execute format('drop trigger if exists trg_%1$s_sem_truncate on public.%1$s', t);
    execute format('create trigger trg_%1$s_sem_truncate before truncate on public.%1$s
                    for each statement execute function public.fn_bloquear_exclusao()', t);
  end loop;
end $$;

drop trigger if exists trg_reservas_km_veiculo on public.reservas;
create trigger trg_reservas_km_veiculo after update on public.reservas
  for each row execute function public.fn_atualizar_km_veiculo();

drop trigger if exists trg_auditoria_imutavel on public.auditoria;
create trigger trg_auditoria_imutavel before update or delete on public.auditoria
  for each row execute function public.fn_bloquear_alteracao_auditoria();
drop trigger if exists trg_auditoria_sem_truncate on public.auditoria;
create trigger trg_auditoria_sem_truncate before truncate on public.auditoria
  for each statement execute function public.fn_bloquear_alteracao_auditoria();

-- ---------------------------------------------------------------------
-- Acesso público (sem login): ler, incluir e alterar. NUNCA excluir.
-- ---------------------------------------------------------------------
alter table public.motoristas enable row level security;
alter table public.veiculos   enable row level security;
alter table public.reservas   enable row level security;
alter table public.auditoria  enable row level security;

revoke delete, truncate on public.motoristas, public.veiculos, public.reservas, public.auditoria
  from anon, authenticated;
revoke insert, update on public.auditoria from anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['motoristas', 'veiculos', 'reservas'] loop
    execute format('drop policy if exists "publico_leitura" on public.%I', t);
    execute format('create policy "publico_leitura" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "publico_inclusao" on public.%I', t);
    execute format('create policy "publico_inclusao" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('drop policy if exists "publico_alteracao" on public.%I', t);
    execute format('create policy "publico_alteracao" on public.%I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists "publico_leitura" on public.auditoria;
create policy "publico_leitura" on public.auditoria for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Tempo real (calendário atualiza sozinho em todas as telas abertas)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['motoristas', 'veiculos', 'reservas'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
