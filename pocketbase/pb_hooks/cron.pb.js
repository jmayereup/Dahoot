// pb_hooks/cron.pb.js

cronAdd("cleanup_old_rooms", "*/10 * * * *", () => {
    // Rooms are considered stale/abandoned if they haven't been updated in 24 hours.
    // The date threshold must be formatted for SQLite/PocketBase query (YYYY-MM-DD HH:MM:SS.SSSZ).
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().replace("T", " ");

    try {
        // Query rooms that haven't been updated since the cutoff date
        const rooms = $app.dao().findRecordsByFilter(
            "dahoot_rooms",
            "updated <= {:cutoff}",
            "",
            0,
            0,
            { cutoff: cutoffStr }
        );

        if (rooms.length > 0) {
            // Delete each stale room.
            // Since dahoot_players has cascadeDelete: true on room_id,
            // deleting a room automatically deletes all associated players.
            rooms.forEach((room) => {
                $app.dao().deleteRecord(room);
            });
            console.log(`[Dahoot Cron] Successfully cleaned up ${rooms.length} stale room(s) and their players.`);
        }
    } catch (err) {
        console.error(`[Dahoot Cron] Error during stale rooms cleanup: ${err}`);
    }
});
