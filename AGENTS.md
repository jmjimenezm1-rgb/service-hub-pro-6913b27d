<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Accounting is owned by PostgreSQL movement triggers and the idempotent `sync_accounting_movement` RPC; clients must not insert automatic journal entries, to keep source changes and balanced postings atomic.
- Account mappings live in `accounting_rules`, with category/method overrides and a general fallback; posted entries retain their original accounts until a financial source change requires a reversal.
- Automatic entries and lines are read-only; corrections happen on the source movement and append reversals to preserve accounting history.
