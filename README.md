# Gestão de Frota e Reservas Antecipadas — Sicoob Centro

Aplicação web para reservar veículos da frota com **bloqueio real de conflito de horário**,
calendário em tempo real, cadastros de veículos e motoristas e dashboard de uso.

Stack: React + Vite + TypeScript + Tailwind · FullCalendar · Recharts · Supabase (PostgreSQL).

## Funcionalidades

- **Reserva / Registro de saída**: veículo, motorista, data e hora de início e fim, KM inicial
  (sugerido pelo hodômetro do veículo), destino e finalidade.
- **Prevenção de double-booking**: se `início < fim_existente E fim > início_existente` para o
  mesmo veículo, o app mostra **"Veículo Ocupado neste Horário"** e não grava.
  A regra também está no banco (constraint `EXCLUDE`), então nem duas pessoas salvando
  ao mesmo tempo conseguem gravar reservas sobrepostas.
- **Conclusão da reserva**: o app pede o **KM final** e o banco calcula
  `KM rodados = KM final − KM inicial`. O hodômetro do veículo é atualizado automaticamente.
- **Calendário** mensal, semanal e em lista, com cada veículo em uma cor (placa visível no mês),
  filtro por veículo e atualização em tempo real.
- **Dashboard**: saídas no mês, KM rodados no mês, veículos disponíveis agora, reservas aguardando
  KM final, gráfico de horários de pico, gráfico de KM rodados por veículo e próximas saídas.
- **Cadastros** de veículos (placa, marca, modelo, ano, hodômetro, cor no calendário) e
  motoristas (nome, **cargo**, telefone).
- Sem login. Layout responsivo (celular com navegação inferior; desktop com menu lateral).

## Proteção contra perda de dados

| Camada | O que faz |
| --- | --- |
| Banco relacional (Supabase/PostgreSQL) | Todos os dados ficam no servidor, nada fica só no navegador. |
| Exclusão bloqueada | `DELETE` e `TRUNCATE` são recusados por trigger em todas as tabelas (inclusive para administradores) e o app não tem permissão de exclusão. "Excluir" = **desativar**; reservas são **canceladas**. |
| Auditoria | Toda inclusão e alteração é copiada (valores antigos e novos) para a tabela `auditoria`, que não pode ser alterada nem apagada. |
| Integridade | Chaves estrangeiras `ON DELETE RESTRICT`, KM final ≥ KM inicial, fim > início, placa única. |
| Backup manual | Botão **Exportar backup** baixa um JSON com todas as tabelas. |
| Backup do Supabase | **Recomendado:** ative *Point-in-Time Recovery* em *Project Settings → Add-ons* (plano Pro) para restaurar o banco em qualquer momento. |

## Como colocar no ar

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, cole e execute `supabase/migrations/20261015000000_gestao_frota.sql`.
   O script pode ser executado de novo sem perder dados.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (Supabase → *Project Settings → API*).
4. Rode localmente:
   ```bash
   npm install
   npm run dev
   ```
5. Para publicar: `npm run build` e hospede a pasta `dist/` (Vercel, Netlify ou Lovable).
   Configure as mesmas duas variáveis de ambiente na hospedagem.

> **Atenção:** como o sistema não tem login, qualquer pessoa com o link pode criar e alterar
> reservas. Nada pode ser apagado e tudo fica na auditoria, mas compartilhe o link apenas
> internamente.
