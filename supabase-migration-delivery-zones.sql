-- Delivery zones: polygons drawn in Admin > Delivery zones, each with its own fee and rules.
-- The first active zone (lowest priority number) that contains the customer's location decides
-- the delivery fee, the minimum order, cash-on-delivery-only and the "executive must confirm" rule.
-- One extra row (kind = 'outside') holds the rule for anywhere outside every zone.
create table if not exists public.delivery_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  kind text not null default 'zone' check (kind in ('zone', 'outside')),
  color text not null default '#16A34A',
  polygon jsonb,
  delivery_fee numeric(10,2) not null default 0,
  min_order numeric(10,2) not null default 0,
  cod_only boolean not null default false,
  needs_confirmation boolean not null default false,
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists delivery_zones_one_outside on public.delivery_zones ((kind)) where kind = 'outside';
alter table public.delivery_zones enable row level security;
drop policy if exists "Public read active delivery zones" on public.delivery_zones;
create policy "Public read active delivery zones" on public.delivery_zones for select using (is_active = true);
drop policy if exists "Admins manage delivery zones" on public.delivery_zones;
create policy "Admins manage delivery zones" on public.delivery_zones for all using (public.is_admin()) with check (public.is_admin());

-- Tarikere's current zones (same shapes and fees as the old built-in ones).
insert into public.delivery_zones (name, kind, color, polygon, delivery_fee, min_order, cod_only, needs_confirmation, priority)
select * from (values
  ('Inner zone (black line)', 'zone', '#16A34A', '[[75.793493, 13.716512], [75.793876, 13.71571], [75.794424, 13.714104], [75.795244, 13.712231], [75.796065, 13.711001], [75.79705, 13.710626], [75.79787, 13.710358], [75.79798, 13.709021], [75.799348, 13.708218], [75.802357, 13.707415], [75.804272, 13.705275], [75.805913, 13.703402], [75.807554, 13.700726], [75.809743, 13.69805], [75.812478, 13.696177], [75.81494, 13.695214], [75.816855, 13.695107], [75.817676, 13.694304], [75.819591, 13.692699], [75.821506, 13.691254], [75.825062, 13.690666], [75.827251, 13.691629], [75.828454, 13.693502], [75.828782, 13.69591], [75.828892, 13.699121], [75.827251, 13.701261], [75.827032, 13.703937], [75.826703, 13.706077], [75.82643, 13.708485], [75.824241, 13.708753], [75.820685, 13.709984], [75.816308, 13.711429], [75.813573, 13.711964], [75.811384, 13.713034], [75.808649, 13.714372], [75.805366, 13.71571], [75.802083, 13.717048], [75.799348, 13.71785], [75.797159, 13.718064], [75.795518, 13.717583], [75.793876, 13.71678]]'::jsonb, 29, 0, false, false, 10),
  ('North-east area (Upparabasavanahalli / Haliyuru)', 'zone', '#F59E0B', '[[75.823446, 13.71008], [75.825569, 13.710375], [75.826933, 13.710758], [75.827631, 13.711023], [75.829511, 13.710316], [75.832241, 13.709785], [75.834667, 13.709638], [75.838306, 13.709579], [75.839368, 13.709137], [75.839883, 13.708106], [75.839974, 13.707222], [75.840278, 13.706279], [75.839671, 13.705159], [75.838609, 13.703686], [75.8377, 13.70236], [75.83679, 13.701034], [75.836032, 13.70015], [75.83497, 13.699856], [75.833757, 13.699856], [75.832392, 13.70015], [75.831725, 13.70074], [75.831695, 13.701624], [75.831483, 13.702508], [75.831028, 13.703392], [75.830269, 13.704276], [75.829208, 13.705307], [75.828298, 13.706043], [75.826782, 13.706927], [75.825569, 13.707664], [75.824659, 13.708253], [75.824052, 13.708843], [75.823749, 13.709432]]'::jsonb, 59, 0, false, false, 20),
  ('Byrapura', 'zone', '#F59E0B', '[[75.82095, 13.674984], [75.821787, 13.674877], [75.822568, 13.674563], [75.823238, 13.674063], [75.823752, 13.673412], [75.824076, 13.672654], [75.824186, 13.67184], [75.824076, 13.671026], [75.823752, 13.670268], [75.823238, 13.669617], [75.822568, 13.669117], [75.821787, 13.668803], [75.82095, 13.668696], [75.820113, 13.668803], [75.819332, 13.669117], [75.818662, 13.669617], [75.818148, 13.670268], [75.817824, 13.671026], [75.817714, 13.67184], [75.817824, 13.672654], [75.818148, 13.673412], [75.818662, 13.674063], [75.819332, 13.674563], [75.820113, 13.674877]]'::jsonb, 59, 0, false, false, 21),
  ('Outer zone (red line)', 'zone', '#F97316', '[[75.791141, 13.727697], [75.780417, 13.720847], [75.780417, 13.713569], [75.780417, 13.706077], [75.78184, 13.699121], [75.788952, 13.69591], [75.793876, 13.695375], [75.799895, 13.693769], [75.802083, 13.689488], [75.80646, 13.685207], [75.813025, 13.681996], [75.818497, 13.679535], [75.825062, 13.676324], [75.832175, 13.67322], [75.836552, 13.673434], [75.841476, 13.675575], [75.845852, 13.678786], [75.849135, 13.681996], [75.852965, 13.686813], [75.856248, 13.693234], [75.858764, 13.699656], [75.860625, 13.703937], [75.862047, 13.708218], [75.862813, 13.713569], [75.862266, 13.71892], [75.860625, 13.722131], [75.854606, 13.725128], [75.850229, 13.726947], [75.846947, 13.728553], [75.841476, 13.729195], [75.83491, 13.729837], [75.827251, 13.729944], [75.817402, 13.730051], [75.813573, 13.730693], [75.811931, 13.730479], [75.809743, 13.72973], [75.804272, 13.729409], [75.797706, 13.728981], [75.792782, 13.728339]]'::jsonb, 59, 0, false, false, 30),
  ('Outside every zone', 'outside', '#DC2626', null::jsonb, 80, 600, true, true, 1000)
) as v(name, kind, color, polygon, delivery_fee, min_order, cod_only, needs_confirmation, priority)
where not exists (select 1 from public.delivery_zones);
