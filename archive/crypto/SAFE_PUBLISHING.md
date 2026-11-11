# Safe opportunity registry publishing

The public editor at `/admin/` is intentionally local-only. It does not have repository write access and must never contain a GitHub token, password, or private key.

## Submit an update for review

1. Open the editor at https://getquestpulse.com/admin/ (or the deployed site path).
2. Edit the existing category records and export `opportunities.json`.
3. Open the repository's **Actions** tab.
4. Select **Submit opportunity registry for review**.
5. Choose **Run workflow** on the `main` branch.
6. Paste the complete contents of the exported JSON file into the `registry_json` field and run it.
7. Wait for the automated validation job. If validation fails, read the job log and correct the JSON in the editor.
8. If validation passes, the workflow opens a pull request. Review all evidence and links manually before merging.
9. After merge, GitHub Pages publishes the updated registry through the normal deployment workflow.

## Current supported scope

The current homepage contains five fixed category cards. The registry submission workflow therefore accepts updates to those existing records only. A new registry ID without a matching homepage card is rejected by automated validation. Adding individual offers as separate cards requires a separate homepage/schema implementation and review; do not bypass this check.

## Security and review rules

- The workflow accepts JSON as data; it does not execute submitted content.
- Repository write access is required to manually dispatch the workflow. The workflow uses the repository-scoped `GITHUB_TOKEN`; no personal access token is needed.
- The workflow creates a branch and pull request. It never pushes the submitted registry directly to `main`.
- All registry and site validation must pass before the pull request is opened.
- A passing automated check is not proof that an opportunity is legitimate. A human reviewer must inspect the primary sources, eligibility, fees, deposits, wallet permissions, withdrawal limits, payment evidence, and risks.
- Never publish seed phrases, private keys, passwords, personal information, or confidential user data.
