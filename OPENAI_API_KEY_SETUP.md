# OpenAI API Key Setup & Security

## Understanding OpenAI API Keys

OpenAI API keys **do not have granular permissions** like some other services. An API key is either:
- **Active**: Can make API calls (with your account's limits)
- **Inactive/Revoked**: Cannot make API calls

## API Key Permissions & Access

### What an API key can do:
- ✅ Make API calls to OpenAI models (GPT-3.5, GPT-4, etc.)
- ✅ Access all models your account has access to
- ✅ Use all features available to your account tier
- ✅ Create completions, embeddings, etc.

### What an API key cannot do:
- ❌ Access your account settings
- ❌ View billing information
- ❌ Manage other API keys
- ❌ Change account settings

## Security Best Practices

### 1. **Create a Dedicated API Key for Production**
- Don't use your personal/default API key
- Create a separate key specifically for this application
- Name it clearly (e.g., "House Rent App - Production")

### 2. **Set Usage Limits**
- Go to OpenAI Dashboard → Settings → Limits
- Set **hard limits** to prevent unexpected charges:
  - **Monthly spending limit**: Set based on your budget (e.g., $50/month)
  - **Rate limits**: Optional, but recommended

### 3. **Never Commit API Keys to Git**
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables
- ❌ Never hardcode keys in source code
- ❌ Never commit `.env` files

### 4. **Rotate Keys Regularly**
- Create new keys periodically
- Revoke old/unused keys
- Especially if a key might be compromised

### 5. **Use Different Keys for Different Environments**
- **Development**: One key (with lower limits)
- **Production**: Separate key (with appropriate limits)
- **Testing**: Another key (with minimal limits)

## How to Create an API Key

1. **Go to OpenAI Platform**
   - Visit: https://platform.openai.com/
   - Sign in to your account

2. **Navigate to API Keys**
   - Click your profile icon (top right)
   - Select "API keys" from the menu

3. **Create New Secret Key**
   - Click "Create new secret key"
   - Give it a descriptive name (e.g., "House Rent App")
   - Click "Create secret key"

4. **Copy the Key Immediately**
   - ⚠️ **Important**: You can only see the key once!
   - Copy it immediately and store it securely
   - Add it to your `.env` file

5. **Set Usage Limits** (Recommended)
   - Go to "Settings" → "Limits"
   - Set monthly spending limit
   - Set rate limits if needed

## Recommended Settings for Your App

### For Development/Testing:
```
Monthly Spending Limit: $10-20
Rate Limit: Optional (default is usually fine)
```

### For Production:
```
Monthly Spending Limit: $50-100 (adjust based on expected usage)
Rate Limit: Optional (default is usually fine)
```

## Environment Variable Setup

Add to your `.env` file:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important**: 
- Never share this key publicly
- Never commit it to version control
- Use different keys for dev/staging/production

## Monitoring Usage

### Check Usage in OpenAI Dashboard:
1. Go to https://platform.openai.com/usage
2. View:
   - Daily usage
   - Monthly usage
   - Cost breakdown
   - API call history

### Set Up Alerts:
- Configure email alerts when you reach certain usage thresholds
- Helps prevent unexpected charges

## What Happens If Key is Compromised?

1. **Immediately revoke the key**:
   - Go to API keys section
   - Click "Revoke" on the compromised key

2. **Create a new key**:
   - Generate a replacement
   - Update your `.env` file
   - Restart your application

3. **Check for unauthorized usage**:
   - Review usage logs
   - Check for unexpected API calls
   - Contact OpenAI support if needed

## Account-Level Security

While API keys don't have permissions, your **account** has settings:

### Account Settings to Review:
- **Billing**: Set up payment method and spending limits
- **Organization**: Manage team members (if applicable)
- **Usage**: Monitor API usage and costs
- **Security**: Enable 2FA (two-factor authentication) for your account

## Best Practices Summary

✅ **DO:**
- Create dedicated API keys for each application
- Set monthly spending limits
- Use environment variables
- Rotate keys periodically
- Monitor usage regularly
- Enable 2FA on your OpenAI account

❌ **DON'T:**
- Share API keys publicly
- Commit keys to version control
- Use the same key for multiple projects
- Ignore usage alerts
- Leave keys in code comments or documentation

## Cost Control

### Recommended Limits for Your App:
Based on estimated usage:
- **Low traffic** (1,000 searches/month): $5-10/month limit
- **Medium traffic** (5,000 searches/month): $20-30/month limit
- **High traffic** (20,000 searches/month): $50-100/month limit

### How to Set Limits:
1. Go to: https://platform.openai.com/settings/limits
2. Set "Hard limit" for monthly spending
3. Save changes

This prevents unexpected charges if usage spikes.





