// pocketbase/pb_hooks/security_validation.pb.js

// Hook to validate invite code on dahoot_user_info creation
onRecordCreateRequest((e) => {
    const role = e.record.get("role");
    if (role === "TEACHER" || role === "ADMIN") {
        // If the creator is already an authenticated admin (e.g. creating via Admin Panel), bypass invite code check
        let isAdmin = false;
        const authRecord = e.auth || (e.requestInfo ? e.requestInfo.auth : null);
        if (authRecord) {
            const infoId = authRecord.get("dahoot_info");
            if (infoId) {
                try {
                    const infoRecord = $app.dao().findRecordById("dahoot_user_info", infoId);
                    if (infoRecord && infoRecord.get("role") === "ADMIN") {
                        isAdmin = true;
                    }
                } catch (err) {}
            }
        }

        if (!isAdmin) {
            const submittedInvite = e.record.get("invite_code");
            let inviteSetting;
            try {
                inviteSetting = $app.dao().findFirstRecordByFilter("dahoot_settings", "key = 'invite_code'");
            } catch (err) {
                throw new Error("Could not retrieve invite code configuration from database.");
            }
            if (!inviteSetting || !submittedInvite || submittedInvite.trim() !== inviteSetting.get("value").trim()) {
                throw new Error("Invalid invite code. Please contact an administrator.");
            }
        }
    }
    
    // Clear invite code before saving so it's not stored in the database
    e.record.set("invite_code", "");
    e.next();
}, "dahoot_user_info");
