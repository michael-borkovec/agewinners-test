// types.ts

// Formát, jak chodí posty z DB
export type DbPost = {
  id: number;
  author: string;
  subtitle: string | null;
  time_label: string | null;
  text: string;
  image_url: string | null; // kvůli starým datům, nové používají post_images
};

// Obrázky v tabulce post_images
export type DbPostImage = {
  id: number;
  post_id: number;
  image_url: string;
  created_at?: string; // v DB je timestamptz, tady jako string
};

// Co používáme v UI pro jednu fotku
export type UiPostImage = {
  id: number;
  url: string;
};

// Co používáme v UI pro post (feed, PostCard)
export type UiPost = {
  id: number;
  author: string;
  subtitle?: string | null;
  time: string | null;
  text: string;
  images: UiPostImage[];
};
