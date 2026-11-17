export const RESULT_LABELS = [
  "果斷",
  "分析",
  "創意",
  "理想",
  "掌控",
  "事務",
  "感覺",
  "人際",
] as const;

export type ResultLabel = (typeof RESULT_LABELS)[number];

export type GroupOption = {
  position: number;
  label: string;
  result: ResultLabel;
};

export type QuestionGroup = {
  id: number;
  title: string;
  options: readonly GroupOption[];
};

const optionSets = [
  ["獨當一面", "研判資訊", "創意思考", "規劃遠景", "協調支援", "按部就班", "傾聽別人", "協調他人"],
  ["明快決策", "研析對策", "發揮想像", "不受拘束", "執行計畫", "井然有序", "感性溫馨", "團隊合作"],
  ["實事求是", "邏輯分析", "創作研發", "彈性多元", "現況掌握", "資訊彙整", "同理情感", "人際經營"],
  ["重視成效", "推理思考", "獨特創新", "推銷想法", "建立程序", "行政處理", "支持他人", "接觸人群"],
  ["影響他人", "追根究柢", "實驗嘗試", "開發市場", "組織管理", "細節處理", "營造氣氛", "協調衝突"],
] as const;

export const QUESTION_GROUPS: readonly QuestionGroup[] = optionSets.map((options, groupIndex) => ({
  id: groupIndex + 1,
  title: `題組${["一", "二", "三", "四", "五"][groupIndex]}（8→4→2→1）`,
  options: options.map((label, index) => ({
    position: index,
    label,
    result: RESULT_LABELS[index],
  })),
}));

export const SELECTION_STAGES = [8, 4, 2, 1] as const;
export const SCORE_BY_SELECTION_COUNT = { 0: 0, 1: 1, 2: 3, 3: 5 } as const;

export type GroupSelectionRounds = readonly [readonly number[], readonly number[], readonly number[]];
export type GroupScores = Record<ResultLabel, number>;

export type GroupedQuestionnaireResult = {
  groupScores: GroupScores[];
  resultScores: GroupScores;
  totalScore: number;
  isValid: boolean;
};

function assertRound(round: readonly number[], expectedSize: number, groupIndex: number) {
  if (round.length !== expectedSize || new Set(round).size !== round.length || round.some((position) => position < 0 || position > 7)) {
    throw new Error(`題組 ${groupIndex + 1} 的選擇數量或位置不正確`);
  }
}

export function calculateGroupedQuestionnaire(rounds: readonly GroupSelectionRounds[]): GroupedQuestionnaireResult {
  if (rounds.length !== 5) throw new Error("必須完成五個題組");

  const groupScores = rounds.map((groupRounds, groupIndex) => {
    assertRound(groupRounds[0], 4, groupIndex);
    assertRound(groupRounds[1], 2, groupIndex);
    assertRound(groupRounds[2], 1, groupIndex);

    const counts = Array.from({ length: 8 }, () => 0);
    groupRounds.forEach((round) => round.forEach((position) => { counts[position] += 1; }));
    const scores = Object.fromEntries(RESULT_LABELS.map((label, position) => [label, SCORE_BY_SELECTION_COUNT[counts[position] as 0 | 1 | 2 | 3]])) as GroupScores;
    const groupTotal = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (groupTotal !== 10) throw new Error(`題組 ${groupIndex + 1} 計分錯誤：總分應為 10 分`);
    return scores;
  });

  const resultScores = Object.fromEntries(RESULT_LABELS.map((label) => [
    label,
    groupScores.reduce((sum, scores) => sum + scores[label], 0),
  ])) as GroupScores;
  const totalScore = Object.values(resultScores).reduce((sum, score) => sum + score, 0);
  return { groupScores, resultScores, totalScore, isValid: totalScore === 50 };
}
