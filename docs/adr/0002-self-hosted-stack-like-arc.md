# Self-hosted Postgres and Better Auth on Coolify, the same stack as ARC

Za5 runs on our own Coolify server with Postgres (through Drizzle) for data, Better Auth for logins, and a persistent volume for uploaded Plans, matching the ARC gym app. We considered hosted Supabase; we chose the self-hosted stack because the server, deployment and patterns already work in ARC, nothing new has to be learned or paid for, and Household data (including floor plans of people's homes) stays on our own server. The cost is that backups, uptime and scaling are ours to run.
