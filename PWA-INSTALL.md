# 📱 iPhone 离线安装指南

这个版本的 Chrome 小恐龙游戏支持 PWA（Progressive Web App），可以在 iPhone 上离线运行。

## 📋 安装前准备

### 1. 生成应用图标
1. 在浏览器中打开 `icons/generate-icons.html`
2. 点击"下载 192x192 图标"和"下载 512x512 图标"按钮
3. 将下载的图标保存到 `icons/` 目录，命名为：
   - `icon-192.png`
   - `icon-512.png`

### 2. 部署到网络服务器
PWA 需要通过 HTTPS 访问（或者本地 localhost）。你可以：
- 将文件部署到 GitHub Pages
- 使用 Netlify/Vercel 等免费托管服务
- 或者在本地运行 HTTPS 服务器进行测试

## 📲 在 iPhone 上安装

### 方式 1：从网页安装（推荐）

1. **访问游戏网站**
   - 在 iPhone 的 Safari 浏览器中打开游戏网址
   - 例如：`https://your-username.github.io/HelloClaude`

2. **添加到主屏幕**
   - 点击 Safari 底部的"分享"按钮 📤
   - 在弹出菜单中向下滚动，找到"添加到主屏幕"
   - 点击"添加到主屏幕"

3. **自定义名称（可选）**
   - 系统会显示应用名称和图标
   - 可以修改名称，然后点击"添加"

4. **启动应用**
   - 返回主屏幕，你会看到 Dino Game 的图标
   - 点击图标即可启动游戏
   - **完全离线运行，无需网络连接！**

### 方式 2：使用二维码安装

如果你已经部署到网上：
1. 生成网站的二维码
2. 用 iPhone 相机扫描二维码
3. 在 Safari 中打开链接
4. 按照方式 1 的步骤添加到主屏幕

## ✨ PWA 特性

安装后，游戏将拥有以下特性：

- ✅ **离线运行** - 无需网络连接即可游戏
- ✅ **全屏体验** - 自动全屏，无浏览器 UI
- ✅ **独立图标** - 像原生应用一样出现在主屏幕
- ✅ **快速启动** - 直接从主屏幕启动
- ✅ **自动更新** - 联网时自动检查更新

## 🔧 本地测试（开发者）

如果要在本地测试 PWA 功能：

```bash
# 启动 HTTPS 服务器（需要安装 http-server）
npx http-server -S -C localhost.pem -K localhost-key.pem

# 或使用 Python（仅支持 HTTP，某些 PWA 功能可能无法使用）
python3 -m http.server 8000
```

然后在 iPhone 上访问：
```
https://你的电脑IP:8000
```

**注意**：Service Worker 只能在 HTTPS 或 localhost 环境下工作。

## 📦 部署到 GitHub Pages

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add PWA support"
   git push origin main
   ```

2. **启用 GitHub Pages**
   - 打开 GitHub 仓库页面
   - 进入 Settings > Pages
   - Source 选择 "main" 分支
   - 点击 Save

3. **访问网站**
   - 等待几分钟后，访问：
   - `https://your-username.github.io/HelloClaude`

4. **在 iPhone 上安装**
   - 按照上面的"方式 1"步骤操作

## 🎮 使用技巧

- **横屏游戏** - 推荐横屏模式以获得最佳体验
- **全屏模式** - 从主屏幕启动会自动全屏
- **离线玩耍** - 首次加载后可完全离线游戏
- **自动更新** - 下次联网时会自动更新到最新版本

## 🐛 常见问题

**Q: 图标没有显示？**
A: 确保已生成图标并保存到 `icons/` 目录。

**Q: Service Worker 没有注册？**
A: 确保使用 HTTPS 访问，或者通过 localhost 访问。

**Q: 离线时无法使用？**
A: 首次访问时必须联网，之后才能离线使用。

**Q: 如何更新游戏？**
A: 联网时打开应用，Service Worker 会自动检查并下载更新。

## 📝 更新日志

- **v1.0** - 初始 PWA 版本
  - 支持离线运行
  - iPhone 15 Plus 优化
  - 横屏全屏体验
