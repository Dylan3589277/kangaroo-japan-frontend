// 糖果橙皮（新版小程序 webview 用 ?theme=candy 拼进 URL 换肤，老小程序不带参数=零变化）。
// 抽成共享常量，供 support/h5、support/auction/* 等页面复用，避免各页各复制一份。
// 页面本身固定用 Tailwind 默认 orange-* 调色板 + 页面底 #f5f7fb；这里用
// [data-theme="candy"] 祖先选择器覆盖这些 utility class 编译出的固定颜色，
// 不改任何组件结构/逻辑，老皮（无 data-theme 属性）零变化。
// 色值：主色 #EF8632 / 深 #D96E1E / 浅底 #FFF0E0 / 页面底 #FFFBF5 / 文字墨色 #4A3426。
export const CANDY_THEME_CSS = `
[data-theme="candy"] [class~="bg-[#f5f7fb]"] { background-color: #FFFBF5 !important; }
[data-theme="candy"] .bg-orange-500 { background-color: #EF8632 !important; }
[data-theme="candy"] .bg-orange-500:disabled,
[data-theme="candy"] .disabled\\:bg-orange-200:disabled { background-color: #F6CBA0 !important; }
[data-theme="candy"] .bg-orange-50,
[data-theme="candy"] .bg-orange-100 { background-color: #FFF0E0 !important; }
[data-theme="candy"] .border-orange-100,
[data-theme="candy"] .border-orange-200 { border-color: #F7CDA0 !important; }
[data-theme="candy"] .text-orange-400,
[data-theme="candy"] .text-orange-500,
[data-theme="candy"] .text-orange-600,
[data-theme="candy"] .text-orange-700 { color: #D96E1E !important; }
[data-theme="candy"] .accent-orange-500 { accent-color: #EF8632 !important; }
[data-theme="candy"] .focus\\:border-orange-400:focus { border-color: #EF8632 !important; }
[data-theme="candy"] .text-slate-900 { color: #4A3426 !important; }
`;
