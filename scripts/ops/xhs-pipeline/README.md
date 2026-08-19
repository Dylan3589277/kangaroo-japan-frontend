# 小红书周更管线（M4 本机运维脚本 · 灾备快照）

## 🔴 权威副本不在这里

真正运行的脚本在 **M4 上的 `~/.kangaroo/xhs-pipeline/xhs_weekly_send.py`**，那台机上**没有任何 git 仓**（`~/.kangaroo/` 和 `~/kangaroo-scripts/` 都不是仓）。

本目录是**灾备快照**，存在的唯一理由是「M4 挂了脚本不至于从头重写」（收尾铁律第④勾：代码不推远端 = 困在单机）。

**改动纪律**：在 M4 上改完 → 回灌快照到这里 → commit。**不要改这里的副本然后以为生效了**——它不会自动同步到 M4，两边漂移会造成"改了但没生效"的假象。

回灌命令（在 Windows 仓根跑）：

```bash
ssh macmini "cat ~/.kangaroo/xhs-pipeline/xhs_weekly_send.py" | tr -d '\r' > scripts/ops/xhs-pipeline/xhs_weekly_send.py
```

`tr -d '\r'` 不能省：本仓 `core.autocrlf=true`，带 CRLF 的 python 脚本传回 macOS 会让 shebang 变成 `python3\r` 直接炸（已在 `.gitattributes` 里对本目录锁了 `eol=lf` 双保险）。

## 它干什么

launchd `com.kangaroo.xhs-weekly`，**每周一 09:00 JST** 跑一次：从 `drafts/` 取 2 篇未发草稿，推进企业微信「長月商事」群让客服手工发布，发完把草稿挪进 `sent/`。

| 路径                                                   | 作用                           |
| ------------------------------------------------------ | ------------------------------ |
| `~/.kangaroo/xhs-pipeline/drafts/`                     | 待发草稿                       |
| `~/.kangaroo/xhs-pipeline/sent/`                       | 已发归档                       |
| `~/.kangaroo/xhs-pipeline/send.log`                    | 运行日志（含 PAUSED 跳过记录） |
| `~/Library/LaunchAgents/com.kangaroo.xhs-weekly.plist` | 定时配置                       |

`--dry-run` 只打印不发送、也不标记草稿已发，可以安全试跑。

## ⏸ PAUSE 哨兵（停发开关）

`~/.kangaroo/xhs-pipeline/PAUSE` **文件存在即跳过本次运行**，日志留一行 `PAUSED, skip this run: <文件内容>`。用于账号封禁 / 停更期，避免白白烧掉存稿（推给客服也发不出去）。

```bash
# 停发（内容写原因与预估解封日）
ssh macmini "printf '原因...\n预估解封：...\n' > ~/.kangaroo/xhs-pipeline/PAUSE"
# 恢复发送
ssh macmini "rm ~/.kangaroo/xhs-pipeline/PAUSE"
# 看当前状态
ssh macmini "cat ~/.kangaroo/xhs-pipeline/PAUSE 2>/dev/null || echo '未暂停'"
```

**当前状态：⏸ 暂停中**（小红书账号封禁 1 个月，预估 2026-09-17 解封）。存稿只剩 `15-seller-rating`、`16-offer-culture` 两篇。

## `patch_xhs.py`

2026-08-19 那次改动的补丁脚本，**已在 M4 执行完毕**，保留是为了可追溯与可重放。它做三件事：加 PAUSE 哨兵常量、在 `main()` 入口加暂停检查、把推送文案改成要求客服回传 App 分享链接 + 自查 AI 标记。

写法上两个安全垫，改这个脚本时照抄：① 先 `shutil.copy2` 备份到带时间戳的 `.bak-<ts>` ② 每处替换前 `assert s.count(old) == 1`，锚点命中数不对就中止且不写盘。
