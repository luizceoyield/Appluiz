-- O KM inicial e o KM final passam a ser informados só na conclusão da reserva.
-- O KM base vem do cadastro do veículo (veiculos.km_atual), atualizado a cada conclusão.

alter table public.reservas alter column km_inicial drop not null;

alter table public.reservas drop constraint if exists reservas_concluida_tem_km;
alter table public.reservas add constraint reservas_concluida_tem_km
  check (status <> 'concluida' or (km_inicial is not null and km_final is not null));
