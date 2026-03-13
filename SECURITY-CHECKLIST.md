# BottleLore Security Checklist

Run before every production deploy.

## Secrets
- [ ] grep -r "api_key\|secret\|anonKey\|password" assets/js/ — nothing hardcoded
- [ ] config.local.php is in .gitignore and NOT committed
- [ ] GitHub secrets set for FTP credentials (not in deploy.yml)

## Database
- [ ] RLS enabled on wineries, wines, winery_admins
- [ ] Public policies only allow SELECT on is_active = true rows
- [ ] Write policies check winery ownership, not just auth.uid() IS NOT NULL
- [ ] No SECURITY DEFINER functions that could bypass RLS

## Inputs
- [ ] escapeHtml() called on all user content before innerHTML
- [ ] Search codebase for innerHTML = and verify each is escaped
- [ ] No raw SQL string concatenation anywhere

## API
- [ ] Supabase anon key only — service_role key never in frontend
- [ ] Admin routes check isLoggedIn() before rendering

## Deploy
- [ ] assets/dist/ not in FTP exclude list
- [ ] Build verification step confirmed manifest.json present
- [ ] HTTPS enforced in .htaccess
