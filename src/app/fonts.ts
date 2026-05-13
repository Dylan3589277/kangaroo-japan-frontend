const FONT_STACKS = {
  latin: "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif",
  sc: "'Noto_Sans_SC','PingFang_SC','Microsoft_YaHei',system-ui,sans-serif",
  jp: "'Noto_Sans_JP','Hiragino_Kaku_Gothic_ProN','Yu_Gothic',Meiryo,system-ui,sans-serif",
  global: "'Noto_Sans',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif",
} as const;

const fontVariable = (name: string, stack: string) => ({ variable: `[${name}:${stack}]` });

export const inter = fontVariable("--font-inter", FONT_STACKS.latin);
export const notoSansSC = fontVariable("--font-noto-sans-sc", FONT_STACKS.sc);
export const notoSansJP = fontVariable("--font-noto-sans-jp", FONT_STACKS.jp);
export const notoSans = fontVariable("--font-noto-sans", FONT_STACKS.global);
