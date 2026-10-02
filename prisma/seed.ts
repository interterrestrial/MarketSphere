// Seeds the launch product categories for home textiles and furnishings
// (PRD §3.2). Safe to re-run: existing slugs are left untouched.
//
//   npm run db:seed
import "dotenv/config";
import { db } from "../src/lib/db";

/** Parent category with the PRD's initial catalogue below it. */
const root = { name: "Home Textiles & Furnishings", slug: "home-textiles-furnishings" };

const children = [
  { name: "Bedsheets & Bedding Sets", slug: "bedsheets-bedding-sets" },
  { name: "Blankets & Quilts", slug: "blankets-quilts" },
  { name: "Curtains & Window Coverings", slug: "curtains-window-coverings" },
  { name: "Cushion & Pillow Covers", slug: "cushion-pillow-covers" },
  { name: "Towels & Bath Linen", slug: "towels-bath-linen" },
  { name: "Table Linen", slug: "table-linen" },
  { name: "Home Furnishings", slug: "home-furnishings" },
];

async function main(): Promise<void> {
  const parent =
    (await db.category.findUnique({ where: { slug: root.slug } })) ??
    (await db.category.create({ data: root }));

  let created = 0;
  for (const child of children) {
    const existing = await db.category.findUnique({ where: { slug: child.slug } });
    if (existing) continue;
    await db.category.create({ data: { ...child, parentId: parent.id } });
    created += 1;
  }

  const total = await db.category.count();
  console.log(`Categories ready (${total} total, ${created} created this run).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
