// pocketbase/pb_hooks/dahoot_generate.pb.js

routerAdd("POST", "/api/dahoot/generate-questions", (e) => {
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

    const tjGenUrl = $os.getenv("TJ_GEN_URL") || "https://gen.teacherjake.com";

    // Extract optional custom OpenRouter key header if provided
    const headers = {
        "Content-Type": "application/json"
    };
    const reqHeaders = e.requestInfo().headers || {};
    const customKey = reqHeaders["x-openrouter-api-key"] || reqHeaders["X-OpenRouter-API-Key"];
    if (customKey) {
        headers["X-OpenRouter-API-Key"] = Array.isArray(customKey) ? customKey[0] : customKey;
    }

    const userEmail = authRecord.email ? authRecord.email() : (authRecord.get("email") || "");

    let res;
    try {
        // Delegate AI generation to the tj-gen Express microservice
        res = $http.send({
            url: tjGenUrl + "/api/dahoot/generate-questions",
            method: "POST",
            body: JSON.stringify({
                systemPrompt,
                userPromptContent,
                userId: authRecord.id,
                userEmail,
                model: data.model
            }),
            headers: headers,
            timeout: 120
        });
    } catch (httpErr) {
        return e.json(500, { error: "Failed to connect to tj-gen service (" + tjGenUrl + "): " + String(httpErr) });
    }

    if (res.statusCode !== 200) {
        const errMsg = (res.json && res.json.error)
            ? res.json.error
            : (res.raw || "Unknown error from generation service");
        return e.json(res.statusCode, { error: "tj-gen returned error: " + errMsg });
    }

    return e.json(200, res.json);
}, $apis.requireAuth());
