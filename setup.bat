@echo off
echo Setting up Ouija Genie...
cd ouija-genie
echo Installing dependencies...
call npm install
echo.
echo Setup complete! Next steps:
echo 1. Run "wrangler login" to authenticate
echo 2. Run "wrangler dev" to test locally
echo 3. Run "wrangler deploy" to deploy to Cloudflare
pause