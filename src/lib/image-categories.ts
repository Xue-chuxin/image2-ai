export const IMAGE_STYLE_CATEGORIES = ["写真", "商品", "角色", "界面", "建筑", "插画", "国风", "其他"] as const;

export const IMAGE_GALLERY_CATEGORIES = ["全部", ...IMAGE_STYLE_CATEGORIES] as const;

export type ImageStyleCategory = (typeof IMAGE_STYLE_CATEGORIES)[number];

