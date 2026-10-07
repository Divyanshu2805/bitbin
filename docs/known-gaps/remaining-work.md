# Remaining Work

The final scope: what is left before BitBin is finished as a portfolio project. Anything not listed here is out of scope. Remove an item when it is merged; when the list is empty the project is done.

**Release**

1. **Release the six commits that are committed locally.** Apply the migrations to production first (`20261006190731_add_token_scopes` adds the token scopes; `20261007153001_add_search_trigram_indexes` creates the `pg_trgm` extension and six indexes), then push the commits one at a time:

   ```bash
   DATABASE_URL=<production URL> npm run db:migrate:deploy
   ```

   See [releasing a schema change](../deployment/vercel.md#releasing-a-schema-change).
2. **Set the production environment variables on Vercel:** the `UPSTASH_*` variables and `CRON_SECRET` (the demo reset and the weekly file sweep both need it). Turnstile and VirusTotal stay off.
3. **Embed screenshots in the README.**

When these are done, update the docs once more (metrics, test table, API reference, schema pages) and mark the project finished. The measured figures are on [project metrics](../metrics.md).
