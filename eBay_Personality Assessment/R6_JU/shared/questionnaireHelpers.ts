export function getVisibleQuestionKeys(questions: readonly { key: string }[], values: { siblings?: string }) {
  return questions.filter((question) => question.key !== "siblingsJobs" || values.siblings === "有").map((question) => question.key);
}

export function formatSubmissionError(message: string) {
  if (message.includes("groupedRounds")) return "題組選擇資料需要重新確認，請回到題組重新選擇。";
  if (message.length > 120 || message.trim().startsWith("[")) return "送出時發生問題，請重新確認填寫內容後再試。";
  return message || "送出時發生問題，請稍後再試。";
}
