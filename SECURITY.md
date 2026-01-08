# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them through GitHub's Security Advisory feature:

1. Go to the [Security Advisories page](https://github.com/Watchtower-Labs/watchtower-cli/security/advisories/new)
2. Click "New draft security advisory"
3. Fill out the form with details about the vulnerability

### What to Include

When reporting a vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Impact**: The potential impact of the vulnerability
- **Affected Versions**: Which versions are affected
- **Suggested Fix**: If you have a suggested fix or mitigation

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

### What to Expect

1. You will receive an acknowledgment of your report within 48 hours
2. We will investigate and provide a status update within 7 days
3. We will work with you to understand and resolve the issue
4. Once fixed, we will publicly acknowledge your contribution (unless you prefer to remain anonymous)

## Security Features

Watchtower includes several built-in security features:

### Argument Sanitization

Sensitive data in tool arguments is automatically redacted before being written to trace files:

- API keys (`api_key`, `apikey`)
- Passwords (`password`, `passwd`, `pwd`)
- Tokens (`token`, `auth_token`, `access_token`)
- Secrets (`secret`, `private_key`)
- Credentials (`credential`, `auth`)

### Local-Only Storage

- All trace files are stored locally in `~/.watchtower/traces/`
- Directory permissions are set to `0700` (owner read/write/execute only)
- No data is ever sent to external servers

### No Network Calls

The Watchtower SDK:
- Does not phone home
- Does not send telemetry
- Does not make any network requests
- All data stays on your machine

## Best Practices

When using Watchtower:

1. **Review traces before sharing**: Even with sanitization, review trace files before sharing them
2. **Secure trace directory**: The default permissions are secure, but verify if you change the location
3. **Clean up old traces**: Periodically remove old trace files you no longer need
4. **Use environment variables**: For sensitive configuration, prefer environment variables over config files

## Security Updates

Security updates will be released as patch versions (e.g., 0.1.1) and announced through:

- GitHub Security Advisories
- Release notes in CHANGELOG.md
- GitHub Releases

We recommend always using the latest version to ensure you have the latest security fixes.
