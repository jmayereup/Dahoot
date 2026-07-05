// pocketbase/pb_hooks/security_validation.pb.js

// Hook to validate invite code on dahoot_user_info creation
onRecordCreateRequest((e) => {
    const role = e.record.get("role");
    if (role === "TEACHER" || role === "ADMIN") {
        // If the creator is already an authenticated superuser (e.g. creating via Admin Panel), bypass invite code check
        const isSuperuser = e.auth && e.auth.isSuperuser();

        if (!isSuperuser) {
            const submittedInvite = e.record.get("invite_code") || "";
            let expectedInvite = "DAHOOT123";
            try {
                const inviteSetting = $app.findFirstRecordByFilter("dahoot_settings", "key = 'invite_code'");
                if (inviteSetting && inviteSetting.get("value")) {
                    expectedInvite = inviteSetting.get("value");
                }
            } catch (err) {
                // Fallback to default DAHOOT123 if database query fails or collection is missing
            }
            if (submittedInvite.trim().toUpperCase() !== expectedInvite.trim().toUpperCase()) {
                throw new Error("Invalid invite code. Please contact an administrator.");
            }
        }
    }
    
    // Clear invite code before saving so it's not stored in the database
    e.record.set("invite_code", "");
    return e.next();
}, "dahoot_user_info");
