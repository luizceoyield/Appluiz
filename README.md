# Gestão de Frota e Reservas Antecipadas — Sicoob Centro

Aplicação web para reservar veículos da frota com **bloqueio real de conflito de horário**,
calendário em tempo real, cadastros de veículos e motoristas e dashboard de uso.

Stack: React + Vite + TypeScript + Tailwind · FullCalendar · Recharts · Supabase (PostgreSQL).

## Funcionalidades

- **Reserva / Registro de saída**: veículo, motorista, data e hora de início e fim, destino e
  finalidade. Não pede KM: a quilometragem é informada só na conclusão.
- **Prevenção de double-booking**: se `início < fim_existente E fim > início_existente` para o
  mesmo veículo, o app mostra **"Veículo Ocupado neste Horário"** e não grava.
  A regra também está no banco (constraint `EXCLUDE`), então nem duas pessoas salvando
  ao mesmo tempo conseguem gravar reservas sobrepostas.
- **Conclusão da reserva**: o app pede o **KM inicial** (já sugerido com o último KM registrado do
  veículo) e o **KM final**, e calcula `KM rodados = KM final − KM inicial`. O KM do veículo é
  atualizado e vira a base da próxima conclusão.
- **Calendário mensal**, com cada veículo em uma cor (placa visível no dia). Ao clicar em um dia,
  o app mostra se há reservas naquele dia (e quais veículos estão livres).
  Tem filtro por veículo e atualização em tempo real.
- **Dashboard**: saídas no mês, KM rodados no mês, veículos disponíveis agora, reservas aguardando
  KM final, gráfico de horários de pico, gráfico de KM rodados por veículo e próximas saídas.
- **Cadastros** de veículos (placa, marca, modelo, ano, **KM atual obrigatório**, cor no calendário) e
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

## Versão publicada no claude.ai (sem Supabase)

O app também roda como página do claude.ai, usando o banco de dados embutido da própria página:

```bash
npm run build:claude   # gera dist-claude/frota.html (arquivo único)
```

Nessa versão:
- quem acessa precisa estar logado no claude.ai e ter a página compartilhada com nível **Colaborador**
  (quem tem nível **Leitor** só visualiza);
- nada é apagado pelo app: veículos e motoristas são desativados, reservas são canceladas, e cada
  registro guarda o histórico das versões anteriores;
- a prevenção de conflito usa uma trava curta por veículo: quem salva relê as reservas do veículo no
  banco antes de gravar, então duas pessoas não conseguem reservar o mesmo horário ao mesmo tempo;
- o botão **Exportar backup** baixa um JSON com todos os dados.

## Link público (GitHub Pages + Supabase), sem login

O site fica em **https://luizceoyield.github.io/Appluiz/** e qualquer pessoa com o link usa sem entrar
em conta nenhuma. Publicação automática pelo workflow `.github/workflows/publicar-site.yml`.

1. Crie o projeto no Supabase e rode os arquivos de `supabase/migrations/` em ordem (passos abaixo).
2. No GitHub: **Settings → Secrets and variables → Actions → New repository secret** e crie
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Em **Actions → Publicar site → Run workflow** (ou faça qualquer push). Em ~2 minutos o link funciona.

## Como colocar no ar (versão Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, execute os arquivos de `supabase/migrations/` em ordem (pelo nome).
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
