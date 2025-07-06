# 🧞 Deploying to .app Domain

## Prerequisites
- Cloudflare account
- .app domain purchased through Cloudflare or external registrar
- Wrangler CLI authenticated (`npx wrangler login`)

## Deployment Steps

### 1. Add Domain to Cloudflare
If purchased elsewhere:
- Go to Cloudflare Dashboard → Add Site
- Enter your .app domain
- Update nameservers at your registrar
- Wait for DNS propagation (24-48 hours)

### 2. Update wrangler.toml
```toml
name = "ouija-genie"
main = "src/index.js"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[routes]]
pattern = "balatrogenie.app/*"
custom_domain = true

[[routes]]
pattern = "www.balatrogenie.app/*"
custom_domain = true
```

### 3. Deploy Worker
```bash
cd ouija-genie
npx wrangler deploy
```

### 4. Configure Custom Domain
In Cloudflare Dashboard:
- Workers & Pages → Your Worker → Settings
- Domains & Routes → Add Custom Domain
- Enter `balatrogenie.app`
- SSL certificates auto-generated

## Important Notes

### .app Requirements
- **HTTPS mandatory** - .app domains ONLY work over HTTPS
- SSL mode must be "Full" or "Full (strict)"
- Cloudflare handles SSL automatically

### Common Issues

**SSL Error**: Set SSL/TLS mode to "Full" in Cloudflare dashboard

**404 Error**: Ensure custom domain is properly added in Worker settings

**CNAME Conflict**: Delete existing DNS records before adding custom domain

### Example Domains
- `ouija-genie.app`
- `balatro-seeds.app`
- `seed-finder.app`

## Testing
```bash
# Local testing
npx wrangler dev

# Production test
curl https://balatrogenie.app
```

## Security Headers (Already Included)
The worker includes security headers for .app compliance:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options

---

Your Balatro seed finder is now live at `https://balatrogenie.app` 🎰