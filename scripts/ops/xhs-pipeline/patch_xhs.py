#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""就地补丁 xhs_weekly_send.py：①推送文案要 App 分享链接+自查AI标记 ②加 PAUSE 哨兵开关"""
import pathlib
import shutil
import time

p = pathlib.Path.home() / ".kangaroo/xhs-pipeline/xhs_weekly_send.py"
bak = p.with_suffix(".py.bak-%d" % int(time.time()))
shutil.copy2(p, bak)
s = p.read_text(encoding="utf-8")

# --- 1) 常量区加 PAUSE 哨兵 ---
old1 = 'LOG = BASE / "send.log"\n'
new1 = ('LOG = BASE / "send.log"\n'
        'PAUSE = BASE / "PAUSE"   # 该文件存在即跳过本周发送（账号封禁/停更期用），内容写原因与解封日\n')
assert s.count(old1) == 1, "LOG const hit=%d" % s.count(old1)
s = s.replace(old1, new1)

# --- 2) main() 入口加暂停检查 ---
old2 = ('    dry = "--dry-run" in sys.argv\n'
        '    SENT.mkdir(parents=True, exist_ok=True)\n')
new2 = ('    dry = "--dry-run" in sys.argv\n'
        '    if PAUSE.exists():\n'
        '        log("PAUSED, skip this run: " + PAUSE.read_text(encoding="utf-8").strip().replace("\\n", " | "))\n'
        '        return 0\n'
        '    SENT.mkdir(parents=True, exist_ok=True)\n')
assert s.count(old2) == 1, "main entry hit=%d" % s.count(old2)
s = s.replace(old2, new2)

# --- 3) 推送文案 ---
old3 = "——复制正文按配图建议发布，发完把链接回群"
new3 = ("——复制正文按配图建议发布。发完回群两件事："
        "①在 App 里点【分享→复制链接】把链接发群（别用创作者后台的链接，访客打不开、核不了）"
        "②看一眼笔记顶部有没有「可能含 AI 生成内容」灰字，有就截图")
assert s.count(old3) == 1, "header hit=%d" % s.count(old3)
s = s.replace(old3, new3)

p.write_text(s, encoding="utf-8")
print("patched ok, backup=%s" % bak)
