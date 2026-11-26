# Simulation reports

Batch results the coming comparison batches need. Commands and report fields are in the
[simulation reference](../../reference/simulation.md); how the bots work is in the
[AI reference](../../reference/ai.md).

| Report                                           | What it holds                                                                                                                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [The balance check](2026-10-26-balance-check.md) | The last full measurement before the agency package and the development deck, and `tools/check.mjs`, the script that judges a batch against the balance-check rules. Its raw reports are not kept; the seeds and commands rebuild them. |

A new batch goes here as `YYYY-MM-DD-<topic>.md`, with its JSON reports, CSVs and logs in a
folder of the same name. Record the commit, seeds, boards, tables and policy limits. Delete a
report once nothing compares against it.
