// pb_hooks/generate.pb.js

routerAdd("POST", "/api/generate-questions", (e) => {
    // Read and parse request JSON body
    const data = e.requestInfo().body;

    const systemPrompt = data.systemPrompt;
    const userPromptContent = data.userPromptContent;

    if (!systemPrompt || !userPromptContent) {
        return e.json(400, { error: "Missing required fields: systemPrompt or userPromptContent" });
    }

    // Access the environment variable securely on the server
    const apiKey = $os.getenv("OPENROUTER_API_KEY");
    if (!apiKey) {
        return e.json(500, { error: "OPENROUTER_API_KEY is not set on the server. Please check your server environment variables." });
    }

    let res;
    try {
        // Send the HTTP request to OpenRouter securely
        res = $http.send({
            url: "https://openrouter.ai/api/v1/chat/completions",
            method: "POST",
            body: JSON.stringify({
                model: "deepseek/deepseek-v4-pro",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPromptContent }
                ],
                temperature: 0.7,
                thinking: {
                    type: "enabled",
                    budget_tokens: 4096
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
});
