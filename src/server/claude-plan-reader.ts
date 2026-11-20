import Anthropic from "@anthropic-ai/sdk";
import type { PlanReader } from "./plans";

/*
 * The real Plan reader: Claude's vision model reads the pages and answers in the READER_SCHEMA structure
 * (structured output). Needs ANTHROPIC_API_KEY; ZA5_PLAN_MODEL picks the model.
 */

const MODEL = process.env.ZA5_PLAN_MODEL || "claude-opus-5-5";

const instructions = (pages: number, lang: "en" | "hr") => `You are reading the floor plan of a home for a household chores app. There ${pages === 1 ? "is 1 image" : `are ${pages} images`}; each image is one floor. Return exactly ${pages} floor${pages === 1 ? "" : "s"}, in the same order as the images.

For each floor, find every room and outdoor space (terrace, balcony, loggia):
- outline: the room's corners in centimetres, in order around the room, x to the right and y downwards from the top-left of the drawing. Follow the inside of the walls. Rooms that share a wall should share that edge. An L-shaped room has 6 corners.
- Get real sizes from the dimensions written on the plan (metres or centimetres) or a scale bar. Without either, assume an interior door is about 80 cm wide.
- name: as written on the plan, otherwise a plain name${lang === "hr" ? " in Croatian (Kupaonica, Spavaća soba, Dnevni boravak + kuhinja, Hodnik, Terasa)" : " in English (Bathroom, Bedroom, Living room + kitchen, Hall, Terrace)"}. Keep different rooms' names different, such as "Bedroom" and "Children's room".
- type: the closest of the allowed types. An open-plan living room with a kitchen is "living"; a separate WC is "toilet"; a corridor or entrance is "hall".
- fixtures: only what the plan shows (shower, bathtub, toilet, sink, kitchen hob or oven, fridge, dishwasher, washing machine), each at its centre point in the same centimetres.
- openings: doors and windows, each with its centre point and width in centimetres.
If an image is not a floor plan of a home, set isFloorPlan to false and leave its lists empty. Don't invent rooms you can't see.`;

export function claudePlanReader(client = new Anthropic()): PlanReader {
  return async ({ pages, lang, schema }) => {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            ...pages.flatMap((p, i) => [
              { type: "text" as const, text: `Image ${i + 1}:` },
              { type: "image" as const, source: { type: "base64" as const, media_type: p.mediaType, data: p.data.toString("base64") } },
            ]),
            { type: "text" as const, text: instructions(pages.length, lang) },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema: schema as unknown as Record<string, unknown> } },
    });
    if (message.stop_reason === "max_tokens") throw new Error("The plan reading was cut off.");
    if (message.stop_reason === "refusal") throw new Error("Claude declined to read this plan.");
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return JSON.parse(text);
  };
}
