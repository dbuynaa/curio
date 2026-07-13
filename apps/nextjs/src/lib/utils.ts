export const slugify = (str: string) => {
  return str
    .trim()
    .toLowerCase()
    .replace(/(?:_art|_draws|_music)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};
