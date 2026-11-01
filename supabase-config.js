// 云端图库配置（Supabase）
//
// 1. 打开 https://supabase.com 注册并新建一个项目（免费）
// 2. 左侧 Project Settings → API，复制 Project URL 和 anon public 两个值
// 3. 填到下面两行引号里，保存，刷新页面即可
// 4. 第一次用之前，先把 supabase-setup.sql 里的内容粘到 Supabase 的 SQL Editor 执行一次
//
// 留空的话，页面照旧用本机图库（photo-library 文件夹）或浏览器存储。

window.STAR_ISLE_SUPABASE = {
  url: "",      // 形如 https://xxxxxxxxxxxx.supabase.co
  anonKey: "",  // 很长的一串，以 eyJ 开头
  bucket: "album"
};
