#!/usr/bin/env node
// Bulk-attach local product photos to restaurant_products.
//
//   1. Rename each image after the dish:  chicken-dum-biryani.png
//   2. Dry run (prints the plan, changes nothing):
//        node scripts/apply-product-images.mjs ~/Downloads/menu-images
//   3. Apply it:
//        node scripts/apply-product-images.mjs ~/Downloads/menu-images --apply
//
// Matching is on a normalised name, so "Chicken Dum Biryani (Full)" is reached
// by chicken-dum-biryani.png. A file matching several products (portion
// variants, or the same dish at two restaurants) is applied to all of them —
// that is usually what you want for "(Half)"/"(Full)" pairs.
//
// Flags:
//   --apply           actually upload and write image_url (default: dry run)
//   --force           also replace products that already have an image
//   --restaurant=slug limit to one restaurant (e.g. --restaurant=j)

import { readFileSync, readdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

const BUCKET = 'restaurant-images'

// --- env -------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    })
)
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1) }

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const APPLY = args.includes('--apply')
const FORCE = args.includes('--force')
const ONLY = args.find((a) => a.startsWith('--restaurant='))?.split('=')[1]
if (!dir) { console.error('Usage: node scripts/apply-product-images.mjs <image-dir> [--apply] [--force] [--restaurant=slug]'); process.exit(1) }

const rest = (path, init = {}) =>
  fetch(`${URL_BASE}${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init.headers ?? {}) } })

// Lowercase, strip punctuation and portion suffixes, collapse to single dashes.
const norm = (s) =>
  s.toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')      // extension
    .replace(/\s*\(\d+\)\s*$/, '')    // "(1)" duplicate marker from the browser
    .replace(/\([^)]*\)/g, ' ')       // "(Half)", "(6 Pc)"
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// --- gather ----------------------------------------------------------------
const files = readdirSync(dir)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .filter((f) => !/\(\d+\)\./.test(f))  // skip browser duplicate copies

const restaurants = await (await rest('/rest/v1/restaurants?select=id,name,slug')).json()
const byId = Object.fromEntries(restaurants.map((r) => [r.id, r]))
const wanted = ONLY ? restaurants.filter((r) => r.slug === ONLY) : restaurants
if (ONLY && wanted.length === 0) { console.error(`No restaurant with slug "${ONLY}"`); process.exit(1) }

const ids = wanted.map((r) => r.id).join(',')
const products = await (await rest(`/rest/v1/restaurant_products?select=id,name,image_url,restaurant_id&restaurant_id=in.(${ids})`)).json()

// name -> products (several products can share a normalised name)
const index = new Map()
for (const p of products) {
  const k = norm(p.name)
  if (!index.has(k)) index.set(k, [])
  index.get(k).push(p)
}

// --- plan ------------------------------------------------------------------
const plan = []
const unmatched = []
for (const f of files) {
  const key = norm(f)
  const hits = (index.get(key) ?? []).filter((p) => FORCE || !p.image_url)
  if (hits.length === 0) { unmatched.push(f); continue }
  plan.push({ file: f, key, products: hits })
}

const targeted = new Set(plan.flatMap((p) => p.products.map((x) => x.id)))
const stillMissing = products.filter((p) => !p.image_url && !targeted.has(p.id))

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — ${files.length} images, ${products.length} products in scope\n`)
for (const { file, products: hits } of plan) {
  console.log(`  ${file}`)
  for (const p of hits) console.log(`      -> ${byId[p.restaurant_id]?.name ?? '?'}: ${p.name}`)
}
console.log(`\nmatched images    : ${plan.length}`)
console.log(`products targeted : ${targeted.size}`)
console.log(`images unmatched  : ${unmatched.length}${unmatched.length ? '  ' + unmatched.slice(0, 12).join(', ') + (unmatched.length > 12 ? ' …' : '') : ''}`)
console.log(`products still without an image: ${stillMissing.length}`)

if (!APPLY) { console.log('\nNothing changed. Re-run with --apply to upload and write image_url.\n'); process.exit(0) }

// --- apply -----------------------------------------------------------------
let uploaded = 0, updated = 0, failed = 0
for (const { file, key, products: hits } of plan) {
  const ext = extname(file).toLowerCase()
  const objectPath = `${key}${ext}`
  const body = readFileSync(join(dir, file))
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

  const up = await rest(`/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    body,
  })
  if (!up.ok && up.status !== 200) {
    console.error(`  upload FAILED ${file}: ${up.status} ${(await up.text()).slice(0, 120)}`)
    failed++
    continue
  }
  uploaded++

  const publicUrl = `${URL_BASE}/storage/v1/object/public/${BUCKET}/${objectPath}`
  for (const p of hits) {
    const r = await rest(`/rest/v1/restaurant_products?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: publicUrl }),
    })
    if (r.ok) updated++
    else { console.error(`  update FAILED ${p.name}: ${r.status}`); failed++ }
  }
}
console.log(`\nuploaded ${uploaded} images, updated ${updated} products, ${failed} failures\n`)
