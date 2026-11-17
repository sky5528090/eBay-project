# Release validation notes

## 2026-08-13

- `/privacy` successfully rendered the public privacy explanation and data deletion request form.
- The deletion form exposes required email, name, and birthdate fields plus optional reason text.
- `/admin/invite?code=demo-code-1234` successfully rendered the invite-code field and unauthenticated login prompt.
- Public landing page now exposes a `隱私權與資料刪除` link.
- `pnpm check` passed.
- `pnpm build` passed; Vite emitted only the existing chunk-size advisory.
- `pnpm test` passed: 4 files, 13 tests.
- The development status check reported running services, no TypeScript errors, and no LSP errors.

## Notes

- The invite page intentionally requires Manus OAuth before accepting a code.
- A real custom domain still requires the owner to bind it in Settings → Domains and configure DNS at the registrar; no external DNS record was changed automatically.
