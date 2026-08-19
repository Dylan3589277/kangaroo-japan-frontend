#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书内容管线：每周一 09:00 JST（launchd 触发）从 drafts/ 取字典序最小的 2 篇草稿，
发到企业微信「株式会社長月商事」群（群机器人 webhook），发完挪到 sent/。
库存 < 2 篇时在群里提醒补货（告警带恢复：喊中枢补货即可）。

用法：
  python3 xhs_weekly_send.py            # 真发
  python3 xhs_weekly_send.py --dry-run  # 只打印，不发（部署验证用）

设计约束：
- 中文绝不过 shell 参数（历史坑：UTF-8 被壳层弄坏），全程 python 内构造 JSON 直接 POST。
- 企微 markdown 消息上限 4096 字节，按行拆段 ≤3500 字节分多条发。
- 失败要大声：webhook 回执 errcode != 0 时重试 1 次，仍失败则向「通知群」发告警（带恢复步骤）并以非 0 退出。
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

BASE = Path.home() / ".kangaroo" / "xhs-pipeline"
DRAFTS = BASE / "drafts"
SENT = BASE / "sent"
LOG = BASE / "send.log"
PAUSE = BASE / "PAUSE"   # 该文件存在即跳过本周发送（账号封禁/停更期用），内容写原因与解封日
WEBHOOKS = Path.home() / ".kangaroo" / "wecom-webhooks.json"
TARGET_GROUP = "株式会社長月商事"
ALERT_GROUP = "通知群"
PER_RUN = 2          # 每周发 2 篇（花哥 2026-07-04 拍板：每周 1-2 篇）
CHUNK_BYTES = 3500   # 企微 markdown 上限 4096 字节，留余量


def log(msg: str) -> None:
    line = time.strftime("%Y-%m-%d %H:%M:%S") + " " + msg
    print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_webhook(name: str) -> str:
    with open(WEBHOOKS, encoding="utf-8") as f:
        hooks = json.load(f)
    url = hooks.get(name)
    if not url:
        raise KeyError(f"webhook group not found: {name}")
    return url


def post_markdown(url: str, content: str, dry: bool) -> bool:
    payload = json.dumps(
        {"msgtype": "markdown", "markdown": {"content": content}},
        ensure_ascii=False,
    ).encode("utf-8")
    if dry:
        log(f"[dry-run] would send {len(payload)} bytes: {content[:60]!r}...")
        return True
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.load(resp)
    ok = body.get("errcode") == 0
    log(("sent ok" if ok else f"send FAILED: {body}") + f" ({len(payload)} bytes)")
    return ok


def chunk_by_lines(text: str, limit: int) -> list:
    chunks, cur, cur_len = [], [], 0
    for line in text.splitlines(keepends=True):
        n = len(line.encode("utf-8"))
        if cur and cur_len + n > limit:
            chunks.append("".join(cur))
            cur, cur_len = [], 0
        cur.append(line)
        cur_len += n
    if cur:
        chunks.append("".join(cur))
    return chunks


def send_with_retry(url: str, content: str, dry: bool) -> bool:
    for attempt in (1, 2):
        try:
            if post_markdown(url, content, dry):
                return True
        except Exception as e:  # noqa: BLE001 - 失败要大声，统一走告警
            log(f"send attempt {attempt} error: {e}")
        time.sleep(3)
    return False


def main() -> int:
    dry = "--dry-run" in sys.argv
    if PAUSE.exists():
        log("PAUSED, skip this run: " + PAUSE.read_text(encoding="utf-8").strip().replace("\n", " | "))
        return 0
    SENT.mkdir(parents=True, exist_ok=True)
    url = load_webhook(TARGET_GROUP)

    drafts = sorted(DRAFTS.glob("*.md"))
    if not drafts:
        send_with_retry(
            url,
            "📭 小红书草稿库已空，本周没有可发的笔记。\n**恢复**：请花哥/客服在群里喊中枢补一批草稿。",
            dry,
        )
        return 0

    batch = drafts[:PER_RUN]
    failed = False
    for i, path in enumerate(batch, 1):
        text = path.read_text(encoding="utf-8")
        header = f"📕 本周小红书笔记草稿 {i}/{len(batch)}（{path.stem}）——复制正文按配图建议发布。发完回群两件事：①在 App 里点【分享→复制链接】把链接发群（别用创作者后台的链接，访客打不开、核不了）②看一眼笔记顶部有没有「可能含 AI 生成内容」灰字，有就截图\n\n"
        parts = chunk_by_lines(header + text, CHUNK_BYTES)
        ok = all(send_with_retry(url, p, dry) for p in parts)
        if ok:
            if not dry:
                path.rename(SENT / path.name)
            log(f"draft done: {path.name}")
        else:
            failed = True
            log(f"draft FAILED, kept in drafts: {path.name}")
        time.sleep(2)

    remaining = len(list(DRAFTS.glob("*.md")))
    if remaining < PER_RUN:
        send_with_retry(
            url,
            f"📦 小红书草稿库仅剩 {remaining} 篇。\n**恢复**：请花哥在群里喊中枢补一批草稿（按当时活动口径写）。",
            dry,
        )

    if failed:
        try:
            alert = load_webhook(ALERT_GROUP)
            send_with_retry(
                alert,
                "🔴 小红书周报草稿发送失败（株式会社長月商事群）。\n**恢复**：ssh macmini 手跑 `python3 ~/.kangaroo/xhs-pipeline/xhs_weekly_send.py`，或查 ~/.kangaroo/xhs-pipeline/send.log",
                dry,
            )
        except Exception as e:  # noqa: BLE001
            log(f"alert send error: {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
