@app.post("/api/first_shot")
def first_shot(payload: TaskEnvelope):
    req = _unwrap(payload)
    task_id = req.task_id.strip() if req.task_id else None
    if not task_id:
        raise HTTPException(status_code=422, detail="缺少 task_id")

    user_potrait = (req.user_potrait or "").strip()
    spot_url = (req.spot_url or "").strip()
    task_manager.update_step_data(
        task_id,
        {
            "user_potrait_url": (user_potrait or "").strip() or None,
            "spot_url": (spot_url or "").strip() or None,
        },
    )
    if not user_potrait or not spot_url:
        raise HTTPException(status_code=422, detail="缺少 user_potrait 或 spot_url")

    # 从 step_data 读取 first_shot（第一个镜头的 action 描述）作为 prompt
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或已过期")

    step_data = task.get("step_data", {})
    prompt_text = step_data.get("first_shot", "")

    if not prompt_text:
        raise HTTPException(status_code=422, detail="step_data 中缺少 first_shot，请先调用 /api/script")

    # 调用 first_shot_gen 工具
    from agent_config import get_first_shot_tool
    tool = get_first_shot_tool()
    result = json.loads(
        tool.call({
            "prompt": prompt_text,
            "character_image": user_potrait,
            "landscape_image": spot_url,
        })
    )

    if not result.get("success"):
        return {"success": False, "error": result.get("error", "首帧图片生成失败")}

    cover_url = result.get("image_url", "")

    # 存入 step_data
    task_manager.update_step_data(task_id, {"cover_url": cover_url})

    return {"success": True, "cover_url": cover_url}


@app.post("/api/share")
def share(payload: TaskEnvelope):
    req = _unwrap(payload)
    task_id = req.task_id.strip() if req.task_id else None
    if not task_id:
        raise HTTPException(status_code=422, detail="缺少 task_id")

    user_text = (req.request or "").strip()
    if not user_text:
        user_text = "请生成一段适合小红书或朋友圈发布的旅行文案。"

    task_manager.append_message(task_id, {"role": "user", "content": user_text})
    task = task_manager.get_task(task_id)

    assistant_text = _run_chat_once(task.get("messages", []))
    task_manager.append_message(task_id, {"role": "assistant", "content": assistant_text})

    return {"success": True, "response": assistant_text}


@app.post("/api/video/extend")
def extend_video(payload: TaskEnvelope):
    req = _unwrap(payload)
    task_id = req.video_id.strip() if req.video_id else None
    if not task_id:
        raise HTTPException(status_code=422, detail="缺少 video_id")

    prompt = (req.video_request or "").strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="缺少 video_request")
    count = req.count
    third_party_token = os.getenv("THIRD_PARTY_TOKEN")
    if not third_party_token:
        raise HTTPException(status_code=500, detail="服务器未配置 THIRD_PARTY_TOKEN 环境变量")

    submit_payload = {
        "model": getattr(my_cfg, "model", "grok-video-3"),
        "prompt": prompt,
        "task_id": task_id,
        "start_time": 10*count,
        "duration": "10",
        "upscale": False,
    }
    try:
        url = my_cfg.extend_url()
    except Exception:
        url = f"{getattr(my_cfg, 'base_url', '').rstrip('/')}/v1/video/extend"

    headers = my_cfg.headers(third_party_token)
    data = json.dumps(submit_payload).encode("utf-8")

    req_obj = urlrequest.Request(url=url, data=data, headers=headers, method="POST")

    try:
        with urlrequest.urlopen(req_obj, timeout=500) as resp:
            resp_data = resp.read().decode("utf-8")
            third_party_resp = json.loads(resp_data)
            print(third_party_resp)
    except Exception as e:
        print("请求失败：", e)
        raise HTTPException(status_code=502, detail=f"第三方平台扩展任务失败: {e}")

    if not third_party_resp.get("id"):
        raise HTTPException(status_code=502, detail=f"第三方平台扩展任务失败: {third_party_resp.get('message', 'unknown')}")

    task_status = third_party_resp.get("status", "queued")
    video_status = map_third_party_status(task_status)
    third_party_task_id = third_party_resp.get("id")

    return {
        "success": video_status != "failed",
        "video_status": video_status,
        "task_id": third_party_task_id,
    }


@app.post("/api/video")
def submit_video(payload: TaskEnvelope):
    req = _unwrap(payload)
    task_id = req.task_id.strip() if req.task_id else None
    if not task_id:
        raise HTTPException(status_code=422, detail="缺少 task_id")
        
    stored_task = task_manager.get_task(task_id) or {}
    step_data = stored_task.get("step_data", {})

    # 取三个字段
    user_potrait_url = step_data.get("user_potrait_url")
    spot_url = step_data.get("spot_url")
    script = step_data.get("script")
    cover_url = step_data.get("cover_url")

    if not user_potrait_url or not spot_url:
        raise HTTPException(status_code=422, detail="缺少 user_potrait 或 spot_url")

    image_urls = [cover_url, spot_url, user_potrait_url] if cover_url else [spot_url, user_potrait_url]

    base_prompt = (req.video_request or script or "").strip()
    if base_prompt:
        prompt = f"{base_prompt}。{_VIDEO_STABILITY_PROMPT}"
    else:
        prompt = ""

    submit_payload = build_submit_payload(
        image_urls=image_urls,
        prompt=prompt,
        cfg=my_cfg,
    )

    third_party_token = os.getenv("THIRD_PARTY_TOKEN")
    if not third_party_token:
        raise RuntimeError("THIRD_PARTY_TOKEN environment variable is not set")

    headers = my_cfg.headers(third_party_token)
    data = json.dumps(submit_payload).encode("utf-8")

    req_obj = urlrequest.Request(
        url=my_cfg.submit_url(),
        data=data,
        headers=headers,
        method="POST",
    )

    try:
        with urlrequest.urlopen(req_obj, timeout=500) as resp:
            resp_data = resp.read().decode("utf-8")
            third_party_resp = json.loads(resp_data)
            print(third_party_resp)
    except Exception as e:
        print("请求失败：", e)
        raise HTTPException(status_code=502, detail=f"第三方平台创建任务失败: {e}")

    if not third_party_resp.get("id"):
        raise HTTPException(status_code=502, detail=f"第三方平台创建任务失败: {third_party_resp.get('message', 'unknown')}")

    task_status = third_party_resp.get("status", "queued")
    video_status = map_third_party_status(task_status)
    third_party_task_id = third_party_resp.get("id")
    task_manager.delete_task(task_id)
    print(f"提交视频任务成功 task_id={third_party_task_id}, video_status={video_status}")

    return {
        "success": video_status != "failed",
        "video_status": video_status,
        "task_id": third_party_task_id,
    }