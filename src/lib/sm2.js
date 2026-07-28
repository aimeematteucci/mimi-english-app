// SuperMemo 2 (SM-2) spaced repetition scheduling.
// quality is the standard SM-2 0-5 recall scale (>=3 counts as a correct recall).

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

export function nextReview({ repetitions, easeFactor, intervalDays }, quality) {
  let nextRepetitions = repetitions
  let nextIntervalDays = intervalDays
  let nextEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3

  if (quality < 3) {
    nextRepetitions = 0
    nextIntervalDays = 1
  } else {
    nextRepetitions = repetitions + 1
    if (nextRepetitions === 1) nextIntervalDays = 1
    else if (nextRepetitions === 2) nextIntervalDays = 6
    else nextIntervalDays = Math.round(intervalDays * easeFactor)
  }

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + nextIntervalDays)

  return {
    repetitions: nextRepetitions,
    easeFactor: nextEaseFactor,
    intervalDays: nextIntervalDays,
    nextReviewDate: toDateString(nextReviewDate),
  }
}
