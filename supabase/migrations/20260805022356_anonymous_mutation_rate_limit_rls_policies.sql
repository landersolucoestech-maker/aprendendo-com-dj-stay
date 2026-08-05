create policy anonymous_mutation_rate_limit_secret_deny_unprivileged
on private.anonymous_mutation_rate_limit_secret
for all
to anon, authenticated
using (false)
with check (false);

create policy anonymous_mutation_rate_limits_deny_unprivileged
on private.anonymous_mutation_rate_limits
for all
to anon, authenticated
using (false)
with check (false);
