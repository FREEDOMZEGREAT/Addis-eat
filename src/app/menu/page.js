import {
  getDishesByCategory,
  categories,
  countByCategory,
  dishes as menuDishes,
} from "@/lib/dishes";
import CategorySidebar from "./CategorySidebar";
import LiveDishSearch from "./SearchBox";
import DishList from "./DishList";
import { SITE_URL, SOCIAL_IMAGE, serializeJsonLd } from "@/lib/site";

const menuSocialImage = menuDishes[0]?.image ?? SOCIAL_IMAGE;

export const revalidate = 3600;

export const metadata = {
  title: "Menu",
  description: "Every dish we serve — mains, sides and drinks.",
  alternates: {
    canonical: "/menu",
  },
  openGraph: {
    title: "Addis Eats Menu",
    description: "Explore Ethiopian dishes, sides, and drinks from Addis Eats.",
    url: "/menu",
    images: [menuSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Addis Eats Menu",
    description: "Explore Ethiopian dishes, sides, and drinks from Addis Eats.",
    images: [menuSocialImage],
  },
};

export default async function MenuPage({ searchParams }) {
  const params = await searchParams;
  const raw = params?.category;
  const category = categories.includes(raw) ? raw : "All";
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const dishes = await getDishesByCategory(category, query);
  const counts = countByCategory();
  const menuJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category === "All" ? "Addis Eats Menu" : `${category} Menu`,
    itemListElement: dishes.map((dish, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/menu/${dish.id}`,
      name: dish.name,
      image: new URL(dish.image, SITE_URL).toString(),
    })),
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(menuJsonLd) }}
      />
      <header>
        <p className="eyebrow">Kitchen</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Our menu
        </h1>
        <p className="mt-2 text-sm text-sand-500">
          {category === "All" ? "Every dish we serve" : category}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <CategorySidebar counts={counts} activeCategory={category} query={query} />

        <div className="min-w-0">
          <LiveDishSearch key={category + ":" + query} initialCategory={category} initialQuery={query} />
          <DishList dishes={dishes} />
        </div>
      </div>
    </div>
  );
}
