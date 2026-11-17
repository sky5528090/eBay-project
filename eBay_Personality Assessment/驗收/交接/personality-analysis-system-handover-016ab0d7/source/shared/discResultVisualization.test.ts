import { describe, expect, it } from "vitest";
import { buildDiscResultSvg } from "./discResultVisualization";

describe("DISC paper-style result visualization", () => {
  it("includes the original question title and all four option contents for every row", () => {
    const svg = buildDiscResultSvg(Array(15).fill(1));
    expect(svg).toContain("（朋友）當你和朋友在一起用餐時，在選擇餐廳或吃什麼時，你通常是：");
    expect(svg).toContain("找到要的東西，付錢走人");
    expect(svg).toContain("找熟悉的店購買");
    expect(svg).toContain("（自我認知）當你買衣服時，你是：");
  });

  it("keeps the fourth answer column inside the PNG canvas", () => {
    const svg = buildDiscResultSvg(Array(15).fill(4));
    expect(svg).toContain('width="1320"');
    expect(svg).toContain('x="1251"');
    expect(svg).not.toContain('x="1300"');
  });
});
