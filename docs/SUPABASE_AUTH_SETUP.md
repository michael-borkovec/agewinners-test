<!--
  File purpose:
  - Setup notes for Supabase signup confirmation email.
  - Explains where the email template is configured and how it relates to the app.
  - Related: lib/api/auth.ts, app/register/page.tsx, app/forgot-password/page.tsx
  - Related templates: docs/SUPABASE_AUTH_EMAIL_TEMPLATE.html, docs/SUPABASE_PASSWORD_RESET_EMAIL_TEMPLATE.html
-->

# Supabase Auth Setup

Potvrzovací e-mail registrace se v tomto projektu nenasazuje přes SQL migraci.

Používá se:

- registrace z `app/register/page.tsx`
- redirect po potvrzení z `lib/api/auth.ts`
- HTML šablona v `docs/SUPABASE_AUTH_EMAIL_TEMPLATE.html`

## Co nastavit v Supabase - potvrzení registrace

1. Otevři `Supabase Dashboard`.
2. Jdi do `Authentication -> Email Templates`.
3. Otevři template pro `Confirm signup`.
4. Jako subject nastav:

`Potvrďte registraci na AgeWinners`

5. Do HTML obsahu vlož obsah souboru `docs/SUPABASE_AUTH_EMAIL_TEMPLATE.html`.

Preview text:

`Potvrďte e-mail a dokončete svůj AgeWinners profil.`

Plain-text fallback je v `docs/SUPABASE_AUTH_EMAIL_COPY.md`.

## Co nastavit v Supabase - obnova hesla

1. Otevři `Supabase Dashboard`.
2. Jdi do `Authentication -> Email Templates`.
3. Otevři template pro `Reset password`.
4. Jako subject nastav:

`Nastavení nového hesla AgeWinners`

5. Do HTML obsahu vlož obsah souboru `docs/SUPABASE_PASSWORD_RESET_EMAIL_TEMPLATE.html`.

Preview text:

`Bezpečně si nastavte nové heslo k AgeWinners.`

Plain-text fallback je v `docs/SUPABASE_AUTH_EMAIL_COPY.md`.

## Co musí zůstat nastavené v aplikaci

Frontend při registraci posílá `emailRedirectTo`, takže po kliknutí na potvrzovací odkaz jde uživatel na:

`http://localhost:3000/profile/basic`

To je aktuálně řízené přes:

- `NEXT_PUBLIC_EMAIL_CONFIRM_REDIRECT`
- fallback v `lib/api/auth.ts`

Frontend při obnově hesla posílá `redirectTo`, takže po kliknutí na resetovací odkaz jde uživatel na:

`http://localhost:3000/reset-password`

To je aktuálně řízené přes:

- `NEXT_PUBLIC_PASSWORD_RESET_REDIRECT`
- fallback v `lib/api/auth.ts`

## Kdy by byl potřeba SQL dotaz

SQL by byl potřeba jen tehdy, pokud by se měnila databázová logika po potvrzení registrace.

Pro samotný obsah potvrzovacího e-mailu SQL potřeba není.
