# Passwordless Authentication System

A full-stack passwordless authentication system built as a Final Year Project for B.Sc. (Hons) Software Systems Development at South East Technological University (SETU) Waterford. This project replaces traditional password-based authentication with FIDO2/WebAuthn passkeys, using public key cryptography to eliminate shared secrets. It serves as a practical, developer-focused reference implementation for modern passwordless authentication.

---

## System Architecture

<img width="956" height="380" alt="Screenshot 2026-04-26 at 10 42 07 AM" src="https://github.com/user-attachments/assets/aaebf9b2-62ff-4c44-834e-120125520976" />

---

## Features

- **Passkey Registration & Login** — WebAuthn credential creation and assertion ceremonies with platform (Touch ID, Face ID, Windows Hello) and cross-platform (YubiKey) authenticator support
- **Usernameless Login** — Discoverable credentials allowing login without entering a username
- **Conditional UI** — Passkey autofill via `autocomplete="webauthn"`, providing a familiar experience similar to password autofill
- **Multiple Authenticators** — Register multiple passkeys per account across different devices
- **Recovery Codes** — Eight SHA-256 hashed, one-time-use recovery codes generated with Python's `secrets` module
- **Admin Dashboard** — User management with credential revocation and cascade deletion
- **Passkey Manager** — Self-service passkey management for users (view, delete, minimum one enforced)
- **Attestation Verification** — CBOR-decoded attestation with trust level categorisation (self, basic, hardware)
- **Credential Backup State Detection** — BE/BS flag extraction to distinguish synced vs device-bound credentials
- **Redis Session Management** — Challenge states with 5-minute TTL, one-time use, and automatic expiry
- **PostgreSQL Persistence** — Three-table schema (users, credentials, recovery_codes) with cascade deletion
- **Docker Compose** — Four-container deployment (frontend, backend, PostgreSQL, Redis)
- **Cross-Device Authentication** — HTTPS via mkcert enabling QR code hybrid transport and multi-device passkey flows

---

## Tech Stack

<img width="1082" height="174" alt="Screenshot 2026-04-26 at 10 36 54 AM" src="https://github.com/user-attachments/assets/735225c3-b846-4532-ba9e-4219b33a576e" />

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [mkcert](https://github.com/FiloSottile/mkcert) (for local HTTPS — required for WebAuthn cross-device testing)
- A WebAuthn-compatible browser (Chrome, Safari, Firefox, or Edge)
- A device with a platform authenticator (Touch ID, Face ID, Windows Hello) or a hardware security key

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/stephenp0320/passwordless-auth-system.git
cd passwordless-auth-system
```

### 2. Generate local TLS certificates

WebAuthn requires a secure context. Use mkcert to create locally-trusted certificates:

```bash
# Install the local CA (one-time setup)
mkcert -install

# Generate certificates
mkdir -p certs && cd certs
mkcert localhost 127.0.0.1 $(scutil --get LocalHostName).local
cd ..
```

> **Note for Linux/Windows users:** Replace `$(scutil --get LocalHostName)` with your machine's hostname.

### 3. Configure the Relying Party ID

In `backend/app.py`, update the RP ID to match your hostname:

```python
rp = PublicKeyCredentialRpEntity(
    id="your-machine-name.local",
    name="Passwordless authentication"
)
```

Also add your hostname to the `ALLOWED_ORIGINS` list in the same file:

```python
ALLOWED_ORIGINS = [
    "https://localhost:5173",
    "https://your-machine-name.local:5173",
]
```

### 4. Build and run with Docker Compose

```bash
docker compose up --build
```

This starts four containers:
- `passkeys_db` — PostgreSQL 15 on port 5432
- `passkeys_redis` — Redis 7 on port 6379
- `passkeys_backend` — Flask on port 5001
- `passkeys_frontend` — Vite dev server on port 5173

### 5. Access the application

Open your browser and navigate to:

```
https://your-machine-name.local:5173
```

---

## API Endpoints

| Method | Endpoint                       | Description                                |
|--------|--------------------------------|--------------------------------------------|
| POST   | `/register/start`              | Begin WebAuthn registration ceremony       |
| POST   | `/register/finish`             | Complete registration and store credential |
| POST   | `/login/start`                 | Begin WebAuthn authentication ceremony     |
| POST   | `/login/finish`                | Verify assertion and authenticate user     |
| POST   | `/login/start/usernameless`    | Begin usernameless authentication          |
| POST   | `/login/finish/usernameless`   | Complete usernameless authentication       |
| POST   | `/recover`                     | Verify recovery code and re-register       |
| POST   | `/user/passkeys`               | List passkeys for a given user             |
| DELETE | `/user/passkeys/<id>`          | Delete a specific passkey                  |
| POST   | `/user/authenticators`         | Get authenticator metadata for a user      |
| GET    | `/admin/users`                 | List all registered users                  |
| DELETE | `/admin/revoke`                | Revoke user access with cascade deletion   |
| GET    | `/admin/attestations`          | List attestation data for all credentials  |

---

## Database Schema
<img width="684" height="665" alt="Screenshot 2026-04-26 at 10 50 59 AM" src="https://github.com/user-attachments/assets/0dae823d-ac25-44a2-969d-6417f498bad3" />

**Important:** The system stores only public keys. Private keys never leave the user's device.

---

## Security Considerations

- **No shared secrets** — Private keys never leave the user's device; only public keys are stored server-side
- **Origin binding** — Credentials are cryptographically bound to the domain, preventing phishing
- **Challenge expiry** — Redis TTL enforces 5-minute challenge windows per W3C WebAuthn specification
- **One-time challenges** — Challenge states are deleted after successful verification to prevent replay attacks
- **Hashed recovery codes** — Recovery codes are stored as SHA-256 hashes, never in plaintext

---


## Author

**Stephen Power** — 20098263@setu.ie

B.Sc. (Hons) Software Systems Development, SETU Waterford

**Supervisor:** Komal Shoukat

---

## Acknowledgements

- [Yubico python-fido2](https://github.com/Yubico/python-fido2) — Server-side WebAuthn library
- [SimpleWebAuthn](https://simplewebauthn.dev/) — Client-side WebAuthn library
- [W3C WebAuthn Level 3 Specification](https://www.w3.org/TR/webauthn-3/)
