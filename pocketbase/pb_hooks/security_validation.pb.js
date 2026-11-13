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

// Hook to prevent non-admins from escalating their own role on dahoot_user_info update
onRecordUpdateRequest((e) => {
    const isSuperuser = e.auth && e.auth.isSuperuser();
    if (!isSuperuser) {
        let isAdmin = false;
        const authInfoId = e.auth ? e.auth.get("dahoot_info") : "";
        if (authInfoId) {
            try {
                const authInfo = $app.findRecordById("dahoot_user_info", authInfoId);
                isAdmin = authInfo && authInfo.get("role") === "ADMIN";
            } catch (err) {
                isAdmin = false;
            }
        }

        if (!isAdmin) {
            const originalRole = e.record.original().get("role");
            const nextRole = e.record.get("role");
            if (originalRole !== nextRole) {
                throw new Error("Only administrators can change user roles.");
            }
        }
    }

    e.record.set("invite_code", "");
    return e.next();
}, "dahoot_user_info");
