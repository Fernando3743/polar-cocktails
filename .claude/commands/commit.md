Write a git commit message for the current repository changes.

Follow the Polar commit-message style from `.codex/skills/commit-message-style/SKILL.md`:

- Use a Conventional Commit subject, with a clear scope when one fits.
- Use lowercase imperative wording in the subject.
- For larger changes, include a blank line and concrete `- ` bullets grouped by affected area.
- Mention exact components, routes, config, APIs, or assets when useful.
- Avoid vague wording, generated-by trailers, and co-author trailers unless explicitly requested.

First inspect the git status and staged diff. If nothing is staged, inspect the unstaged diff and say that the message is for the current working tree rather than a ready commit.

Return only the proposed commit message in a fenced `text` block unless the user asks you to actually commit.
