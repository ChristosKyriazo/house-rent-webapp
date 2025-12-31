# AI Search Feature Setup

## Overview

The AI search feature uses OpenAI's GPT-3.5-turbo model (cheapest option) to analyze user search queries and calculate match percentages for property listings based on:

- Location (city, country, area)
- Price/budget
- Size (square meters)
- Number of bedrooms and bathrooms
- Floor
- Heating (category and agent)
- Parking availability
- Year built/renovated
- Availability date
- Area safety rating (0-10 scale)
- Area vibe/atmosphere
- Owner rating (0-5 scale)
- Proximity to amenities (metro, bus, school, hospital, park)
- Listing type (rent/sell)
- Description and title relevance

## Setup Instructions

### 1. Install OpenAI Package

```bash
npm install openai
```

### 2. Add OpenAI API Key

Add your OpenAI API key to your `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Important**: Never commit your API key to version control. Make sure `.env` is in your `.gitignore` file.

### 3. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key and add it to your `.env` file

### 4. Cost Considerations

- **Model**: GPT-3.5-turbo (cheapest option)
- **Pricing**: 
  - Input: $0.50 per 1M tokens
  - Output: $1.50 per 1M tokens
- **Estimated cost per search**: ~$0.001-0.005 (depending on number of listings)
- **1,000 searches/month**: ~$1-5/month
- **10,000 searches/month**: ~$10-50/month

### 5. How It Works

1. User enters a search query in the AI search field
2. System fetches all relevant homes with full data (including area safety/vibe and owner ratings)
3. Data is sent to OpenAI GPT-3.5-turbo with a detailed prompt
4. AI analyzes the query against each property and calculates a match percentage (0-100)
5. Results are sorted by match percentage (highest first)
6. Match percentage is displayed as a badge on the top right of each listing card

### 6. Match Percentage Display

The match percentage badge appears on the top right of each listing:
- **Green (80-100%)**: Excellent match
- **Yellow (60-79%)**: Good match
- **Orange (0-59%)**: Moderate to poor match

### 7. Error Handling

If the OpenAI API fails or the API key is not configured:
- The system falls back to assigning 50% match to all listings
- An error is logged to the console
- The search still returns results (just without accurate match percentages)

### 8. Testing

To test the feature:
1. Make sure `OPENAI_API_KEY` is set in your `.env` file
2. Start the development server: `npm run dev`
3. Navigate to the homes search page
4. Use the "AI Search" option
5. Enter a search query like: "2 bedroom apartment in Athens under 500 euros with parking"
6. Results should show match percentages on each listing

## Troubleshooting

### "OpenAI API key not configured" error

- Check that `OPENAI_API_KEY` is set in your `.env` file
- Restart your development server after adding the key
- Make sure there are no extra spaces or quotes around the key

### No match percentages showing

- Check browser console for errors
- Verify OpenAI API key is valid
- Check that the API call is completing (check server logs)
- Ensure you have sufficient OpenAI credits

### High API costs

- Consider caching results for similar queries
- Limit the number of homes analyzed per search
- Use a more efficient prompt structure
- Monitor usage in OpenAI dashboard



