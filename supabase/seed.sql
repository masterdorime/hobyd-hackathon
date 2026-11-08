insert into public.rooms (id, title, seller_name, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'Pokémon TCG Night Auction',
  'Demo Seller',
  'lobby'
)
on conflict (id) do nothing;
