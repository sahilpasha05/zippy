-- order_items had an INSERT policy and several SELECT policies, but no
-- DELETE policy for regular (non-admin) sessions — only the admin "ALL"
-- policy (is_admin()) could delete rows. That meant checkout's retry path
-- (delete an order's old items before re-inserting on a repeat attempt,
-- see src/app/checkout/page.tsx) silently matched zero rows under RLS
-- instead of erroring: PostgREST returns success for a delete that removes
-- nothing. The fresh insert then landed on top of the untouched old rows,
-- doubling every item on any order that went through a retry.
--
-- Mirrors the existing INSERT policy's shape (any existing order, no
-- ownership check) rather than introducing a stricter model than what's
-- already in place for INSERT — tightening both to a real ownership check
-- is a separate follow-up, not bundled into this fix.
create policy "Delete items for an existing order" on public.order_items
  for delete using (
    exists (select 1 from public.orders o where o.id = order_items.order_id)
  );
