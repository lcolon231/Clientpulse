## Summary

<!-- What does this PR do? Why? 1–3 bullet points. -->

-
-

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] CI / config change

## Checklist

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] No `console.log` or `console.error` left in server code (use `logger`)
- [ ] New mutations call `logAudit()`
- [ ] Rate limiting applied to any new public-facing endpoints
- [ ] Tested the golden path and main edge cases
