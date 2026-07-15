# DevMatch Agent Guide

## Product purpose

DevMatch helps developers find collaborators at a comparable experience level. Recommendations should be technically relevant and level-appropriate: a competitive programmer should see similarly capable competitive programmers, while a project, hackathon, or open-source search should consider both stack compatibility and GitHub-derived development experience.

Matching is deterministic and explainable. Do not introduce ML models or opaque learned ranking unless the product direction explicitly changes.

## Directional intent model

Never conflate what a user is currently searching for with the intents for which that user is willing to appear in someone else's search.

- `searchIntent`: zero or one outbound intent. It controls the user's current Discover feed and its search preferences.
- `openToIntents`: zero or more inbound intents. They control the searches in which the user may appear as a candidate.
- `effectiveOpenToIntents`: the union of `openToIntents` and the current `searchIntent`. A user actively searching for an intent is implicitly available to others searching for the same intent.

Example: a user may currently search for `DSA` while being open to inbound matches for `DSA`, `PROJECT`, and `OPENSOURCE`.

Candidate eligibility is directional:

```text
requester.searchIntent = X
candidate.effectiveOpenToIntents contains X
```

The candidate's own `searchIntent` does not need to equal the requester's intent.

## Intent lifecycle rules

- Changing `searchIntent` must not overwrite `openToIntents`.
- Updating `openToIntents` must not change the current Discover feed.
- A user may have no `searchIntent` and still be passively discoverable through `openToIntents`.
- A user with a `searchIntent` but no explicit `openToIntents` remains discoverable for that search intent through the implicit union rule.
- Seen/rejected history remains scoped by intent when the user switches searches.
- Removing an inbound intent removes the user from new discovery results immediately.
- Existing pending requests retain their original intent context and remain actionable; new actions must not be created for an intent that was not eligible when the candidate was shown.
- Matches and match actions always persist the intent that produced the recommendation.
- Duplicate open-to intents must be prevented and intent updates must be atomic.

## Matching invariants

- Never use a fallback threshold such as `-1` that admits technically irrelevant candidates.
- Return fewer results, including an empty result, instead of fabricating compatibility.
- Validate vector version and dimensions before similarity calculations.
- Apply identity, availability, block/history, profile-quality, and inbound-intent eligibility before ranking.
- Ratings and experience levels are distance/eligibility signals, not generic cosine dimensions.
- Missing data must lower confidence or use a documented fallback; it must never be interpreted as elite or zero-level ability.
- Relaxation may widen optional ranges in bounded tiers, but must never bypass the absolute technical-overlap floor.

## Intent-specific compatibility

### DSA

- Match programming-language compatibility and DSA skills.
- Compare Codeforces rating and LeetCode global rank as lower-distance level signals. LeetCode global rank is lower-is-better.
- Support Codeforces-only, LeetCode-only, both-platform, and unrated users explicitly.
- Respect user-selected rating ranges; use bounded automatic peer bands when no range is supplied.

### Project

- Require meaningful overlap in languages, frameworks, or domains.
- Use GitHub-derived languages, repository topics, activity, and experience level when available.
- Competitive-programming ratings must not influence project compatibility.

### Hackathon

- Match languages, frameworks, domains, and GitHub-derived development level.
- Prefer candidates who can realistically collaborate at a similar pace and experience level.
- Competitive-programming signals may only be considered when the declared hackathon domain is explicitly algorithmic.

### Open source

- Require a connected GitHub profile with usable synced technical data.
- Match repository languages, topics/domains, activity recency, and GitHub experience level.
- Do not treat stars alone as experience; use bounded/log-scaled signals so one popular repository cannot dominate.

## Same-level principle

Technical overlap answers “can these people work on the same thing?” Level proximity answers “are they likely to be productive peers?” Both conditions matter.

- DSA level comes primarily from Codeforces rating and LeetCode global rank proximity.
- Project, hackathon, and open-source level comes from bounded GitHub signals such as contribution activity, repository languages/topics, stars, and profile completeness.
- Level bands must be broad enough for sparse pools but bounded enough to avoid recommending beginners and highly advanced developers as strong peers without evidence.
- Similarity percentages shown to users must correspond to the same intent-specific calculation used to rank the result.

## Testing expectations

Changes to matching must include cases for every intent, multiple `openToIntents`, no current search, implicit current-intent discoverability, intent switching, removed inbound intents, missing provider data, mixed provider availability, invalid/vector-version mismatch, bounded relaxation, seen history, busy users, duplicate prevention, and pagination stability.
