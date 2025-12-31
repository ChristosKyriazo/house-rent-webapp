# How to View AI Search Logs

## Option 1: Terminal/Console (Current Method)

The logs appear in the terminal where you run `npm run dev`.

**Steps:**
1. Open your terminal
2. Navigate to the project directory
3. Run `npm run dev`
4. The logs will appear in real-time in that terminal

**What you'll see:**
```
=== AI FILTER EXTRACTION ===
System Prompt: ...
User Query: athens
AI Response (raw): ...
=== END FILTER EXTRACTION ===

Extracted filters: {...}
Found X homes after initial database filters
...
```

## Option 2: Save Logs to File

You can redirect console output to a file:

**On macOS/Linux:**
```bash
npm run dev 2>&1 | tee logs.txt
```

**Or just save to file:**
```bash
npm run dev > logs.txt 2>&1
```

Then view with:
```bash
tail -f logs.txt  # Watch in real-time
# or
cat logs.txt      # View all at once
```

## Option 3: Add Log Viewer Endpoint (Development Only)

I can create a simple API endpoint that shows recent logs. This would be useful for debugging.

## Option 4: Use a Logging Library

We could integrate a proper logging library like:
- `winston` - Popular Node.js logger
- `pino` - Fast JSON logger
- `bunyan` - Structured logging

These can write to files, databases, or external services.

## Option 5: Browser DevTools (For Frontend Logs)

For frontend logs:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Frontend `console.log()` statements will appear here

**Note:** Server-side logs (like our AI prompts) won't appear here - they're in the terminal.

## Quick Check: Current Logs

Right now, when you search for "athens", check your terminal where `npm run dev` is running. You should see:

1. **Filter Extraction Logs:**
   - System prompt sent to AI
   - User query
   - AI's raw response
   - Parsed filters

2. **Database Filtering Logs:**
   - Extracted filters JSON
   - Home counts after each filter step

3. **Match Calculation Logs:**
   - System prompt for matching
   - User prompt (truncated)
   - AI's response with match percentages

## Recommended: Terminal + File Logging

For best results, use both:
```bash
# This shows logs in terminal AND saves to file
npm run dev 2>&1 | tee logs-$(date +%Y%m%d-%H%M%S).txt
```

This way you can:
- See logs in real-time in terminal
- Review logs later from the file
- Search through logs with `grep` or text editor

## Search Logs

Once saved to a file, you can search:
```bash
# Find all AI filter extractions
grep "AI FILTER EXTRACTION" logs.txt

# Find all "athens" searches
grep -i "athens" logs.txt

# Find extracted filters
grep "Extracted filters:" logs.txt

# Find AI responses
grep "AI Response" logs.txt
```

## Production Logging

For production, consider:
- **Vercel**: Logs appear in Vercel dashboard
- **AWS/Azure**: Use CloudWatch/Application Insights
- **Docker**: Use log aggregation tools
- **File-based**: Write to log files, rotate daily

Would you like me to:
1. Set up file-based logging?
2. Create a log viewer endpoint?
3. Add a logging library?
4. Just help you check the current terminal logs?



