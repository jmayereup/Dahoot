// pb_hooks/generate.pb.js

routerAdd("POST", "/api/generate-questions", (e) => {
    // 1. Check if auth record is present
    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Authentication required" });
    }

    // 2. Verify that the user has TEACHER or ADMIN role
    const infoId = authRecord.get("dahoot_info");
    if (!infoId) {
        return e.json(403, { error: "Access denied. User info missing." });
    }
    
    try {
        const infoRecord = $app.findRecordById("dahoot_user_info", infoId);
        if (!infoRecord) {
            return e.json(403, { error: "Access denied. User info not found." });
        }
        const role = infoRecord.get("role");
        if (role !== "TEACHER" && role !== "ADMIN") {
            return e.json(403, { error: "Access denied. Only teachers or admins can generate questions." });
        }
    } catch (err) {
        return e.json(403, { error: "Access denied. Error verifying role: " + String(err) });
    }

    // Read and parse request JSON body
    const data = e.requestInfo().body;

    const systemPrompt = data.systemPrompt;
    const userPromptContent = data.userPromptContent;

    if (!systemPrompt || !userPromptContent) {
        return e.json(400, { error: "Missing required fields: systemPrompt or userPromptContent" });
    }

    // 3. Validate prompt lengths
    if (systemPrompt.length > 5000 || userPromptContent.length > 10000) {
        return e.json(400, { error: "Request payload too large. Keep prompts under length limits." });
    }

    // Access the environment variable securely on the server
    const apiKey = $os.getenv("OPENROUTER_API_KEY");
    if (!apiKey) {
        return e.json(500, { error: "OPENROUTER_API_KEY is not set on the server. Please check your server environment variables." });
    }

    const apiModel = $os.getenv("OPENROUTER_MODEL") || "deepseek/deepseek-v4-pro";

    let res;
    try {
        // Send the HTTP request to OpenRouter securely
        res = $http.send({
            url: "https://openrouter.ai/api/v1/chat/completions",
            method: "POST",
            body: JSON.stringify({
                model: apiModel,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPromptContent }
                ],
                temperature: 0.7,
                max_tokens: 8192,
                provider: {
                    sort: "price"
                }
            }),
            headers: {
                "Authorization": "Bearer " + apiKey,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://dahoot.app",
                "X-Title": "Dahoot AI Question Generator"
            },
            timeout: 120
        });
    } catch (httpErr) {
        return e.json(500, { error: "HTTP request to OpenRouter failed: " + String(httpErr) });
    }

    if (res.statusCode !== 200) {
        const errMsg = (res.json && res.json.error && res.json.error.message)
            ? res.json.error.message
            : (res.raw || "Unknown error");
        return e.json(res.statusCode, { error: "OpenRouter API returned error: " + errMsg });
    }

    return e.json(200, res.json);
}, $apis.requireAuth());
