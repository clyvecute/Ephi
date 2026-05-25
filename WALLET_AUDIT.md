# Wallet Audit — Ephi SupportPage

## Address Validation Results

| Wallet | Address | Format Check |
|--------|---------|-------------|
| USDT TRC-20 (Tron) | `TS4aYAGCjXwNYrqQaZjrWz8ue5AviHfzCF` | ✅ Valid — starts with T, 34 chars, base58 |
| ETH / USDT ERC-20 | `0xa33bB114FbAa5071a6d3E30740ca2e072ccd6B63` | ✅ Valid — 0x + 40 hex chars = 42 total |
| BTC (bech32) | `bc1qr0m76v8t7t5gdq232883exqlz8rc6gf0nmcvf2` | ✅ Valid — bc1q prefix, 42 chars, valid bech32 |

All three addresses pass format validation.

---

## ⚠️ One Issue: Wallets Are Hardcoded as Fallbacks in Source Code

**Current code in `SupportPage.jsx`:**
```js
{ label: 'USDT (TRC-20 / Tron)', address: import.meta.env.VITE_WALLET_USDT_TRC20 || 'TS4aYAGCjXwNYrqQaZjrWz8ue5AviHfzCF' },
{ label: 'ETH / USDT (ERC-20)', address: import.meta.env.VITE_WALLET_ETH         || '0xa33bB114FbAa5071a6d3E30740ca2e072ccd6B63' },
{ label: 'BTC',                 address: import.meta.env.VITE_WALLET_BTC          || 'bc1qr0m76v8t7t5gdq232883exqlz8rc6gf0nmcvf2' },
```

**The problem:** Wallet addresses in source code = wallet addresses in your GitHub repo.
Anyone reading your public repo can see them. For wallet addresses this is actually
**not a security risk** — wallet addresses are meant to be public (that's how people
send you money). But it does mean:

1. If you ever need to rotate a wallet address, you have to push a code change
2. The addresses are now permanently in your git history

**Better approach — move to `.env` only:**
```js
// SupportPage.jsx — remove fallbacks
{ label: 'USDT (TRC-20 / Tron)', address: import.meta.env.VITE_WALLET_USDT_TRC20 },
{ label: 'ETH / USDT (ERC-20)', address: import.meta.env.VITE_WALLET_ETH },
{ label: 'BTC',                  address: import.meta.env.VITE_WALLET_BTC },
].filter(w => w.address), // already filters out empty ones
```

Then set them in `.env.local` (never committed) and in Vercel/Netlify environment variables.

---

## ✅ What You Did Right

**Wallet addresses are public by design** — this is correct. Unlike API keys or
passwords, wallet addresses SHOULD be shown publicly. That's how people send you
crypto. There's no security risk in displaying them.

**MetaMask address structure is correct:**
- Your ETH address `0xa33bB114FbAa5071a6d3E30740ca2e072ccd6B63` is your MetaMask
  public address. This is the correct address for receiving ETH AND any ERC-20
  token (including USDT on Ethereum network).
- Your USDT however is listed as TRC-20 (Tron network) — `TS4aYAGCjXwNYrqQaZjrWz8ue5AviHfzCF`.
  This is a **different address on a different network** — this is correct if you
  have a separate Tron wallet (Trust Wallet, etc).

**IMPORTANT: Network mismatch warning for users**
USDT exists on multiple networks. Make sure your SupportPage clearly tells users
which network to use:
- TRC-20 address → send USDT on **Tron network** only
- ERC-20 address → send USDT on **Ethereum network** only
- Sending TRC-20 USDT to your ETH address = **funds lost forever**

**Recommended: Add network labels clearly in UI (already done in current code ✅)**

---

## Ko-fi Check

`https://ko-fi.com/cheshire_catt` — URL format is valid.

⚠️ **Verify:** Make sure `cheshire_catt` is your exact Ko-fi username (with underscore).
Some Ko-fi usernames use hyphens. Log into Ko-fi and check your profile URL.
If it's `cheshire-catt` (hyphen), update the env var.

---

## Recommended .env additions

Add these to `.env.local` AND to your Vercel/Netlify environment variables:

```env
VITE_WALLET_USDT_TRC20=TS4aYAGCjXwNYrqQaZjrWz8ue5AviHfzCF
VITE_WALLET_ETH=0xa33bB114FbAa5071a6d3E30740ca2e072ccd6B63
VITE_WALLET_BTC=bc1qr0m76v8t7t5gdq232883exqlz8rc6gf0nmcvf2
VITE_KOFI_URL=https://ko-fi.com/cheshire_catt
```

Then remove the hardcoded fallbacks from `SupportPage.jsx` so your git history
stays clean of wallet addresses.

---

## Codebase Scan — No Other Issues Found

- Wallets only appear in `SupportPage.jsx` ✅
- `.gitignore` correctly excludes `.env` files ✅  
- No wallet addresses in config files, JSON, or markdown ✅
- No private keys anywhere in codebase ✅ (only public addresses)
