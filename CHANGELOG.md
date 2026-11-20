# Changelog

## 0.1.0

First public release.

- Built on `@awsesh/core` 1.4.5, including compatibility with Sesh's
  `sessions/by-name` storage layout.
- Initial scaffold: status bar, command palette actions for switching, signing
  in and out, clearing, console link, clipboard copy, directory opening, and
  terminal environment integration backed by `@awsesh/core`.
- `Sesh: Open TUI` to launch the awsesh TUI in a terminal, with an
  `awsesh.binary` setting.
- Workspace profile binding (`Sesh: Bind workspace to current credential`) with
  a one-time apply prompt, and opt-in auto-refresh of the active credential.
- Activity bar view with the Sesh mark: sessions, accounts, and roles, plus a
  Credentials group. Click a role to set credentials. Right-click a role or
  credential for that account and role's AWS Console.
- The status bar and tree refresh every minute and when the window regains
  focus, so ended sessions and expired credentials stop showing as active.
- Unit test suite (`bun test`) covering directory resolution, terminal
  environment, status bar, workspace binding, and refresh scheduling.
- Integration test harness (`@vscode/test-electron`) that activates the extension
  in a real VS Code host against an isolated session fixture.
- `Sesh: Install awsesh CLI` guided install (Homebrew where available, otherwise
  the releases page), reached from the Open TUI "could not run" warning too.
