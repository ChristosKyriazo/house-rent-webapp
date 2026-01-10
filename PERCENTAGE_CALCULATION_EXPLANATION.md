# How Match Percentages Are Calculated

## Example Scenario
**User Query:** "I need an apartment near metro (essential), good bus access (strong preference), but avoid universities"

**Extracted Filters:**
- Metro: "Essential"
- Bus: "Strong"  
- University: "Avoid"

## Step-by-Step Process

### Step 1: AI Filter Extraction
AI extracts the distance categories from the query:
```json
{
  "Metro": "Essential",
  "Bus": "Strong",
  "University": "Avoid"
}
```

### Step 2: Database Filtering
- Homes are filtered by hard filters (city, price, bedrooms, etc.)
- **NO filtering by distances** - all homes matching hard filters are returned
- Example: 50 homes match the hard filters

### Step 3: AI Initial Match Percentage
AI calculates initial match percentages based on:
- Location match
- Price, size, bedrooms, bathrooms
- Parking, heating, amenities
- Area vibe, safety
- Description semantic match
- **Note:** AI is told NOT to heavily weight distances (they're handled separately)

**Example results:**
- Home A: 75% (good match on other criteria)
- Home B: 60% (decent match)
- Home C: 80% (very good match)

### Step 4: Distance Post-Processing (This is where distance scoring happens)

For each home, the system:

1. **Identifies which distances to consider:**
   - Metro (Essential)
   - Bus (Strong)
   - University (Avoid)
   - School, Park, Hospital are "Not mentioned" → skipped

2. **Calculates distance score for each:**
   - **No priority system** - all distance types are treated equally
   - Score depends only on category (Essential/Strong/Avoid) and actual distance
   
   **Example Home A:**
   - Metro distance: 0.8 km (Essential)
     - Score: 35 (Essential ≤1km = 35 points)
   
   - Bus distance: 1.2 km (Strong)
     - Score: 15 (Strong ≤1.5km = 15 points)
   
   - University distance: 2.5 km (Avoid)
     - Score: -15 (Avoid <3km = -15 points penalty)
   
   **Total distance bonus:** 35 + 15 + (-15) = **35 points**

3. **Applies the bonus:**
   - Initial AI score: 75%
   - Distance bonus: +35
   - **Final score: 75 + 35 = 110 → capped at 100%**

**Example Home B:**
   - Metro distance: 3.5 km (Essential)
     - Score: -10 (Essential ≤3km = -10 points penalty)
   
   - Bus distance: 0.5 km (Strong)
     - Score: 20 (Strong ≤0.5km = 20 points)
   
   - University distance: 0.8 km (Avoid)
     - Score: -25 (Avoid <1km = -25 points penalty)
   
   **Total distance bonus:** -10 + 20 + (-25) = **-15 points**
   
   - Initial AI score: 60%
   - Distance bonus: -15
   - **Final score: 60 - 15 = 45%**

**Example Home C:**
   - Metro distance: 0.3 km (Essential)
     - Score: 40 (Essential ≤0.5km = 40 points)
   
   - Bus distance: 0.4 km (Strong)
     - Score: 20 (Strong ≤0.5km = 20 points)
   
   - University distance: 8 km (Avoid)
     - Score: 15 (Avoid 7-10km = 15 points bonus for being far)
   
   **Total distance bonus:** 40 + 20 + 15 = **75 points**
   
   - Initial AI score: 80%
   - Distance bonus: +75
   - **Final score: 80 + 75 = 155 → capped at 100%**

### Step 5: Additional Post-Processing
- Preferred areas bonus (if applicable)
- Elevator requirement penalty/bonus
- Parking essential penalty (if parking is essential)

### Step 6: Final Result
Homes are sorted by final match percentage (highest first):
1. Home C: 100% (capped from 155%)
2. Home A: 100% (capped from 110%)
3. Home B: 45%

## Key Points

1. **Initial AI score** (0-100%) is based on non-distance attributes
2. **Distance scores are added/subtracted** from the initial score
3. **No priority system** - all distance types (Metro, Bus, University, etc.) are treated equally
4. **Essential categories** get higher bonuses/penalties than Strong (40 vs 20 for close distances)
5. **Avoid categories** penalize close distances, reward far distances
6. **Final score is capped** at 0-100%
7. **If Essential exists**, distance bonus is NOT normalized (full impact)
8. **If no Essential**, distance bonus is normalized by number of distances

## Normalization Logic

**When Essential category exists:**
- All distance scores are added together directly (no normalization)
- Example: Metro (35) + Bus (15) + University (-15) = 35 points (full impact)

**When NO Essential category (only Strong/Avoid):**
- Total distance bonus is divided by the number of distances
- Example: If only Bus (15) + University (-15) = 0 total
- Normalized: 0 / 2 = 0 points (reduced impact)
- This prevents multiple Strong/Avoid categories from having too much impact

## Distance Score Calculation Details

The `calculateDistanceScore()` function:
1. Takes the actual distance (km) and category (Essential/Strong/Avoid)
2. Returns a score based on distance thresholds - **no priority weighting**
3. All distance types are treated equally - the category alone determines the score

**Essential Category Scores:**
- ≤0.5 km: +40 points
- ≤1.0 km: +35 points
- ≤1.5 km: +25 points
- ≤2.0 km: +5 points
- ≤3.0 km: -10 points
- ≤5.0 km: -20 points
- ≤7.0 km: -30 points
- >7.0 km: -40 points

**Strong Category Scores:**
- ≤0.5 km: +20 points
- ≤1.0 km: +18 points
- ≤1.5 km: +15 points
- ≤2.0 km: +12 points
- ≤3.0 km: 0 points
- ≤5.0 km: -5 points
- >5.0 km: -10 points

**Avoid Category Scores:**
- <1.0 km: -25 points (penalty for being too close)
- <2.0 km: -20 points
- <3.0 km: -15 points
- 3.0-5.0 km: 0 points (neutral)
- 5.0-7.0 km: +10 points (bonus for being far)
- 7.0-10.0 km: +15 points
- >10.0 km: +20 points

**Missing Distance Data:**
- If distance is null/undefined: -8 points penalty

