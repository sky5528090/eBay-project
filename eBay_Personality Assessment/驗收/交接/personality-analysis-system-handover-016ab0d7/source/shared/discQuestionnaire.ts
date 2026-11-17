export type DiscQuestion = {
  id: number;
  title: string;
  options: readonly [string, string, string, string];
};

export const DISC_QUESTIONS: readonly DiscQuestion[] = [
  { id: 1, title: "（朋友）當你和朋友在一起用餐時，在選擇餐廳或吃什麼時，你通常是：", options: ["決定者：意見不同時，通常是決定者", "氣氛製造者：在哪吃、吃什麼，很會帶動情緒氣氛", "附和者：隨便，沒意見", "意見提供者：常常否決別人的提議，自己卻又沒意見，不做決定"] },
  { id: 2, title: "（朋友）你和朋友相處時，通常會：", options: ["直來直往", "熱心且熱情", "君子之交淡如水", "自律"] },
  { id: 3, title: "（朋友）在社交場合中，你是一個：", options: ["主動且不在乎別人看法的人", "喜歡社交也喜歡招待別人", "彬彬有禮但不主動", "不吸引人且不愛表達自己的看法"] },
  { id: 4, title: "（工作）做決定時：", options: ["你喜歡立竿見影的結果", "喜歡大家都同意你的看法", "你重視事實且實際的狀況", "不論大小決定都小心謹慎"] },
  { id: 5, title: "（工作）做事時你一向：", options: ["以具體短期目標為主", "在乎別人對你的看法", "不喜歡改變，那會令你沒安全感", "注意細節的人"] },
  { id: 6, title: "（工作）你覺得做事的重點，應該是：", options: ["WHAT 做什麼？重結果", "WHO 誰來做？重過程", "HOW 怎麼做？重執行", "WHY 為何做？重品質"] },
  { id: 7, title: "（工作）與同事有意見衝突或不同時，你是：", options: ["說服對方，聽從自己的意見", "找其他同事或上司之意見，尋求支持", "以和為貴", "與衝突者協調"] },
  { id: 8, title: "（工作）以下溝通方式，哪一項最適合你：", options: ["直接了當，較具權威式", "表情豐富，肢體語言較多", "先聽聽別人意見，爾後溫和表達自己的意見", "不透露情感，理多於情，愛分析，較冷靜"] },
  { id: 9, title: "（工作）在每一次會議中或決議提案時，你扮演的角色為何：", options: ["據理力爭", "協調者", "贊成多數", "分析所有提案以供參考"] },
  { id: 10, title: "（工作）什麼樣的工作環境，最能鼓舞你：", options: ["能讓你決定事情，具領導地位", "同事相處愉快，處處受歡迎", "穩定中求發展", "重品質，重效率"] },
  { id: 11, title: "（工作）在團體中，你是一個喜歡：", options: ["激發別人採取行動的人", "別人鼓勵你的人", "按部就班的人", "遵守紀律的人"] },
  { id: 12, title: "（自我認知）你自認為哪一種形容，最能表現你的特性：", options: ["果敢的，能接受挑戰的", "生動活潑，不拘謹", "愛傾聽，喜歡穩定", "處事謹慎仔細，重數據分析"] },
  { id: 13, title: "（自我認知）你的朋友用一句話形容你，他們會說：", options: ["蠻霸道的", "熱情洋溢", "溫和斯文", "要求完美"] },
  { id: 14, title: "（自我認知）你的消費習慣是：", options: ["找到要的東西，付錢走人", "很隨意地逛，不特定要買什麼", "有一定的消費習慣，不大喜歡變化", "較注意東西好不好，較有成本觀念"] },
  { id: 15, title: "（自我認知）當你買衣服時，你是：", options: ["不易受銷售員影響，心中有主見", "銷售員親切及良好的態度，常會增加你的購買意願", "找熟悉的店購買", "品質及價格是否合理"] },
] as const;

export const DISC_SECTIONS = [
  { id: 1, title: "朋友", range: [1, 3] as const, note: "" },
  { id: 2, title: "工作", range: [4, 6] as const, note: "" },
  { id: 3, title: "工作", range: [7, 9] as const, note: "" },
  { id: 4, title: "工作", range: [10, 11] as const, note: "" },
  { id: 5, title: "自我認知", range: [12, 13] as const, note: "" },
  { id: 6, title: "自我認知", range: [14, 15] as const, note: "" },
] as const;

export function getDiscSectionIndex(questionIndex: number) {
  return DISC_SECTIONS.findIndex((section) => questionIndex + 1 >= section.range[0] && questionIndex + 1 <= section.range[1]);
}

export function validateDiscAnswers(answers: readonly number[]) {
  return answers.length === DISC_QUESTIONS.length && answers.every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 4);
}
